import { createApp } from './app.js';
const service=await createApp();
const port=Number(process.env.PORT||3000);
const server=service.app.listen(port,'0.0.0.0',()=>console.log(`Komorebi server listening on port ${port}`));
function stop(){server.close(()=>{service.close();process.exit(0)})}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
