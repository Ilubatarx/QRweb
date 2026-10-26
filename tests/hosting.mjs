import {chromium} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.QRFORMA_PACKAGE_DIR||path.join(root,'..'));
const files=unzipSync(new Uint8Array(await fs.readFile(path.join(output,'qrforma-ihost.zip'))));
assert.ok(files['index.html']&&files['LEEME-INSTALACION.txt']);
const html=strFromU8(files['index.html']);
assert.match(html,/src="\.\/assets\//);
assert.ok(!Object.keys(files).some(name=>name.startsWith('/')||name.split('/').includes('..')));
assert.ok(!Object.keys(files).some(name=>/(^|\/)(\.env|node_modules|\.git)(\/|$)/.test(name)));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain'};
let checks=0;
try{
  for(const mount of ['/','/sitios/qrforma/']){
    const missing=[],errors=[],external=[];
    const server=http.createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost');
      const name=url.pathname.startsWith(mount)?decodeURIComponent(url.pathname.slice(mount.length))||'index.html':null;
      if(!name||!files[name]){missing.push(url.pathname);res.writeHead(404);res.end('Not found');return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'});res.end(files[name]);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${server.address().port}`;
    const page=await browser.newPage({viewport:{width:1360,height:1000},acceptDownloads:true});
    page.setDefaultTimeout(25000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(origin+'/'))external.push(req.url());});
    try{
      await page.goto(origin+mount,{waitUntil:'networkidle'});
      await page.locator('canvas').waitFor();
      await page.addScriptTag({path:path.join(root,'node_modules/jsqr/dist/jsQR.js')});
      await page.locator('#url').fill('https://example.com/qrforma');
      await page.locator('#label').fill('QRFORMA DE PRUEBA');
      await page.getByRole('button',{name:'Paleta #F7E5D5 y #723D2D',exact:true}).click();
      for(let i=0;i<3;i++){
        await page.locator('.object-option').nth(i).click();
        const wait=page.waitForEvent('download');
        await page.getByRole('button',{name:'Descargar 3MF',exact:true}).click();
        const download=await wait;
        assert.equal(await download.failure(),null);
        const content=unzipSync(new Uint8Array(await fs.readFile(await download.path())));
        const model=strFromU8(content['3D/3dmodel.model']);
        assert.match(model,/displaycolor="#F7E5D5FF"/);
        assert.match(model,/displaycolor="#723D2DFF"/);
        assert.equal((model.match(/<component objectid=/g)||[]).length,2);
        assert.ok(JSON.parse(strFromU8(content['Metadata/project_settings.config'])).filament_colour.length===2);
        await page.getByRole('button',{name:'Cerrar anuncio',exact:true}).click();checks++;
      }
      for(const format of ['stl','png','svg']){
        await page.locator('#file-format').selectOption(format);
        const wait=page.waitForEvent('download');
        await page.getByRole('button',{name:`Descargar ${format.toUpperCase()}`,exact:true}).click();
        const download=await wait,bytes=await fs.readFile(await download.path());
        assert.equal(await download.failure(),null);assert.ok(bytes.length>1000);
        if(format==='stl')assert.equal(bytes.length,84+bytes.readUInt32LE(80)*50);
        else{
          const source=`data:${format==='png'?'image/png':'image/svg+xml'};base64,${bytes.toString('base64')}`;
          const decoded=await page.evaluate(async source=>{const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1024,1024);return window.jsQR(ctx.getImageData(0,0,1024,1024).data,1024,1024)?.data;},source);
          assert.equal(decoded,'https://example.com/qrforma');
        }
        await page.getByRole('button',{name:'Cerrar anuncio',exact:true}).click();checks++;
      }
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
      assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      console.log(`PASS: ZIP servido en ${mount}: tres objetos 3MF a dos colores, STL, PNG/SVG decodificables y móvil; sin archivos faltantes, errores JS ni solicitudes externas.`);
    }finally{await page.close();await new Promise(resolve=>server.close(resolve));}
  }
  console.log(`PASS: ${checks} comprobaciones del paquete de hosting.`);
}finally{await browser.close();}
