import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.QRFORMA_PACKAGE_DIR||path.join(root,'..'));
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{
  cwd:root,stdio:'inherit',env:{...process.env,VITE_BASE_PATH:'./'},
});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);

async function collect(directory,prefix=''){
  const entries={};
  for(const item of await fs.readdir(directory,{withFileTypes:true})){
    if(item.isSymbolicLink())throw new Error(`No se empaquetan enlaces simbólicos: ${prefix}${item.name}`);
    const relative=prefix+item.name;
    if(item.isDirectory())Object.assign(entries,await collect(path.join(directory,item.name),relative+'/'));
    else if(item.isFile())entries[relative]=new Uint8Array(await fs.readFile(path.join(directory,item.name)));
  }
  return entries;
}
const website=await collect(path.join(root,'dist'));
website['LEEME-INSTALACION.txt']=strToU8(await fs.readFile(path.join(root,'docs/INSTALAR-IHOST.md'),'utf8'));
website['GOOGLE-ADSENSE.txt']=strToU8(await fs.readFile(path.join(root,'docs/ADSENSE-IHOST.md'),'utf8'));
if(!website['index.html']||!Object.keys(website).some(name=>name.startsWith('assets/')))throw new Error('La web compilada está incompleta.');

// Include only project source paths; environment files and credentials stay outside the archive.
const source={};
for(const dir of ['src','public','scripts','tests','docs','.github'])Object.assign(source,await collect(path.join(root,dir),dir+'/'));
for(const name of ['.gitignore','.nvmrc','README.md','index.html','package.json','package-lock.json','vite.config.js','netlify.toml','vercel.json']){
  source[name]=new Uint8Array(await fs.readFile(path.join(root,name)));
}
await fs.mkdir(output,{recursive:true});
const webZip=zipSync(website,{level:9});
await fs.writeFile(path.join(output,'qrforma-ihost.zip'),webZip);
await fs.writeFile(path.join(output,'qrforma-web.zip'),webZip);
await fs.writeFile(path.join(output,'qrforma-codigo.zip'),zipSync(source,{level:9}));
console.log(`Paquete ihost: ${path.join(output,'qrforma-ihost.zip')} (${webZip.length} bytes)`);
console.log(`Código fuente: ${path.join(output,'qrforma-codigo.zip')}`);
