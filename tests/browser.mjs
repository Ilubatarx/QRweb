import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const baseURL=process.env.TEST_URL||'http://127.0.0.1:5173';
let checks=0;
try{
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3129822340744666',route=>route.fulfill({contentType:'application/javascript',body:'window.adsbygoogle=window.adsbygoogle||[];'}));
  await page.goto(baseURL,{waitUntil:'networkidle'});
  await page.locator('canvas').waitFor();
  await page.addScriptTag({path:'node_modules/jsqr/dist/jsQR.js'});
  const beforeOrbit=await page.locator('canvas').screenshot();
  const canvasBounds=await page.locator('canvas').boundingBox();
  await page.mouse.move(canvasBounds.x+canvasBounds.width*.5,canvasBounds.y+canvasBounds.height*.5);
  await page.mouse.down();await page.mouse.move(canvasBounds.x+canvasBounds.width*.5+90,canvasBounds.y+canvasBounds.height*.5+20,{steps:12});await page.mouse.up();await page.waitForTimeout(300);
  assert.notDeepEqual(await page.locator('canvas').screenshot(),beforeOrbit,'Mouse drag must rotate the 3D model');checks++;
  await page.getByRole('button',{name:'Restablecer vista',exact:true}).click();
  const decoding=await page.evaluate(async()=>{
    const {makeQR,qrSVG}=await import('/src/qr.js');
    const results=[];
    for(const dots of ['square','soft','round'])for(const emoji of ['','♥','☕','🍴','😊']){
      const value='https://example.com/menu?table=12',matrix=makeQR(value);
      const svg=qrSVG(matrix,{base:'#F1EDE3',ink:'#294C3F',dots,emoji,logo:''},{pixels:800});
      const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=800;const context=canvas.getContext('2d');context.drawImage(image,0,0);
      const result=window.jsQR(context.getImageData(0,0,800,800).data,800,800);
      results.push({dots,emoji,decoded:result?.data,expected:value});
    }
    return results;
  });
  for(const result of decoding){assert.equal(result.decoded,result.expected,`QR must decode with ${result.dots}/${result.emoji}`);checks++;}
  console.log(`PASS: ${decoding.length} QR designs decoded by an independent reader`);

  const models=await page.evaluate(async()=>{
    const {buildModel,export3MF,exportSTL,disposeModel}=await import('/src/model.js');
    const {makeQR}=await import('/src/qr.js');
    const {ThreeMFLoader}=await import('/node_modules/three/examples/jsm/loaders/3MFLoader.js');
    const {unzipSync,strFromU8}=await import('/node_modules/fflate/esm/browser.js');
    const config={base:'#F1EDE3',ink:'#294C3F',dots:'square',emoji:'',logo:'',label:'CAFÉ & QR'};
    const records=[];
    for(const [object,size] of [['table',90],['keyring',52],['wall',100]]){
      const c={...config,object,size};const model=buildModel(c,makeQR('https://example.com'));
      const bytes=export3MF(model,c),zip=unzipSync(bytes),xml=strFromU8(zip['3D/3dmodel.model']);
      const doc=new DOMParser().parseFromString(xml,'application/xml');
      if(doc.querySelector('parsererror'))throw new Error('Invalid XML');
      const meshes=[...doc.querySelectorAll('mesh')].map(mesh=>{
        const vertices=[...mesh.querySelectorAll('vertex')].map(v=>['x','y','z'].map(k=>Number(v.getAttribute(k))));
        const faces=[...mesh.querySelectorAll('triangle')].map(f=>['v1','v2','v3'].map(k=>Number(f.getAttribute(k))));
        const edges=new Map();let volume=0;
        for(const [a,b,c] of faces){
          for(const [u,v] of [[a,b],[b,c],[c,a]]){const key=[Math.min(u,v),Math.max(u,v)].join('-');edges.set(key,(edges.get(key)||0)+1);}
          const [p,q,r]=[vertices[a],vertices[b],vertices[c]];volume+=(p[0]*(q[1]*r[2]-q[2]*r[1])-p[1]*(q[0]*r[2]-q[2]*r[0])+p[2]*(q[0]*r[1]-q[1]*r[0]))/6;
        }
        return {vertices:vertices.length,triangles:faces.length,badEdges:[...edges.values()].filter(v=>v!==2).length,volume,euler:vertices.length-edges.size+faces.length,finite:vertices.every(v=>v.every(Number.isFinite))};
      });
      const loaded=new ThreeMFLoader().parse(bytes.buffer);const colors=[];loaded.traverse(child=>{if(child.isMesh)colors.push(child.material.color.getHexString().toUpperCase());});
      const stl=exportSTL(model,c);const view=new DataView(stl);
      records.push({object,meshes,colors,materials:[...doc.querySelectorAll('basematerials base')].map(el=>el.getAttribute('displaycolor')),stlTriangles:view.getUint32(80,true),stlLength:stl.byteLength});
      disposeModel(model);
    }
    return records;
  });
  for(const record of models){
    assert.equal(record.meshes.length,2);assert.deepEqual(record.materials,['#F1EDE3FF','#294C3FFF']);
    assert.deepEqual([...new Set(record.colors)].sort(),['294C3F','F1EDE3']);
    for(const mesh of record.meshes){assert.equal(mesh.badEdges,0,`${record.object} must have closed manifold edges`);assert.ok(mesh.volume>0);assert.ok(mesh.finite);checks++;}
    assert.equal(record.meshes[0].euler,{table:2,keyring:0,wall:-2}[record.object],`${record.object} holes must be preserved`);
    assert.equal(record.stlLength,84+record.stlTriangles*50);checks++;
  }
  console.log('PASS: all 3 objects produce closed meshes, correct holes, two 3MF colors and valid binary STL',JSON.stringify(models));
  await fs.mkdir('/workspace/qrforma-validation',{recursive:true});
  for(const format of ['3mf','stl','png','svg']){
    await page.locator('#file-format').selectOption(format);
    const event=page.waitForEvent('download');
    await page.getByRole('button',{name:`Descargar ${format.toUpperCase()}`,exact:true}).click();
    const download=await event;assert.equal(await download.failure(),null);
    const target=`/workspace/qrforma-validation/${download.suggestedFilename()}`;await download.saveAs(target);
    const stat=await fs.stat(target);assert.ok(stat.size>1000);
    await page.locator('.toast').waitFor();
    assert.equal(await page.locator('[role=dialog],.corner-ad,.ad').count(),0);
    await page.getByRole('button',{name:'Cerrar aviso',exact:true}).click();
    if(format==='3mf'){const archive=unzipSync(new Uint8Array(await fs.readFile(target)));assert.ok(strFromU8(archive['3D/3dmodel.model']).includes('QR y texto'));}
    if(format==='3mf'){
      const archive=unzipSync(new Uint8Array(await fs.readFile(target)));
      const settings=JSON.parse(strFromU8(archive['Metadata/project_settings.config']));
      assert.deepEqual(settings.filament_colour,['#F1EDE3','#294C3F']);
      assert.ok(strFromU8(archive['Metadata/model_settings.config']).includes('key="extruder" value="2"'));
    }
    if(format==='png'||format==='svg'){
      const source=`data:${format==='png'?'image/png':'image/svg+xml'};base64,${(await fs.readFile(target)).toString('base64')}`;
      const decoded=await page.evaluate(async source=>{const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1024,1024);return window.jsQR(ctx.getImageData(0,0,1024,1024).data,1024,1024)?.data;},source);
      assert.equal(decoded,'https://turestaurante.com/carta',`Downloaded ${format} must scan`);checks++;
    }
    checks++;
  }
  console.log('PASS: the four real download actions generate non-empty files and a download confirmation');
  await page.getByRole('button',{name:'Wifi',exact:true}).click();
  await page.locator('#ssid').fill('Casa; huéspedes');await page.locator('#password').fill('vacaciones:2026');
  await page.getByRole('button',{name:'Solo QR',exact:true}).click();
  const wifi=await page.evaluate(async()=>{const image=document.querySelector('.qr-preview img');await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const context=canvas.getContext('2d');context.drawImage(image,0,0,1024,1024);return window.jsQR(context.getImageData(0,0,1024,1024).data,1024,1024)?.data;});
  assert.equal(wifi,'WIFI:T:WPA;S:Casa\\; huéspedes;P:vacaciones\\:2026;;');checks++;
  await page.getByRole('button',{name:'Enlace',exact:true}).click();
  await page.getByRole('button',{name:'Vista 3D',exact:true}).click();
  await page.locator('#url').fill('');assert.ok(await page.getByRole('button',{name:'Descargar SVG',exact:true}).isDisabled());
  await page.locator('#url').fill('https://example.com');
  await page.locator('input[aria-label="Color del QR y texto"]').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'#eeeeee');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.ok(await page.getByRole('button',{name:'Descargar SVG',exact:true}).isDisabled(),'Insufficient contrast must block an unreadable export');checks++;
  await page.getByRole('button',{name:'Paleta #F1EDE3 y #294C3F',exact:true}).click();
  const logoData=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=80;const context=canvas.getContext('2d');context.fillStyle='#294C3F';context.beginPath();context.arc(40,40,30,0,Math.PI*2);context.fill();context.fillStyle='white';context.font='bold 35px sans-serif';context.textAlign='center';context.fillText('Q',40,52);return canvas.toDataURL('image/png').split(',')[1];});
  await page.locator('input[type=file]').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from(logoData,'base64')});
  await page.getByRole('button',{name:'Quitar logo',exact:true}).waitFor();
  await page.getByRole('button',{name:'Solo QR',exact:true}).click();
  const logoDecoded=await page.evaluate(async()=>{const img=document.querySelector('.qr-preview img');await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,1024,1024);return window.jsQR(ctx.getImageData(0,0,1024,1024).data,1024,1024)?.data;});
  assert.equal(logoDecoded,'https://example.com','Uploaded logo must preserve a readable QR');checks++;
  const maskInfo=await page.evaluate(async()=>{const img=document.querySelector('.qr-preview img');const {makeMarkMask,buildModel,disposeModel}=await import('/src/model.js');const {makeQR}=await import('/src/qr.js');const svg=new DOMParser().parseFromString(decodeURIComponent(img.src.split(',')[1]),'image/svg+xml');const logo=svg.querySelector('image').getAttribute('href');const config={object:'keyring',size:52,base:'#F1EDE3',ink:'#294C3F',dots:'soft',logo,label:'Logo',emoji:''};const mask=await makeMarkMask(config);const model=buildModel(config,makeQR('https://example.com'),mask);const count=model.ink.getAttribute('position').count;disposeModel(model);return {pixels:mask.data.filter(Boolean).length,count};});
  assert.ok(maskInfo.pixels>0);assert.ok(maskInfo.count>1000);checks++;
  await page.getByRole('button',{name:'Quitar logo',exact:true}).click();await page.getByRole('button',{name:'Vista 3D',exact:true}).click();
  await page.locator('#label').fill('ESCANEA Y DISFRUTA');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    assert.equal(overflow,false,`No horizontal overflow at ${width}px`);checks++;
  }
  await page.screenshot({path:'/workspace/qrforma-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/workspace/qrforma-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${checks} functional assertions; no browser errors; mobile and desktop screenshots saved.`);
}finally{await browser.close();}
