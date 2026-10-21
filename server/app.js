import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { scrypt as scryptCallback, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defaultContent, validateContent } from '../shared/content.js';
const scrypt=promisify(scryptCallback);
const sha=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>timingSafeEqual(Buffer.from(sha(a)),Buffer.from(sha(b)));
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function createApp(options={}){
 const production=options.production??process.env.NODE_ENV==='production';
 const origin=options.origin??process.env.APP_ORIGIN??'http://localhost:5173';
 if(production&&(!process.env.APP_ORIGIN&&!options.origin||new URL(origin).protocol!=='https:'))throw new Error('Production requires APP_ORIGIN set to the public HTTPS URL.');
 const dbPath=options.dbPath??process.env.DATABASE_PATH??resolve('.local/komorebi.sqlite');
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath);if(dbPath!==':memory:')chmodSync(dbPath,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS content(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,admin_id INTEGER REFERENCES users(id),revision INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);`);
 db.prepare('INSERT OR IGNORE INTO content VALUES(1,?,1,?)').run(JSON.stringify(defaultContent),new Date().toISOString());
 let setupKey=options.setupKey??process.env.ADMIN_SETUP_KEY;
 const keyPath=resolve(dirname(dbPath),'admin-setup-key');
 if(!db.prepare("SELECT id FROM users WHERE role='admin'").get()&&!setupKey){
  setupKey=dbPath!==':memory:'&&existsSync(keyPath)?readFileSync(keyPath,'utf8').trim():randomBytes(32).toString('hex');
  if(dbPath!==':memory:'){writeFileSync(keyPath,setupKey,{mode:0o600});chmodSync(keyPath,0o600)}
 }
 const app=express();app.disable('x-powered-by');
 if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});if(production)res.set('Strict-Transport-Security','max-age=31536000');next()});
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)){
  const requestOrigin=req.get('origin');const fetchSite=req.get('sec-fetch-site');
  const allowed=production?[origin]:[origin,'http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000','http://127.0.0.1:3000'];
  if(requestOrigin&&!allowed.includes(requestOrigin)||fetchSite==='cross-site')return res.status(403).json({error:'请求来源不受信任'});
  if(!req.is('application/json'))return res.status(415).json({error:'请使用 JSON 请求'});
 }next()});
 app.use(express.json({limit:'64kb'}));
 function fail(res,status,message){return res.status(status).json({error:message})}
 function rate(req,res,next){
  const key=`auth:${req.ip}`;const now=Date.now();db.prepare('DELETE FROM rate_limits WHERE reset<?').run(now);
  db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+15*60*1000);
  const limit=options.rateLimit??30;const row=db.prepare('SELECT count,reset FROM rate_limits WHERE key=?').get(key);
  if(row.count>limit){res.set('Retry-After',String(Math.ceil((row.reset-now)/1000)));return fail(res,429,'操作过于频繁，请 15 分钟后再试')}next();
 }
 const publicUser=user=>({id:user.id,name:user.name,email:user.email,role:user.role});
 async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${Buffer.from(await scrypt(password,salt,64)).toString('hex')}`}
 async function verifyPassword(password,hash){const [salt,expected]=hash.split(':');const actual=Buffer.from(await scrypt(password,salt,64));return timingSafeEqual(actual,Buffer.from(expected,'hex'))}
 const dummy=await hashPassword(randomBytes(32).toString('hex'));
 function credentials(body){
  const {name,email,password}=body??{};
  if(typeof name!=='string'||name.trim().length<1||name.trim().length>30)throw Error('昵称需要 1–30 个字符');
  if(typeof email!=='string'||email.length>254||!EMAIL.test(email.trim()))throw Error('请输入有效的邮箱地址');
  if(typeof password!=='string'||password.length<10||password.length>128)throw Error('密码需要 10–128 个字符');
  return {name:name.trim(),email:email.trim().toLowerCase(),password};
 }
 function newSession(res,user){const token=randomBytes(32).toString('hex');const csrf=randomBytes(24).toString('hex');const expires=Date.now()+7*24*60*60*1000;db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(sha(token),user.id,csrf,expires);res.cookie('komorebi_session',token,{httpOnly:true,secure:production,sameSite:'lax',path:'/',maxAge:7*24*60*60*1000});return {user:publicUser(user),csrf}}
 app.use('/api',(req,res,next)=>{const match=(req.get('cookie')||'').match(/(?:^|;\s*)komorebi_session=([a-f0-9]{64})(?:;|$)/);if(match){req.tokenHash=sha(match[1]);const session=db.prepare('SELECT user_id,csrf FROM sessions WHERE token_hash=? AND expires>?').get(req.tokenHash,Date.now());if(session){req.user=db.prepare('SELECT * FROM users WHERE id=?').get(session.user_id);req.csrf=session.csrf}}next()});
 function authenticated(req,res,next){if(!req.user)return fail(res,401,'请先登录');next()}
 function admin(req,res,next){if(!req.user)return fail(res,401,'请先登录');if(req.user.role!=='admin')return fail(res,403,'仅管理员可以编辑内容');next()}
 function csrf(req,res,next){if(!same(req.get('x-csrf-token')||'',req.csrf||randomBytes(16).toString('hex')))return fail(res,403,'会话校验失败，请刷新页面后重试');next()}
 app.get('/api/health',(req,res)=>res.json({ok:true}));
 app.get('/api/setup/status',(req,res)=>res.json({required:!db.prepare("SELECT id FROM users WHERE role='admin'").get()}));
 app.post('/api/setup/admin',rate,async(req,res)=>{
  if(db.prepare("SELECT id FROM users WHERE role='admin'").get())return fail(res,409,'管理员已经设置，请直接登录');
  if(!setupKey||typeof req.body?.setupKey!=='string'||!same(req.body.setupKey,setupKey))return fail(res,403,'管理员初始化密钥不正确');
  let data;try{data=credentials(req.body)}catch(error){return fail(res,400,error.message)}
  const hash=await hashPassword(data.password);
  db.exec('BEGIN IMMEDIATE');
  try{if(db.prepare("SELECT id FROM users WHERE role='admin'").get()){db.exec('ROLLBACK');return fail(res,409,'管理员已经设置，请直接登录')}
   const existing=db.prepare('SELECT id FROM users WHERE email=?').get(data.email);
   let id;if(existing){db.prepare("UPDATE users SET name=?,password_hash=?,role='admin' WHERE id=?").run(data.name,hash,existing.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);id=existing.id}else{id=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run(data.name,data.email,hash).lastInsertRowid}
   db.exec('COMMIT');setupKey=null;if(dbPath!==':memory:'&&existsSync(keyPath))unlinkSync(keyPath);const user=db.prepare('SELECT * FROM users WHERE id=?').get(id);res.status(201).json(newSession(res,user));
  }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error}
 });
 app.post('/api/auth/register',rate,async(req,res)=>{let data;try{data=credentials(req.body)}catch(error){return fail(res,400,error.message)}const hash=await hashPassword(data.password);try{const row=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'user')").run(data.name,data.email,hash);res.status(201).json(newSession(res,db.prepare('SELECT * FROM users WHERE id=?').get(row.lastInsertRowid)))}catch(error){if(error.message.includes('UNIQUE'))return fail(res,409,'该邮箱已注册，请直接登录');throw error}});
 app.post('/api/auth/login',rate,async(req,res)=>{const {email,password}=req.body??{};if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>128)return fail(res,400,'请输入邮箱和密码');const user=db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());const valid=await verifyPassword(password,user?.password_hash??dummy);if(!user||!valid)return fail(res,401,'邮箱或密码不正确');if(req.tokenHash)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.tokenHash);res.json(newSession(res,user))});
 app.get('/api/auth/me',(req,res)=>res.json({user:req.user?publicUser(req.user):null,csrf:req.csrf??null}));
 app.post('/api/auth/logout',authenticated,csrf,(req,res)=>{db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.tokenHash);res.clearCookie('komorebi_session',{path:'/',httpOnly:true,secure:production,sameSite:'lax'});res.json({ok:true})});
 app.get('/api/content',(req,res)=>{const row=db.prepare('SELECT * FROM content WHERE id=1').get();res.json({content:JSON.parse(row.data),revision:row.revision,updatedAt:row.updated_at})});
 app.put('/api/content',admin,csrf,(req,res)=>{let content;try{content=validateContent(req.body?.content)}catch(error){return fail(res,400,error.message)}const revision=req.body.revision;if(!Number.isSafeInteger(revision)||revision<1)return fail(res,400,'缺少内容版本，请刷新后重试');const updatedAt=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('UPDATE content SET data=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?').run(JSON.stringify(content),updatedAt,revision);if(!result.changes){db.exec('ROLLBACK');return fail(res,409,'其他管理员已更新内容。请先重新载入最新版本，再编辑保存。')}db.prepare('INSERT INTO audit(admin_id,revision) VALUES(?,?)').run(req.user.id,revision+1);db.exec('COMMIT');res.json({content,revision:revision+1,updatedAt})}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error}});
 app.use('/api',(req,res)=>fail(res,404,'接口不存在'));
 if(options.serveStatic!==false){app.use(express.static(resolve('dist'),{index:'index.html',setHeaders(res,path){if(path.endsWith('.html'))res.set('Cache-Control','no-cache')}}))}
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);if(error.type==='entity.too.large')return fail(res,413,'提交内容过大');if(error instanceof SyntaxError&&'body'in error)return fail(res,400,'JSON 格式错误');console.error('Request error:',error.code??error.name);fail(res,500,'服务器暂时无法处理请求，请稍后再试')});
 return {app,db,close:()=>db.close()};
}
