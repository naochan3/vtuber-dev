'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(process.argv[2],'utf8');
const source=app.slice(app.indexOf('function render(e){'),app.indexOf('let maskFailed=false;'));
const layer=(bn)=>({bn,visible:true,opacity:1,cur:[0,0]});
const neck=layer('neck'),arm=layer('handwear'),cloth=layer('topwear');
cloth.neckCover=layer('front');cloth.drapeBack=layer('rear');
let frame,updates=[];
const context={layers:[neck,arm,cloth],CW:100,CH:100,maskFailed:false,
  deform:L=>{L.cur=[1,2];},fadeAlpha:()=>1,exportBackground:()=>null,
  status:()=>{throw Error('描画エラーを握りつぶさない');},
  renderer:{positions:(L,p)=>updates.push({L,p}),draw:f=>{frame=f;}}};
vm.createContext(context);vm.runInContext(source,context);
context.render({});
assert.deepEqual(Array.from(frame.items,i=>i.L.bn),['rear','handwear','topwear','neck','front']);
assert.equal(frame.items.filter(i=>i.L===neck).length,1);
assert.equal(updates.filter(i=>i.L===neck).length,1);
assert.deepEqual(updates.find(i=>i.L===neck).p,[1,2]);
cloth.visible=false;updates=[];context.render({});
assert.deepEqual(Array.from(frame.items,i=>i.L.bn),['neck','handwear']);
assert.equal(updates.filter(i=>i.L===neck).length,1);
cloth.visible=true;cloth.opacity=0.3;context.render({});
assert.equal(frame.items.find(i=>i.L===cloth.neckCover).alpha,0.3);
assert.equal(frame.items.find(i=>i.L===neck).alpha,1);
cloth.opacity=0.001;context.render({});
assert.deepEqual(Array.from(frame.items,i=>i.L.bn),['neck','handwear']);
console.info('首・襟・腕・背面布の描画順、毎フレームの首更新、衣装非表示の検査に合格');
