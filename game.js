import * as THREE from './vendor/three.module.min.js';
import {Marble,COURSE,RAD,clamp,handSlope,limitedTilt,faceTravel,boardNormal} from './physics.js';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dce8e2');scene.fog=new THREE.Fog('#dce8e2',60,145);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');$('viewport').append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.04,180),rig=new THREE.Group();scene.add(rig);rig.add(camera);
scene.add(new THREE.HemisphereLight('#f6fff2','#748b80',2.7));const sun=new THREE.DirectionalLight('#fff3da',3.1);sun.position.set(-20,40,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:38,bottom:-38,near:1,far:100});sun.shadow.bias=-.0006;scene.add(sun);
const board=new THREE.Group();scene.add(board);
const mat=(color,roughness=.6,metalness=.0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const porcelain=mat('#e5e8d9'),edge=mat('#385b5b'),rail=mat('#497570',.4,.25),copper=mat('#be815d',.48,.2),mint=mat('#70c7a6',.4,.1),dark=mat('#193c42'),mudMat=mat('#775d46',.94);
function box(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function ring(parent,r,t,x,y,z,color){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),mat(color,.45,.2));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m}
function text(parent,content,x,y,z,{size=1,color='#2c5558',flat=true}={}){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.font='600 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(content,512,64);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(size*8,size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));if(flat)m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m}
// The visual board and physical holes share one course definition.
const shape=new THREE.Shape();shape.moveTo(-16,-22);shape.lineTo(16,-22);shape.lineTo(16,22);shape.lineTo(-16,22);shape.closePath();for(const h of COURSE.holes){const p=new THREE.Path();p.absarc(h.x,-h.z,h.r,0,Math.PI*2,true);shape.holes.push(p)}
const deck=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.62,bevelEnabled:false,curveSegments:40}),[porcelain,edge]);deck.rotation.x=-Math.PI/2;deck.position.y=-.62;deck.receiveShadow=true;deck.castShadow=true;board.add(deck);
// Fine tile lines are broken at the actual openings.
const lines=[];function inHole(x,z){return COURSE.holes.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+.04)}
for(let x=-15;x<=15;x+=2)for(let z=-21.9;z<22;z+=.2)if(!inHole(x,z)&&!inHole(x,z+.2))lines.push(x,.012,z,x,.012,z+.2);
for(let z=-20;z<=20;z+=2)for(let x=-15.9;x<16;x+=.2)if(!inHole(x,z)&&!inHole(x+.2,z))lines.push(x,.013,z,x+.2,.013,z);
const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));board.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:'#b8c9bd',transparent:true,opacity:.55})));
box(board,.2,.65,44,-15.98,.32,0,rail);box(board,.2,.65,44,15.98,.32,0,rail);box(board,32,.65,.2,0,.32,21.98,rail);box(board,32,.65,.2,0,.32,-21.98,rail);
for(const h of COURSE.holes){ring(board,h.r+.04,.055,h.x,.025,h.z,'#c07b54');const inner=new THREE.Mesh(new THREE.CylinderGeometry(h.r,h.r,1.25,48,1,true),new THREE.MeshStandardMaterial({color:'#203d40',side:THREE.DoubleSide}));inner.position.set(h.x,-.6,h.z);board.add(inner)}
for(const w of COURSE.walls){box(board,w.w,.95,w.d,w.x,.475,w.z,rail);box(board,w.w+.04,.055,w.d+.04,w.x,.98,w.z,mint)}
for(const r of COURSE.ramps){
 const pts=[[-r.w/2,0,-r.d/2],[r.w/2,0,-r.d/2],[-r.w/2,r.h,0],[r.w/2,r.h,0],[-r.w/2,0,r.d/2],[r.w/2,0,r.d/2]];
 const tris=[0,2,1,1,2,3,2,4,3,3,4,5,0,4,2,1,3,5];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(tris.flatMap(i=>pts[i]),3));geo.computeVertexNormals();const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#bd865f',roughness:.65,side:THREE.DoubleSide}));m.position.set(r.x,.018,r.z);m.castShadow=true;m.receiveShadow=true;board.add(m);
 for(const sign of [-1,1]){const curve=new THREE.LineCurve3(new THREE.Vector3(r.x+sign*(r.w/2-.12),.04,r.z-r.d/2),new THREE.Vector3(r.x+sign*(r.w/2-.12),r.h+.04,r.z));board.add(new THREE.Mesh(new THREE.TubeGeometry(curve,1,.025,5,false),mint));const cv=new THREE.LineCurve3(new THREE.Vector3(r.x+sign*(r.w/2-.12),r.h+.04,r.z),new THREE.Vector3(r.x+sign*(r.w/2-.12),.04,r.z+r.d/2));board.add(new THREE.Mesh(new THREE.TubeGeometry(cv,1,.025,5,false),mint))}
 text(board,'RISE / COAST',r.x,.045,r.z+r.d/2+1,{size:.45});
}
const mud=COURSE.mud;box(board,mud.w,.035,mud.d,mud.x,.02,mud.z,mudMat);
// Deterministic ripples, without external art or model assets.
for(let i=0;i<35;i++){const x=mud.x+Math.sin(i*19.7)*2.7,z=mud.z+Math.cos(i*7.2)*2.7;const m=new THREE.Mesh(new THREE.CircleGeometry(.08+(i%4)*.04,10),mat(i%2?'#8b7257':'#624f3e'));m.rotation.x=-Math.PI/2;m.position.set(x,.045,z);board.add(m)}
text(board,'MUD / RESISTANCE',7,.06,10,{size:.5,color:'#846447'});
const g=COURSE.goal;ring(board,g.r,.095,g.x,.08,g.z,'#66c59c');ring(board,g.r-.3,.025,g.x,.03,g.z,'#68ac91');const goalDisk=new THREE.Mesh(new THREE.CircleGeometry(g.r-.12,64),new THREE.MeshBasicMaterial({color:'#b5dfc7',transparent:true,opacity:.35}));goalDisk.rotation.x=-Math.PI/2;goalDisk.position.set(g.x,.022,g.z);board.add(goalDisk);
text(board,'SETTLE HERE',0,.04,-17,{size:.5});text(board,'THE STILL POINT',0,.045,-20,{size:.6});
ring(board,1.8,.035,0,.03,16,'#749d8c');text(board,'START / FIND YOUR BALANCE',0,.04,19.3,{size:.5});text(board,'01',-12,.04,18,{size:1.25,color:'#a4b9ac'});
// Sparse route markers leave the garden open for experiments.
for(const z of [12,9,4,0,-5,-13]){const arrow=new THREE.Shape();arrow.moveTo(0,-.4);arrow.lineTo(.22,.15);arrow.lineTo(0,0);arrow.lineTo(-.22,.15);arrow.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(arrow),new THREE.MeshBasicMaterial({color:'#7aab96',side:THREE.DoubleSide}));m.rotation.x=Math.PI/2;m.position.set(0,.025,z);board.add(m)}
// A quiet exhibition plinth makes world tilt legible from outside.
box(scene,27,.7,37,0,-3.4,0,mat('#b6cbc2'));box(scene,17,1.6,25,0,-4.5,0,mat('#90afa4'));box(scene,250,.1,250,0,-5.4,0,mat('#d6e2d9'));
const ballWorld=new THREE.Group(),shell=new THREE.Group(),cabin=new THREE.Group();scene.add(ballWorld);ballWorld.add(shell,cabin);
const sphereMat=new THREE.MeshPhysicalMaterial({color:'#afdbd2',metalness:.05,roughness:.16,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false});const sphere=new THREE.Mesh(new THREE.SphereGeometry(COURSE.radius,40,24),sphereMat);shell.add(sphere);
const seamMat=new THREE.MeshStandardMaterial({color:'#74a9a0',transparent:true,opacity:.6,roughness:.3,metalness:.35,depthWrite:false});for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(COURSE.radius,.005,5,80),seamMat);if(i===0)m.rotation.x=Math.PI/2;if(i===1)m.rotation.y=Math.PI/2;shell.add(m)}
// Upright seat and fixed side supports stay out of the central sightline.
box(cabin,.58,.11,.58,0,-.43,.04,dark);box(cabin,.62,.46,.10,0,-.22,.27,rail);box(cabin,.06,.25,.45,-.34,-.32,0,copper);box(cabin,.06,.25,.45,.34,-.32,0,copper);const passenger=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),mint);passenger.position.set(0,.11,.02);cabin.add(passenger);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.83,40),new THREE.MeshBasicMaterial({color:'#234a47',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;board.add(shadow);
// In-headset instrumentation is real scene geometry (DOM does not render in VR).
const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=256;const hudContext=hudCanvas.getContext('2d'),hudTexture=new THREE.CanvasTexture(hudCanvas);hudTexture.colorSpace=THREE.SRGBColorSpace;const hud=new THREE.Mesh(new THREE.PlaneGeometry(.64,.16),new THREE.MeshBasicMaterial({map:hudTexture,transparent:true,depthTest:false}));hud.position.set(0,-.28,-.82);hud.renderOrder=20;camera.add(hud);hud.visible=false;
const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=256;const sc=shadeCanvas.getContext('2d'),grad=sc.createRadialGradient(128,128,65,128,128,175);grad.addColorStop(0,'rgba(10,30,33,0)');grad.addColorStop(1,'rgba(10,30,33,.7)');sc.fillStyle=grad;sc.fillRect(0,0,256,256);const shadeTex=new THREE.CanvasTexture(shadeCanvas);const vrShade=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),new THREE.MeshBasicMaterial({map:shadeTex,transparent:true,depthTest:false,depthWrite:false}));vrShade.position.z=-.55;vrShade.renderOrder=19;camera.add(vrShade);vrShade.visible=false;
// Grip visuals are rig children, so physical tracking remains intact during yaw.
for(let i=0;i<2;i++){const grip=renderer.xr.getControllerGrip(i);rig.add(grip);const m=new THREE.Mesh(new THREE.CapsuleGeometry(.028,.08,4,8),mat(i?'#d49b6b':'#92ddba'));m.rotation.x=Math.PI/2;grip.add(m)}
const ball=new Marble(),target={x:0,z:0},tilt={x:0,z:0},keys=new Set();let yaw=0,view='overview',paused=false,accumulator=0,last=0,fade=0,fallWait=0,winAnnounced=false,toastUntil=0,frameCount=0;
let tracking='Desktop input',xrCal=null,calibrateNext=true,buttonState={},knobBase={left:null,right:null},xrStarted=false,lookYaw=0,lookPitch=0,dragLast=null;
const settings={limit:12*RAD,sensitivity:.65,turn:40*RAD};let lastHud=0;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');toastUntil=performance.now()+3200;tracking=renderer.xr.isPresenting?message:tracking}
function reset(){ball.reset();target.x=target.z=tilt.x=tilt.z=0;yaw=0;fallWait=0;fade=0;winAnnounced=false;keys.clear();shell.quaternion.identity();if(renderer.xr.isPresenting)calibrateNext=true;notify('Fresh start. Small movements first.')}
function setView(v){view=v;lookYaw=lookPitch=0;document.body.classList.toggle('cabin-view',v==='cabin');$('overview').classList.toggle('active',v==='overview');$('cabin').classList.toggle('active',v==='cabin');camera.rotation.set(0,0,0);rig.rotation.set(0,0,0)}
function setPaused(value){paused=value;$('pause').textContent=paused?'Resume':'Pause';accumulator=0;notify(paused?'Paused. Your momentum is held.':'Rolling again.')}
function setMode(v){$('mode').value=v;knobBase={left:null,right:null};target.x=target.z=0;notify(v==='hands'?'Two-hand slope: downhill toward the lower hand.':'Knobs: hold both grips, then rotate.')}
$('overview').onclick=()=>setView('overview');$('cabin').onclick=()=>setView('cabin');$('reset').onclick=reset;$('pause').onclick=()=>setPaused(!paused);$('mode').onchange=()=>setMode($('mode').value);
for(const id of ['tilt','sensitivity','turn'])$(id).oninput=()=>{const v=Number($(id).value);if(id==='tilt'){settings.limit=v*RAD;$('tilt-value').textContent=`${v}°`}if(id==='sensitivity'){settings.sensitivity=v;$('sensitivity-value').textContent=`${v.toFixed(2)}×`}if(id==='turn'){settings.turn=v*RAD;$('turn-value').textContent=`${v}°/s`}};
$('vignette').onchange=()=>document.body.classList.toggle('vignette',$('vignette').checked);document.body.classList.add('vignette');
$('help').onclick=()=>{$('instructions').showModal();setPaused(true)};$('close-help').onclick=()=>{$('instructions').close();setPaused(false)};$('begin').onclick=$('close-help').onclick;
addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||$('instructions').open)return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;if(k==='r')reset();if(k==='c')setView(view==='overview'?'cabin':'overview');if(k===' ')setPaused(!paused)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();if(!renderer.xr.isPresenting)setPaused(true)});document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&!renderer.xr.isPresenting)setPaused(true)});
renderer.domElement.addEventListener('pointerdown',e=>{if(view==='cabin'&&!renderer.xr.isPresenting){dragLast={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)}});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragLast)return;lookYaw-=(e.clientX-dragLast.x)*.003;lookPitch=clamp(lookPitch-(e.clientY-dragLast.y)*.003,-1.1,1.1);dragLast={x:e.clientX,y:e.clientY}});
renderer.domElement.addEventListener('pointerup',()=>dragLast=null);
function desktopInput(){const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);Object.assign(target,limitedTilt(x*settings.limit,z*settings.limit,settings.limit));tracking='Desktop input'}
const tempQ=new THREE.Quaternion(),tmpV=new THREE.Vector3(),invQ=new THREE.Quaternion();
function edgeButton(source,index,key){const p=!!source?.gamepad?.buttons[index]?.pressed,first=p&&!buttonState[key];buttonState[key]=p;return first}
function readXR(frame){
 const session=renderer.xr.getSession(),ref=renderer.xr.getReferenceSpace();if(!frame||!ref)return;
 const viewer=frame.getViewerPose(ref);if(!viewer){target.x=target.z=0;tracking='Headset tracking lost · leveling';return}
 const hands={};for(const source of session.inputSources){if(!source.gripSpace)continue;const p=frame.getPose(source.gripSpace,ref);if(p&&['left','right'].includes(source.handedness))hands[source.handedness]={pose:p,source}}
 if(edgeButton(hands.left?.source,3,'calibrate'))calibrateNext=true;
 if(edgeButton(hands.left?.source,4,'mode'))setMode($('mode').value==='hands'?'knobs':'hands');
 if(edgeButton(hands.right?.source,4,'reset'))reset();
 if(edgeButton(hands.right?.source,5,'pause'))setPaused(!paused);
 if(calibrateNext||!xrCal){
  const p=viewer.transform.position,q=viewer.transform.orientation;tmpV.set(0,0,-1).applyQuaternion(tempQ.set(q.x,q.y,q.z,q.w));const heading=Math.atan2(-tmpV.x,-tmpV.z);
  xrCal={pos:new THREE.Vector3(p.x,p.y,p.z),heading};calibrateNext=false;knobBase={left:null,right:null};tracking='Centered';
 }
 if(!hands.left||!hands.right){target.x=target.z=0;knobBase={left:null,right:null};tracking='Need both controllers · leveling';return}
 const a=hands.left.pose.transform,b=hands.right.pose.transform;
 if($('mode').value==='hands'){
  const s=handSlope(a.position,b.position,{limit:settings.limit,sensitivity:settings.sensitivity});
  // Convert once from reference space to calibrated board axes. Never use cabin yaw.
  tmpV.set(s.x,0,s.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP,-xrCal.heading);target.x=tmpV.x;target.z=tmpV.z;tracking=s.valid?'Two-hand slope':'Separate controllers · leveling';
 }else{
  let both=true;const angles={};for(const side of ['left','right']){
   const h=hands[side],pressed=!!h.source.gamepad?.buttons[1]?.pressed,q=h.pose.transform.orientation;
   if(!pressed){knobBase[side]=null;both=false;continue}
   tempQ.set(q.x,q.y,q.z,q.w);if(!knobBase[side])knobBase[side]=tempQ.clone();invQ.copy(knobBase[side]).invert();tempQ.premultiply(invQ);
   if(side==='left'){tmpV.set(0,0,-1).applyQuaternion(tempQ);angles.z=Math.atan2(tmpV.y,Math.hypot(tmpV.x,tmpV.z))}
   else{tmpV.set(0,1,0).applyQuaternion(tempQ);angles.x=Math.atan2(tmpV.x,tmpV.y)}
  }
  Object.assign(target,both?limitedTilt(angles.x*settings.sensitivity,angles.z*settings.sensitivity,settings.limit):{x:0,z:0});tracking=both?'Knobs engaged':'Hold both grips to turn knobs';
 }
}
async function setupVR(){
 if(!window.isSecureContext){$('vr').textContent='VR needs HTTPS';$('vr').disabled=true;$('vr-note').textContent='Open through trusted HTTPS for standalone Quest. See README.';return}
 if(!navigator.xr){$('vr').textContent='VR browser required';$('vr').disabled=true;$('vr-note').textContent='Desktop preview ready. For VR, use a WebXR-capable headset browser.';return}
 try{const ok=await navigator.xr.isSessionSupported('immersive-vr');$('vr').textContent=ok?'Enter VR ↗':'No VR headset detected';$('vr').disabled=!ok;$('vr-note').textContent=ok?'Sit comfortably. Start with both hands level.':'Desktop preview ready. Connect a headset, then reload.'}catch(e){$('vr').textContent='VR unavailable';$('vr').disabled=true;$('vr-note').textContent=e.message}
}
$('vr').onclick=async()=>{try{if(renderer.xr.isPresenting){await renderer.xr.getSession().end();return}const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')setPaused(true)});await renderer.xr.setSession(session)}catch(e){notify(`VR could not start: ${e.message}`)}};
renderer.xr.addEventListener('sessionstart',()=>{xrStarted=true;setView('cabin');reset();paused=false;calibrateNext=true;keys.clear();$('vr').textContent='Exit VR';hud.visible=true;renderer.xr.setFoveation(1);document.body.classList.add('in-vr')});
renderer.xr.addEventListener('sessionend',()=>{xrStarted=false;xrCal=null;buttonState={};knobBase={left:null,right:null};hud.visible=false;vrShade.visible=false;camera.position.set(0,0,0);camera.quaternion.identity();rig.position.set(0,0,0);rig.quaternion.identity();setView('overview');setPaused(true);$('vr').textContent='Enter VR ↗';document.body.classList.remove('in-vr')});setupVR();
const worldPos=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),axis=new THREE.Vector3(),rollQ=new THREE.Quaternion(),boardQ=new THREE.Quaternion();
function updateWorld(dt){
 const t=Math.hypot(tilt.x,tilt.z);
 if(t>.000001){const n=boardNormal($('stabilized').checked?{x:0,z:0}:tilt);normal.set(n.x,n.y,n.z);boardQ.setFromUnitVectors(up,normal)}else boardQ.identity();
 board.quaternion.copy(boardQ);worldPos.set(ball.x,ball.y,ball.z).applyQuaternion(boardQ);ballWorld.position.copy(worldPos);
 cabin.rotation.y=yaw;passenger.visible=view==='overview'&&!renderer.xr.isPresenting;
 seamMat.opacity=view==='overview'&&!renderer.xr.isPresenting?.6:.10;sphereMat.opacity=view==='overview'&&!renderer.xr.isPresenting?.14:.025;
 const distance=ball.speed*dt;if(distance>.00001&&!paused&&!fallWait){axis.set(ball.vz,0,-ball.vx).normalize().applyQuaternion(boardQ);rollQ.setFromAxisAngle(axis,distance/COURSE.radius);shell.quaternion.premultiply(rollQ)}
 shadow.position.set(ball.x,.02,ball.z);shadow.visible=ball.y<1.4&&!ball.fallen;
 if(renderer.xr.isPresenting&&xrCal){
  // Neutral headset position is centered inside the sphere. Preserve all physical
  // head translation/rotation; only the rig receives simulated translation/yaw.
  const total=yaw-xrCal.heading;rig.rotation.set(0,total,0);tmpV.copy(xrCal.pos).applyAxisAngle(up,total);rig.position.copy(worldPos).sub(tmpV);camera.position.set(0,0,0);vrShade.visible=$('vignette').checked;
 }else if(view==='cabin'){
  rig.position.copy(worldPos);rig.rotation.set(0,yaw,0);camera.position.set(0,.08,0);camera.rotation.set(lookPitch,lookYaw,0,'YXZ');
 }else{
  rig.position.set(0,0,0);rig.rotation.set(0,0,0);camera.position.set(37,40,48);
  // Leave breathing room for the control panel on wide screens.
  camera.lookAt(innerWidth>1000?new THREE.Vector3(1,-.4,-1):new THREE.Vector3(0,0,0));camera.fov=innerWidth<700?67:48;camera.updateProjectionMatrix();
 }
 if(!renderer.xr.isPresenting)$('shade').style.opacity=fade;
}
const dial=$('tilt-dial').getContext('2d');function updateUI(now){
 $('speed').innerHTML=`${ball.speed.toFixed(2)}<small>m/s</small>`;$('angle').innerHTML=`${(Math.hypot(tilt.x,tilt.z)/RAD).toFixed(1)}<small>°</small>`;$('surface').textContent=ball.surface;
 $('status').textContent=paused?'Simulation paused':ball.won?'Goal reached · keep experimenting':fallWait?'Returning to start…':ball.speed>.15?'Momentum in motion':'Ready to roll';
 dial.clearRect(0,0,104,104);dial.strokeStyle='#bdcec3';dial.lineWidth=2;dial.beginPath();dial.arc(52,52,43,0,Math.PI*2);dial.stroke();dial.beginPath();dial.moveTo(52,8);dial.lineTo(52,96);dial.moveTo(8,52);dial.lineTo(96,52);dial.stroke();const dx=tilt.x/settings.limit*35,dz=tilt.z/settings.limit*35;dial.strokeStyle='#658f79';dial.lineWidth=3;dial.beginPath();dial.moveTo(52,52);dial.lineTo(52+dx,52+dz);dial.stroke();dial.fillStyle='#3e7a65';dial.beginPath();dial.arc(52+dx,52+dz,6,0,Math.PI*2);dial.fill();
 if(now>toastUntil)$('toast').classList.remove('show');
 if(renderer.xr.isPresenting){hudContext.clearRect(0,0,1024,256);hudContext.fillStyle='rgba(15,40,44,.88)';hudContext.fillRect(0,0,1024,256);hudContext.fillStyle='#b9e5ca';hudContext.font='600 25px sans-serif';hudContext.fillText('TILT SPHERE / '+($('mode').value==='hands'?'TWO-HAND SLOPE':'KNOBS'),28,42);hudContext.fillStyle='#fff';hudContext.font='38px sans-serif';hudContext.fillText(`${ball.speed.toFixed(1)} m/s    ${(Math.hypot(tilt.x,tilt.z)/RAD).toFixed(1)}°    ${ball.surface}`,28,103);hudContext.font='24px sans-serif';hudContext.fillStyle='#bed4ce';hudContext.fillText(paused?'PAUSED · B to resume':ball.won?'GOAL REACHED · A to restart':tracking,28,158);hudContext.font='21px sans-serif';hudContext.fillText('X: mode   A: reset   B: pause   Left stick: recenter',28,212);hudTexture.needsUpdate=true;hud.material.opacity=1-fade;vrShade.material.opacity=fade?1:1;
 }
}
// Fade geometry also works inside VR, where page overlays are not visible.
const blackout=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),new THREE.MeshBasicMaterial({color:'#10282d',side:THREE.BackSide,transparent:true,depthTest:false}));blackout.renderOrder=100;camera.add(blackout);blackout.visible=false;
renderer.setAnimationLoop((now,frame)=>{
 const dt=Math.min((now-(last||now))/1000,.05);last=now;frameCount++;
 if(renderer.xr.isPresenting)readXR(frame);else desktopInput();
 if(!paused){accumulator+=dt;while(accumulator>=1/120){
  const step=1/120,blend=1-Math.exp(-step/.16);const constrained=limitedTilt(target.x,target.z,settings.limit);tilt.x+=(constrained.x-tilt.x)*blend;tilt.z+=(constrained.z-tilt.z)*blend;Object.assign(tilt,limitedTilt(tilt.x,tilt.z,settings.limit));
  if(!fallWait){ball.step(step,tilt);yaw=faceTravel(yaw,ball.vx,ball.vz,step,settings.turn);if(ball.fallen){fallWait=.001;notify('Through the hole. Returning to the start…')}if(ball.won&&!winAnnounced){winAnnounced=true;notify('Balance found. Goal reached! Keep experimenting.')}}
  else{fallWait+=step;fade=clamp(fallWait/.4,0,1);if(fallWait>.9){reset();fade=1}}
  accumulator-=step;
 }}else accumulator=0;
 if(!fallWait)fade=Math.max(0,fade-dt*2);blackout.visible=renderer.xr.isPresenting&&fade>.01;blackout.material.opacity=fade;
 updateWorld(paused?0:dt);if(now-lastHud>100){updateUI(now);lastHud=now}renderer.render(scene,camera);
});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});
// Deterministic access to the live production model for local verification.
window.tiltLab={get state(){return {x:ball.x,y:ball.y,z:ball.z,vx:ball.vx,vz:ball.vz,speed:ball.speed,tilt:{...tilt},target:{...target},yaw,view,paused,surface:ball.surface,won:ball.won,frameCount,tracking,xr:renderer.xr.isPresenting}},reset,setView,setPaused,ball,settings,renderer};
