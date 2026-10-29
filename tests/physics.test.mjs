import test from 'node:test';
import assert from 'node:assert/strict';
import {Marble,COURSE,RAD,handSlope,faceTravel,ground,limitedTilt,boardNormal} from '../physics.js';
import {Vector3,Quaternion} from '../vendor/three.module.min.js';
const run=(b,seconds,tilt={x:0,z:0})=>{for(let i=0;i<Math.round(seconds*120);i++)b.step(1/120,tilt)};
test('equal-height controllers level the board, including depth-staggered hands',()=>{for(const z of [-.6,0,.6]){const t=handSlope({x:-.3,y:1,z:0},{x:.3,y:1,z});assert.equal(t.x,0);assert.equal(t.z,0)}});
test('higher forward hand and lower rear hand produce backward tilt',()=>{const t=handSlope({x:0,y:1.4,z:-.4},{x:0,y:1,z:.1});assert(t.z>0);assert.equal(t.x,0)});
test('height deadzone, close-hand rejection, and radial maximum',()=>{assert.equal(handSlope({x:0,y:1,z:0},{x:.5,y:1.01,z:0}).x,0);assert.equal(handSlope({x:0,y:1,z:0},{x:.02,y:1.2,z:0}).valid,false);assert(Math.hypot(...Object.values(limitedTilt(1,1,.2)))<=.200001);const t=handSlope({x:0,y:1.8,z:0},{x:.3,y:.2,z:0});assert(Math.hypot(t.x,t.z)<=12*RAD+.00001)});
test('level ground holds a stationary marble',()=>{const b=new Marble();run(b,5);assert.equal(b.speed,0);assert.equal(b.x,0);assert.equal(b.z,16)});
test('tilt accelerates; level board preserves momentum; counter-tilt reverses',()=>{const b=new Marble();run(b,1,{x:0,z:-8*RAD});assert(b.vz<-.9);const initial=b.speed;run(b,1);assert(b.speed>initial*.96);const v=b.vz;run(b,.6,{x:0,z:8*RAD});assert(b.vz>v);assert(b.vz<0);run(b,1,{x:0,z:8*RAD});assert(b.vz>0)});
test('mud has a meaningful start threshold and slows a rolling sphere',()=>{const b=new Marble();b.x=7;b.z=6;run(b,1,{x:2*RAD,z:0});assert.equal(b.speed,0);run(b,1,{x:12*RAD,z:0});assert(b.speed>.2);const c=new Marble();c.x=7;c.z=6;c.vz=-2;run(c,.5);assert(c.speed<1.2)});
test('sphere falls through a hole rather than riding invisible floor',()=>{const b=new Marble(),h=COURSE.holes[0];b.x=h.x;b.z=h.z;run(b,1);assert(b.fallen);assert(b.y<-2.8)});
test('rails and wall contacts prevent passage and reflect velocity',()=>{const b=new Marble();b.x=15;b.vx=3;run(b,.3);assert(b.x<=COURSE.halfX-COURSE.radius);assert(b.vx<0);const c=new Marble();c.x=-9;c.z=14;c.vz=-3;run(c,.5);assert(c.z>12.8);assert(c.vz>0)});
test('ramp height field supports uphill contact and downhill acceleration',()=>{const b=new Marble();b.x=-9;b.z=1.8;b.y=ground(b.x,b.z).h+COURSE.radius;b.vz=-1.5;run(b,.4,{x:0,z:-12*RAD});assert(b.y>COURSE.radius);assert(b.y<3);assert(Number.isFinite(b.vz));const c=new Marble();c.x=-9;c.z=-5;c.y=ground(c.x,c.z).h+COURSE.radius;run(c,.5);assert(c.vz<0)});
test('goal requires settling, not simply crossing at speed',()=>{const b=new Marble();b.x=0;b.z=-17;b.vx=3;run(b,.1);assert(!b.won);b.vx=0;run(b,.8);assert(b.won)});
test('heading follows actual travel, holds at rest and respects yaw-rate cap',()=>{assert.equal(faceTravel(.8,0,0,1),.8);assert.equal(faceTravel(0,0,-2,.1),0);const y=faceTravel(0,0,2,.1,40*RAD);assert(Math.abs(y)<=4*RAD+.00001);assert.equal(faceTravel(0,2,0,1,0),0)});
test('physics trajectory is consistent at different fixed timesteps',()=>{const a=new Marble(),b=new Marble();for(let i=0;i<120;i++)a.step(1/120,{x:.05,z:-.1});for(let i=0;i<240;i++)b.step(1/240,{x:.05,z:-.1});assert(Math.abs(a.z-b.z)<.01);assert(Math.abs(a.vz-b.vz)<.001)});
test('all four keyboard directions and diagonals lower the surface in the acceleration direction',()=>{
 for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const tilt=limitedTilt(x*.15,z*.15,.2),n=boardNormal(tilt),q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(n.x,n.y,n.z));
  const downstream=new Vector3(x,0,z).applyQuaternion(q),upstream=new Vector3(-x,0,-z).applyQuaternion(q);
  assert(downstream.y<upstream.y,`input ${x},${z} must lower the downhill side`);
  const b=new Marble();b.step(1/120,tilt);
  assert(b.vx*x+b.vz*z>0,'sphere must accelerate toward that lower side');
  const worldMotion=new Vector3(b.vx,0,b.vz).applyQuaternion(q);
  assert(worldMotion.y<0,'grounded movement must reduce world height');
 }
});
test('rendered board transform yields the same local gravity used by physics',()=>{
 for(const tilt of [{x:.18,z:0},{x:0,z:-.12},{x:-.1,z:.13}]){
  const n=boardNormal(tilt),q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(n.x,n.y,n.z));
  const localGravity=new Vector3(0,-9.81,0).applyQuaternion(q.clone().invert());
  const b=new Marble();b.step(1/120,tilt);
  assert(Math.abs(b.vx-localGravity.x*5/7/120)<1e-10);
  assert(Math.abs(b.vz-localGravity.z*5/7/120)<1e-10);
 }
});
