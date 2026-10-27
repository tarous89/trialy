import {fixture} from './fixture.js';
const server=await fixture();
console.log('Visual fixture ready: '+server.base);
process.on('SIGTERM',async()=>{await server.close();process.exit(0);});
