import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const port=Number(process.env.PORT||8099);
const dataDir=process.env.DATA_DIR||join(process.cwd(),'.local-data');
const store=join(dataDir,'projects.json');
const maxBytes=1024*1024;
const reply=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(payload));};
const load=async()=>{try{return JSON.parse(await readFile(store,'utf8'))}catch(e){if(e.code==='ENOENT')return [];throw e}};
const save=async projects=>{await mkdir(dataDir,{recursive:true,mode:0o700});await writeFile(store,JSON.stringify(projects,null,2),{mode:0o600})};
const readBody=async req=>{let body='';for await(const chunk of req){body+=chunk;if(body.length>maxBytes)throw Error('too_large')}return JSON.parse(body||'{}')};
// Development-only API. Refuse network binding beyond loopback and do not trust client-supplied identity.
const host='127.0.0.1';
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/v1/health'&&req.method==='GET')return reply(res,200,{status:'ok',mode:'local-development',productionEffects:false});
 if(url.pathname==='/api/v1/integrations'&&req.method==='GET')return reply(res,200,JSON.parse(await readFile(join(process.cwd(),'public/integrations.json'),'utf8')));
 // No unauthenticated project CRUD. Keycloak OIDC + tenant authorization are prerequisites.
 if(url.pathname.startsWith('/api/v1/workspaces/'))return reply(res,501,{error:'auth_not_configured',message:'Keycloak verification and tenant authorization required before enabling project APIs'});
 return reply(res,404,{error:'not_found'});
 }catch(e){return reply(res,e.message==='too_large'?413:400,{error:'invalid_request'})}});
server.listen(port,host,()=>console.log(`Codestra local API listening on http://${host}:${port}`));
