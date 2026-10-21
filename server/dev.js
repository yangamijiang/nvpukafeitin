import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['server/index.js'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port',process.env.VITE_PORT||'5173','--strictPort'],{stdio:'inherit'})];
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code}
for(const child of children)child.on('exit',code=>stop(code??1));
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
