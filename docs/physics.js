// Board-local coordinates: +x right, -z forward. No dependence on camera yaw.
export const RAD=Math.PI/180;
export const COURSE={halfX:16,halfZ:22,radius:.78,start:{x:0,z:16},goal:{x:0,z:-17,r:2.1},holes:[{x:-4.5,z:7,r:1.55},{x:3,z:-2,r:1.6},{x:-2,z:-10,r:1.45},{x:9,z:-12,r:1.5}],mud:{x:7,z:6,w:6,d:6},ramps:[{x:-9,z:-3,w:5,d:10,h:1.8},{x:8,z:-4,w:4,d:6,h:1.05}],walls:[{x:-9,z:12,w:7,d:.55},{x:5,z:-8,w:6,d:.55}]};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function handSlope(a,b,{sensitivity=.65,limit=12*RAD,deadzone=.018}={}){
 const dx=b.x-a.x,dz=b.z-a.z,dh=a.y-b.y,len=Math.hypot(dx,dz);
 if(len<.14||Math.hypot(dx,dh,dz)>1.8)return {x:0,z:0,valid:false};
 const delta=Math.max(0,Math.abs(dh)-deadzone)*Math.sign(dh);
 if(!delta)return {x:0,z:0,valid:true};
 const angle=clamp(Math.atan2(delta,len)*sensitivity,-limit,limit);
 return {x:dx/len*angle,z:dz/len*angle,valid:true};
}
export function limitedTilt(x,z,limit){const n=Math.hypot(x,z);return n>limit?{x:x/n*limit,z:z/n*limit}:{x,z}}
export function ground(x,z){
 if(Math.abs(x)>COURSE.halfX||Math.abs(z)>COURSE.halfZ)return null;
 for(const h of COURSE.holes)if(Math.hypot(x-h.x,z-h.z)<h.r-.12)return null;
 for(const r of COURSE.ramps){const dz=z-r.z;if(Math.abs(x-r.x)<r.w/2&&Math.abs(dz)<r.d/2){const sign=Math.sign(dz)||1;return {h:r.h*(1-Math.abs(dz)/(r.d/2)),sx:0,sz:-sign*r.h/(r.d/2),surface:'Ramp'}}}
 const m=COURSE.mud;return {h:0,sx:0,sz:0,surface:Math.abs(x-m.x)<m.w/2&&Math.abs(z-m.z)<m.d/2?'Mud':'Porcelain'};
}
export class Marble{
 constructor(){this.reset()}
 reset(){this.x=COURSE.start.x;this.z=COURSE.start.z;this.y=COURSE.radius;this.vx=0;this.vy=0;this.vz=0;this.grounded=true;this.surface='Porcelain';this.fallen=false;this.won=false;this.goalTime=0;this.time=0}
 get speed(){return Math.hypot(this.vx,this.vz)}
 step(dt,tilt){
  this.time+=dt;const oldX=this.x,oldZ=this.z,oldY=this.y;
  const t=Math.hypot(tilt.x,tilt.z),k=t?9.81*Math.sin(t)/t:9.81;
  const gx=k*tilt.x,gz=k*tilt.z,gy=-9.81*Math.cos(t);
  const s=ground(this.x,this.z);
  this.grounded=!!s&&this.y<=s.h+COURSE.radius+.055&&this.vy<=(s.sx*this.vx+s.sz*this.vz)+.8;
  if(this.grounded){
   this.y=s.h+COURSE.radius;this.surface=s.surface;
   // Gravity projected onto the contact tangent, solid-sphere inertia 5/7.
   const nn=1+s.sx*s.sx+s.sz*s.sz,dot=(-s.sx*gx+gy-s.sz*gz)/nn;
   let ax=(gx+s.sx*dot)*5/7,az=(gz+s.sz*dot)*5/7;
   const mud=s.surface==='Mud',resistance=mud?1.05:.012,accel=Math.hypot(ax,az),v=this.speed;
   if(v<.025&&accel<resistance){this.vx=0;this.vz=0;ax=az=0}
   else if(v>.0001){const loss=Math.min(v,resistance*dt);this.vx*=1-loss/v;this.vz*=1-loss/v}
   this.vx+=ax*dt;this.vz+=az*dt;
   if(mud){const drag=Math.exp(-1.15*dt);this.vx*=drag;this.vz*=drag}
   this.vy=s.sx*this.vx+s.sz*this.vz;
  }else{this.surface='Air';this.vx+=gx*dt;this.vz+=gz*dt;this.vy+=gy*dt}
  this.x+=this.vx*dt;this.z+=this.vz*dt;this.y+=this.vy*dt;
  // Sphere-to-box side contacts, including ramp side faces.
  if(!this.fallen){
   for(const w of COURSE.walls)this.collideBox(w,.95,oldX,oldZ);
   for(const r of COURSE.ramps){const h=r.h*(1-clamp(Math.abs(this.z-r.z)/(r.d/2),0,1));if(this.y-COURSE.radius<h-.13)this.collideBox(r,h,oldX,oldZ)}
   // Outer rails have actual collisions; holes remain open.
   if(this.y>-.1){const boundX=COURSE.halfX-COURSE.radius,boundZ=COURSE.halfZ-COURSE.radius;
    if(Math.abs(this.x)>boundX){this.x=clamp(this.x,-boundX,boundX);this.vx*=-.22}
    if(Math.abs(this.z)>boundZ){this.z=clamp(this.z,-boundZ,boundZ);this.vz*=-.22}}
  }
  const next=ground(this.x,this.z);
  if(next&&oldY>=next.h+COURSE.radius-.15&&this.y<=next.h+COURSE.radius&&this.vy<=0){this.y=next.h+COURSE.radius;this.vy=0;this.grounded=true;this.surface=next.surface}
  if(this.y<-2.8)this.fallen=true;
  const g=COURSE.goal;
  this.goalTime=next&&Math.hypot(this.x-g.x,this.z-g.z)<g.r-.3&&this.speed<.6?this.goalTime+dt:0;
  if(this.goalTime>.65)this.won=true;
 }
 collideBox(w,height,oldX,oldZ){
  if(this.y-COURSE.radius>height)return;
  const nx=clamp(this.x,w.x-w.w/2,w.x+w.w/2),nz=clamp(this.z,w.z-w.d/2,w.z+w.d/2),dx=this.x-nx,dz=this.z-nz,d=Math.hypot(dx,dz),r=COURSE.radius;
  if(d>=r)return;
  let ux,uz;
  if(d>.00001){ux=dx/d;uz=dz/d;this.x+=ux*(r-d);this.z+=uz*(r-d)}
  else{const a=Math.abs(oldX-w.x)-w.w/2,b=Math.abs(oldZ-w.z)-w.d/2;if(a>b){ux=Math.sign(oldX-w.x)||1;uz=0;this.x=w.x+ux*(w.w/2+r)}else{ux=0;uz=Math.sign(oldZ-w.z)||1;this.z=w.z+uz*(w.d/2+r)}}
  const vn=this.vx*ux+this.vz*uz;if(vn<0){this.vx-=1.22*vn*ux;this.vz-=1.22*vn*uz}
 }
}
export function faceTravel(current,vx,vz,dt,maxRate=40*RAD){if(Math.hypot(vx,vz)<.12)return current;const target=Math.atan2(-vx,-vz),delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+clamp(delta,-maxRate*dt,maxRate*dt)}
