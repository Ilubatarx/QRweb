import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModel, makeMarkMask, disposeModel } from './model.js';
import { qrSVG } from './qr.js';

const Preview=forwardRef(function Preview({config,matrix},ref){
  const host=useRef(null),sceneRef=useRef(null),[fallback,setFallback]=useState(false);
  useImperativeHandle(ref,()=>({reset(){sceneRef.current?.reset();}}),[]);
  useEffect(()=>{
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{setFallback(true);return;}
    const el=host.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.domElement.setAttribute('aria-label','Vista previa 3D del QR. Arrastra para girar y usa la rueda para acercar.');
    renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(33,1,.1,2000);camera.position.set(125,75,235);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=100;controls.maxDistance=500;controls.target.set(0,0,0);
    const ambient=new THREE.HemisphereLight(0xffffff,0xb6b6a2,3);scene.add(ambient);
    const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-90,160,150);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-150;key.shadow.camera.right=150;key.shadow.camera.top=150;key.shadow.camera.bottom=-150;key.shadow.normalBias=.3;scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(150,40,-80);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-55;floor.receiveShadow=true;scene.add(floor);
    const root=new THREE.Group();scene.add(root);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let frame;const render=()=>{frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera);};render();
    sceneRef.current={root,floor,camera,controls,reset(){camera.position.set(125,75,235);controls.target.set(0,0,0);controls.update();}};
    return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();root.children.forEach(m=>{m.geometry.dispose();m.material.dispose();});floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.domElement.remove();sceneRef.current=null;};
  },[]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const mask=await makeMarkMask(config);
      if(cancelled||!sceneRef.current)return;
      const {root,floor,camera,controls}=sceneRef.current;
      while(root.children.length){const m=root.children[0];root.remove(m);m.geometry.dispose();m.material.dispose();}
      if(!matrix)return;
      const model=buildModel(config,matrix,mask);
      for(const [part,color] of [['base',config.base],['ink',config.ink]]){
        const mat=new THREE.MeshStandardMaterial({color,roughness:.73,metalness:0});const mesh=new THREE.Mesh(model[part],mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      }
      root.position.set(0,0,0);
      const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());root.position.set(-center.x,-center.y,-center.z);
      floor.position.y=-bounds.getSize(new THREE.Vector3()).y/2-.15;
      const height=bounds.getSize(new THREE.Vector3()).y;
      const distance=Math.max(height,config.size)*2.65;
      const dir=camera.position.clone().sub(controls.target).normalize();camera.position.copy(dir.multiplyScalar(distance));controls.target.set(0,0,0);controls.update();
    })().catch(()=>setFallback(true));
    return()=>{cancelled=true;};
  },[config,matrix]);
  return <><div ref={host} className={`three-host ${fallback?'is-hidden':''}`}/>{fallback&&<div className="preview-fallback"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSVG(matrix,config))}`} alt="Vista del código QR"/><p>WebGL no está disponible. Las descargas 3D siguen funcionando.</p></div>}</>;
});
export default Preview;
