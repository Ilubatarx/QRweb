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
      const types=[
        {label:'Enlace',sample:'https://turestaurante.com/carta',example:false},
        {label:'Wifi',sample:'WIFI:T:WPA;S:Wifi de invitados;P:Ejemplo123;;',example:true},
        {label:'Reseñas',sample:'https://g.page/r/tu-negocio/review',example:true},
        {label:'Instagram',sample:'https://instagram.com/tu-perfil',example:true},
      ];
      for(const type of types){
        await page.getByRole('button',{name:type.label,exact:true}).click();
        assert.equal(await page.locator('.preview-example-notice').count(),type.example?1:0);
        assert.equal(await page.getByRole('button',{name:'Descargar 3MF',exact:true}).isDisabled(),type.example);
        for(let i=0;i<3;i++){
          const option=page.locator('.object-option').nth(i);
          const changed=!(await option.getAttribute('class')).includes('selected');
          const before=await page.locator('.three-host canvas').evaluate(canvas=>canvas.toDataURL());
          await option.click();
          if(changed)await page.waitForFunction(before=>document.querySelector('.three-host canvas').toDataURL()!==before,before);
          assert.match(await page.locator('.view-tabs button.active').innerText(),/Vista 3D/);
          const pixels=await page.evaluate(async()=>{
            const image=new Image();image.src=document.querySelector('.three-host canvas').toDataURL();await image.decode();
            const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
            const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            let solid=0,green=0;
            for(let k=0;k<rgba.length;k+=4)if(rgba[k+3]>200){solid++;if(rgba[k+1]>rgba[k]*1.1&&rgba[k+1]>rgba[k+2]*1.05&&rgba[k+1]<200)green++;}
            return {solid,green};
          });
          assert.ok(pixels.solid>2000,`${type.label}/${i}: an opaque 3D object must be visible`);
          assert.ok(pixels.green>100,`${type.label}/${i}: colored QR relief must be visible`);
          assert.equal(await page.locator('.empty-preview:visible').count(),0);
          const decoded=await page.evaluate(async()=>{
            const image=document.querySelector('.preview-qr-card img');await image.decode();
            const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1024,1024);
            return window.jsQR(ctx.getImageData(0,0,1024,1024).data,1024,1024)?.data;
          });
          assert.equal(decoded,type.sample,`${type.label}/${i}: the QR beside the model must scan`);checks++;
        }
        await page.getByRole('button',{name:'Solo QR',exact:true}).click();
      }
      console.log(`PASS: ${mount}: las 12 combinaciones de contenido y objeto muestran un modelo 3D con relieve y un QR legible.`);
      await page.getByRole('button',{name:'Reseñas',exact:true}).click();
      await page.locator('#url').fill('https://g.page/r/mi-negocio/review');
      await page.getByRole('button',{name:'Instagram',exact:true}).click();
      await page.locator('#url').fill('https://instagram.com/mi-negocio');
      await page.getByRole('button',{name:'Wifi',exact:true}).click();
      await page.locator('#ssid').fill('Mi wifi real');await page.locator('#password').fill('MiClaveDePrueba');await page.locator('#security').selectOption('WEP');
      await page.getByRole('button',{name:'Reseñas',exact:true}).click();
      assert.equal(await page.locator('#url').inputValue(),'https://g.page/r/mi-negocio/review');
      assert.equal(await page.locator('.preview-example-notice').count(),0);
      assert.equal(await page.getByRole('button',{name:'Descargar 3MF',exact:true}).isDisabled(),false);
      await page.getByRole('button',{name:'Instagram',exact:true}).click();
      assert.equal(await page.locator('#url').inputValue(),'https://instagram.com/mi-negocio');
      await page.getByRole('button',{name:'Wifi',exact:true}).click();
      assert.equal(await page.locator('#ssid').inputValue(),'Mi wifi real');assert.equal(await page.locator('#password').inputValue(),'MiClaveDePrueba');assert.equal(await page.locator('#security').inputValue(),'WEP');
      await page.getByRole('button',{name:'Enlace',exact:true}).click();
      assert.equal(await page.locator('#url').inputValue(),'https://turestaurante.com/carta');
      await page.locator('#url').fill('');
      assert.equal(await page.locator('.preview-example-notice').count(),1);
      assert.ok(await page.getByRole('button',{name:'Descargar 3MF',exact:true}).isDisabled());checks++;
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
