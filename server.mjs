import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1]};
const port=Number(arg('--port')||8787),host=arg('--host')||'127.0.0.1';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.md':'text/plain'};
const handler=(req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));
if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Permissions-Policy':'xr-spatial-tracking=(self)'});res.end(data)})};
const cert=arg('--cert'),key=arg('--key');
const server=cert&&key?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handler):http.createServer(handler);
server.listen(port,host,()=>console.log(`Tilt Sphere Lab: ${cert?'https':'http'}://${host}:${port}`));
