import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { zipSync, strToU8 } from 'fflate';
import { escapeXML, isMarkCell } from './qr.js';

const font = new FontLoader().parse(fontData);
const dimensions = { table: {w:90,h:104}, keyring:{w:52,h:70}, wall:{w:100,h:116} };
export function dimensionsFor(config, matrix) {
  const d=dimensions[config.object];
  const scale=config.size/d.w;
  return {width:config.size,height:Math.round((d.h+(config.object==='table'?2.9:0))*scale),depth:config.object==='table'?Math.round(42*scale):Number((3.8*scale).toFixed(1)),
    module:(d.w-12)/(matrix?.size+8)*scale};
}
function roundRect(w,h,r) {
  const s=new THREE.Shape(),x=-w/2;
  s.moveTo(x+r,0);s.lineTo(x+w-r,0);s.quadraticCurveTo(x+w,0,x+w,r);
  s.lineTo(x+w,h-r);s.quadraticCurveTo(x+w,h,x+w-r,h);
  s.lineTo(x+r,h);s.quadraticCurveTo(x,h,x,h-r);
  s.lineTo(x,r);s.quadraticCurveTo(x,0,x+r,0);
  return s;
}
function extrude(shape, depth) { return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12}); }
function box(w,h,d,x,y,z) { return new THREE.BoxGeometry(w,h,d).translate(x,y,z); }

// All printable geometry is built from closed solids in millimetres.
export function buildModel(config, matrix, markMask=null) {
  if(!matrix) return null;
  const {w,h}=dimensions[config.object], scale=config.size/w;
  const baseShape=roundRect(w,h,config.object==='keyring'?7:5);
  if(config.object==='keyring') {
    const hole=new THREE.Path();hole.absarc(0,h-5,2.4,0,Math.PI*2,true);baseShape.holes.push(hole);
  }
  if(config.object==='wall') {
    for(const x of [-w/2+7,w/2-7]) {const hole=new THREE.Path();hole.absarc(x,h-6,2.2,0,Math.PI*2,true);baseShape.holes.push(hole);}
  }
  let baseParts;
  if(config.object==='table') {
    // A single extruded L profile makes the foot and upright one closed solid.
    const profile=new THREE.Shape();
    profile.moveTo(-31,0);profile.lineTo(11,0);profile.lineTo(11,3);
    profile.lineTo(0,3);profile.lineTo(0,h+2.9);profile.lineTo(-3,h+2.9);
    profile.lineTo(-3,3);profile.lineTo(-31,3);profile.closePath();
    baseParts=[extrude(profile,w).rotateY(-Math.PI/2).translate(w/2,0,0)];
  }else baseParts=[extrude(baseShape,3).translate(0,0,-3)];
  const relief=[];
  const qrWidth=w-12, unit=qrWidth/(matrix.size+8);
  const top=config.object==='table'?h-3:h-(config.object==='keyring'?11:9);
  const startY=top-4*unit;
  const mark=Boolean(config.emoji||config.logo);
  for(let y=0;y<matrix.size;y++) for(let x=0;x<matrix.size;x++) {
    if(!matrix.get(y,x)||isMarkCell(x,y,matrix.size,mark)) continue;
    const px=-qrWidth/2+(x+4.5)*unit, py=startY-(y+.5)*unit;
    const finder=(x<7&&y<7)||(x>=matrix.size-7&&y<7)||(x<7&&y>=matrix.size-7);
    let g;
    if(config.dots==='round'&&!finder) g=new THREE.CylinderGeometry(unit*.49,unit*.49,.8,16).rotateX(Math.PI/2).translate(px,py,.4);
    else if(config.dots==='soft'&&!finder) g=extrude(roundRect(unit*.98,unit*.98,unit*.22),.8).translate(px,py-unit*.49,0);
    else g=box(unit*.98,unit*.98,.8,px,py,.4);
    relief.push(g);
  }
  if(mark&&markMask) {
    const extent=(Math.max(2,Math.floor(matrix.size*.09))*2-1)*unit;
    const cy=startY-matrix.size*unit/2;
    const pixel=extent/markMask.width;
    for(let y=0;y<markMask.height;y++) {
      let start=-1;
      for(let x=0;x<=markMask.width;x++) {
        const on=x<markMask.width&&markMask.data[y*markMask.width+x];
        if(on&&start<0) start=x;
        if(!on&&start>=0) {relief.push(box((x-start-.02)*pixel,pixel*.98,.8,-extent/2+(start+(x-start)/2)*pixel,cy+extent/2-(y+.5)*pixel,.4));start=-1;}
      }
    }
  }
  const label=config.label.trim();
  const labelY=Math.max(6,(top-qrWidth)*.5);
  if(label) {
    const safe=Array.from(label).map(c=>font.data.glyphs[c]?c:'?').join('');
    const g=new TextGeometry(safe,{font,size:config.object==='keyring'?3.3:5.2,depth:.8,curveSegments:4,bevelEnabled:false});
    g.computeBoundingBox();
    const b=g.boundingBox, textWidth=b.max.x-b.min.x;
    const fit=Math.min(1,(w-12)/textWidth);
    g.scale(fit,fit,1);g.translate(-textWidth*fit/2,labelY,0);relief.push(g);
  }
  const merge=(parts)=>{
    const prepared=parts.map(g=>{const p=g.index?g.toNonIndexed():g; p.deleteAttribute('uv');return p;});
    const merged=mergeGeometries(prepared,false);
    for(const p of prepared)p.dispose();for(const g of parts)g.dispose();
    return merged.scale(scale,scale,scale);
  };
  return {base:merge(baseParts), ink:merge(relief)};
}
export async function makeMarkMask(config) {
  if(!config.emoji&&!config.logo)return null;
  const width=40,canvas=document.createElement('canvas');canvas.width=width;canvas.height=width;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(config.logo) {
    const img=new Image();img.src=config.logo;await img.decode();
    const ratio=Math.min(width/img.width,width/img.height);
    ctx.drawImage(img,(width-img.width*ratio)/2,(width-img.height*ratio)/2,img.width*ratio,img.height*ratio);
  } else {
    ctx.font='34px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(config.emoji,width/2,width/2+2);
  }
  const pixels=ctx.getImageData(0,0,width,width).data;
  const data=[];
  for(let i=0;i<pixels.length;i+=4) data.push(pixels[i+3]>90 && (pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114)<210 ? 1:0);
  return {width,height:width,data};
}
export function disposeModel(model) { model?.base.dispose();model?.ink.dispose(); }

function geometryXML(geometry, materialIndex, vertical) {
  const g=geometry.clone();
  // 3MF's build plane is XY, so table stands use Z as up. Flat objects print face up.
  if(vertical) {g.rotateX(Math.PI/2);}
  const pos=g.getAttribute('position'), vertices=[], triangles=[];
  const unique=new Map(),indices=[];
  for(let i=0;i<pos.count;i++) {
    const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Number(v.toFixed(5))).join(' ');
    if(!unique.has(key)){unique.set(key,vertices.length);const [x,y,z]=key.split(' ');vertices.push(`<vertex x="${x}" y="${y}" z="${z}"/>`);}
    indices.push(unique.get(key));
  }
  const raw=g.index?Array.from(g.index.array):indices.map((_,i)=>i);
  for(let i=0;i<raw.length;i+=3) triangles.push(`<triangle v1="${indices[raw[i]]}" v2="${indices[raw[i+1]]}" v3="${indices[raw[i+2]]}" pid="1" p1="${materialIndex}" p2="${materialIndex}" p3="${materialIndex}"/>`);
  g.dispose();return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh>`;
}
export function export3MF(model, config) {
  // Core 3MF base materials encode both colors without a proprietary slicer profile.
  const xml=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="es" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">QRforma · ${escapeXML(config.label||'Código QR')}</metadata><metadata name="Designer">QRforma</metadata><resources><basematerials id="1"><base name="Base" displaycolor="${config.base.toUpperCase()}FF"/><base name="QR y texto" displaycolor="${config.ink.toUpperCase()}FF"/></basematerials><object id="2" type="model" name="Base" pid="1" pindex="0">${geometryXML(model.base,0,config.object==='table')}</object><object id="3" type="model" name="QR y texto" pid="1" pindex="1">${geometryXML(model.ink,1,config.object==='table')}</object><object id="4" type="model" name="QRforma"><components><component objectid="2"/><component objectid="3"/></components></object></resources><build><item objectid="4" transform="1 0 0 0 1 0 0 0 1 ${config.size/2+5} ${config.object==='table'?config.size*.4:5} ${config.object==='table'?0:3*config.size/dimensions[config.object].w}"/></build></model>`;
  return zipSync({
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model':strToU8(xml),
    // Optional slicer metadata follows Bambu Studio's part/extruder conventions.
    // Core-compatible readers can ignore it and still read both base materials.
    'Metadata/model_settings.config':strToU8('<?xml version="1.0" encoding="UTF-8"?><config><object id="4"><metadata key="name" value="QRforma"/><metadata key="extruder" value="1"/><part id="2" subtype="normal_part"><metadata key="name" value="Base"/><metadata key="extruder" value="1"/></part><part id="3" subtype="normal_part"><metadata key="name" value="QR y texto"/><metadata key="extruder" value="2"/></part></object></config>'),
    'Metadata/project_settings.config':strToU8(JSON.stringify({filament_colour:[config.base.toUpperCase(),config.ink.toUpperCase()],extruder_colour:[config.base.toUpperCase(),config.ink.toUpperCase()],filament_type:['PLA','PLA'],filament_diameter:['1.75','1.75']})),
  },{level:6});
}
export function exportSTL(model,config) {
  const geometries=[model.base.clone(),model.ink.clone()];
  for(const g of geometries){if(config.object==='table')g.rotateX(Math.PI/2);else g.translate(0,0,3*config.size/dimensions[config.object].w);}
  const count=geometries.reduce((sum,g)=>sum+g.getAttribute('position').count/3,0);
  const buffer=new ArrayBuffer(84+count*50),view=new DataView(buffer);view.setUint32(80,count,true);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();let offset=84;
  for(const g of geometries){const p=g.getAttribute('position');for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a)).normalize();for(const v of [normal,a,b,c])for(const n of [v.x,v.y,v.z]){view.setFloat32(offset,n,true);offset+=4;}offset+=2;}g.dispose();}
  return buffer;
}
