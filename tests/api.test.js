import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { defaultContent } from '../shared/content.js';
const password=()=>randomBytes(24).toString('hex');
async function start(t,options={}){
 const setupKey=randomBytes(32).toString('hex');const service=await createApp({dbPath:':memory:',serveStatic:false,setupKey,...options});
 const server=service.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));service.close()});
 async function request(path,{method='GET',body,cookie,csrf,origin}={}){const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers}}
 return {...service,request,setupKey};
}
async function admin(context){const {request,setupKey}=context;return request('/api/setup/admin',{method:'POST',body:{setupKey,name:'店长',email:'admin@example.test',password:password()}})}
test('registration persists hashed credentials and cannot choose admin role',async t=>{
 const c=await start(t);const pass=password();const result=await c.request('/api/auth/register',{method:'POST',body:{name:'访客',email:'Member@Example.test',password:pass,role:'admin'}});
 assert.equal(result.status,201);assert.equal(result.body.user.role,'user');assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('set-cookie'),/SameSite=Lax/);assert.ok(!JSON.stringify(result.body).includes(pass));
 const row=c.db.prepare('SELECT * FROM users').get();assert.notEqual(row.password_hash,pass);assert.match(row.password_hash,/^[a-f0-9]+:[a-f0-9]+$/);
 const session=c.db.prepare('SELECT token_hash FROM sessions').get();assert.ok(!result.cookie.includes(session.token_hash));
 assert.equal((await c.request('/api/auth/me',{cookie:result.cookie})).body.user.name,'访客');
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:result.cookie,csrf:result.body.csrf,body:{content:defaultContent,revision:1}})).status,403);
 assert.equal((await c.request('/api/auth/register',{method:'POST',body:{name:'访客',email:'member@example.test',password:pass}})).status,409);
});
test('login, wrong password, logout and session invalidation',async t=>{
 const c=await start(t);const pass=password();await c.request('/api/auth/register',{method:'POST',body:{name:'会员',email:'member@example.test',password:pass}});
 assert.equal((await c.request('/api/auth/login',{method:'POST',body:{email:'member@example.test',password:'incorrect'}})).status,401);
 const login=await c.request('/api/auth/login',{method:'POST',body:{email:'member@example.test',password:pass}});assert.equal(login.status,200);
 assert.equal((await c.request('/api/auth/logout',{method:'POST',cookie:login.cookie,body:{}})).status,403);
 assert.equal((await c.request('/api/auth/logout',{method:'POST',cookie:login.cookie,csrf:login.body.csrf,body:{}})).status,200);
 assert.equal((await c.request('/api/auth/me',{cookie:login.cookie})).body.user,null);
});
test('admin setup requires a secret and can happen only once',async t=>{
 const c=await start(t);assert.equal((await c.request('/api/setup/status')).body.required,true);
 const bad=await c.request('/api/setup/admin',{method:'POST',body:{setupKey:'invalid',name:'坏人',email:'bad@example.test',password:password()}});assert.equal(bad.status,403);
 const result=await admin(c);assert.equal(result.status,201);assert.equal(result.body.user.role,'admin');assert.equal((await c.request('/api/setup/status')).body.required,false);
 assert.equal((await admin(c)).status,409);
});
test('server enforces authentication, CSRF, allowed origins and content revisions',async t=>{
 const c=await start(t);const a=await admin(c);const data=structuredClone(defaultContent);data.home.title='欢迎来到新首页';data.menu[0].price=39.5;
 const payload={content:data,revision:1};
 assert.equal((await c.request('/api/content',{method:'PUT',body:payload})).status,401);
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:a.cookie,body:payload})).status,403);
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:a.cookie,csrf:a.body.csrf,origin:'https://evil.example',body:payload})).status,403);
 const saved=await c.request('/api/content',{method:'PUT',cookie:a.cookie,csrf:a.body.csrf,body:payload});assert.equal(saved.status,200);assert.equal(saved.body.revision,2);
 const publicData=await c.request('/api/content');assert.equal(publicData.body.content.home.title,'欢迎来到新首页');assert.equal(publicData.body.content.menu[0].price,39.5);
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:a.cookie,csrf:a.body.csrf,body:payload})).status,409);
 assert.equal(c.db.prepare('SELECT COUNT(*) AS count FROM audit').get().count,1);
});
test('invalid registration, content and oversized payload are rejected',async t=>{
 const c=await start(t);assert.equal((await c.request('/api/auth/register',{method:'POST',body:{name:' ',email:'invalid',password:'a'}})).status,400);
 const a=await admin(c);let data=structuredClone(defaultContent);data.menu[0].price=-1;
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:a.cookie,csrf:a.body.csrf,body:{content:data,revision:1}})).status,400);
 data=structuredClone(defaultContent);data.news[0].date='2026-02-30';
 assert.equal((await c.request('/api/content',{method:'PUT',cookie:a.cookie,csrf:a.body.csrf,body:{content:data,revision:1}})).status,400);
 assert.equal((await c.request('/api/auth/register',{method:'POST',body:{name:'x'.repeat(70000)}})).status,413);
});
test('authentication endpoints enforce a shared rate limit',async t=>{
 const c=await start(t,{rateLimit:2});const body={email:'unknown@example.test',password:'wrong'};
 assert.equal((await c.request('/api/auth/login',{method:'POST',body})).status,401);
 assert.equal((await c.request('/api/auth/login',{method:'POST',body})).status,401);
 const result=await c.request('/api/auth/login',{method:'POST',body});assert.equal(result.status,429);assert.ok(result.headers.get('retry-after'));
});
test('users, sessions and published content survive database reopening',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'komorebi-persist-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'site.sqlite');const key=password();const pass=password();
 let c=await createApp({dbPath:path,setupKey:key,serveStatic:false});let server=c.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));let base=`http://127.0.0.1:${server.address().port}`;
 let response=await fetch(`${base}/api/setup/admin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({setupKey:key,name:'持久化管理员',email:'owner@example.test',password:pass})});assert.equal(response.status,201);const cookie=response.headers.get('set-cookie').split(';')[0];const session=await response.json();
 const content=structuredClone(defaultContent);content.home.title='持久化内容';response=await fetch(`${base}/api/content`,{method:'PUT',headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':session.csrf},body:JSON.stringify({content,revision:1})});assert.equal(response.status,200);
 await new Promise(resolve=>server.close(resolve));c.close();
 c=await createApp({dbPath:path,setupKey:key,serveStatic:false});server=c.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
 const saved=await (await fetch(`${base}/api/content`)).json();assert.equal(saved.content.home.title,'持久化内容');assert.equal(saved.revision,2);
 const me=await (await fetch(`${base}/api/auth/me`,{headers:{Cookie:cookie}})).json();assert.equal(me.user.role,'admin');
 response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',password:pass})});assert.equal(response.status,200);
 assert.equal((await (await fetch(`${base}/api/setup/status`)).json()).required,false);
 await new Promise(resolve=>server.close(resolve));c.close();
});
test('production requires HTTPS origin and sets secure cookies',async t=>{
 await assert.rejects(createApp({production:true,origin:'http://example.test',dbPath:':memory:'}),/HTTPS/);
 const c=await start(t,{production:true,origin:'https://cafe.example'});const result=await admin(c);assert.match(result.headers.get('set-cookie'),/Secure/);assert.ok(result.headers.get('strict-transport-security'));
});
