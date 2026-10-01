// 色や1280px座標に依存せず、マスクの分配・別モデル・別解像度を検査する。
const assert=require('node:assert/strict');
const path=require('node:path');
const O=require(path.resolve(process.argv[2]));
const profile={version:1,model_id:'abc-def-123',layer:'topwear',
  collar_front:[[[.25,.25],[.75,.25],[.75,1],[.25,1]]],
  rear_cloth:[[[0,.5],[.2,.5],[.2,1],[0,1]]]};
const image={width:100,height:100,data:new Uint8ClampedArray(100*100*4)};
for(let i=0;i<image.data.length;i+=4)image.data.set([91,33,201,128],i);
const initial=new Uint8ClampedArray(image.data);
assert.equal(O.split(image,{bn:'topwear',x:0,y:0},{w:100,h:100},'other-def-123',profile),null);
assert.equal(O.split(image,{bn:'face',x:0,y:0},{w:100,h:100},profile.model_id,profile),null);
const parts=O.split(image,{bn:'topwear',x:0,y:0},{w:100,h:100},profile.model_id,profile);
assert.deepEqual(image.data,initial,'元画素は変更しない');
for(let i=0;i<initial.length;i+=4){
  for(const data of Object.values(parts))assert.deepEqual(data.slice(i,i+3),initial.slice(i,i+3));
  const composed=255*(1-(1-parts.back[i+3]/255)*(1-parts.front[i+3]/255)*(1-parts.rear[i+3]/255));
  assert.ok(Math.abs(composed-initial[i+3])<=2,'重ね描き後のアルファを保持する');
}
assert.equal(parts.front[(50*100+50)*4+3],128,'襟の前面');
assert.equal(parts.back[(10*100+50)*4+3],128,'襟の背面');
assert.equal(parts.rear[(80*100+10)*4+3],128,'腕の背面の布');
for(const scale of [1,2,3]){
  assert.equal(O.coverage(50*scale,50*scale,profile.collar_front,100*scale,100*scale),1);
  assert.equal(O.coverage(10*scale,10*scale,profile.collar_front,100*scale,100*scale),0);
}
const invalid={...profile,collar_front:[[[0,0],[1,0],[NaN,1]]]};
assert.throws(()=>O.validate(invalid));
const overlap={...profile,rear_cloth:profile.collar_front};
const masked=O.split(image,{bn:'topwear',x:0,y:0},{w:100,h:100},profile.model_id,overlap);
assert.equal(masked.front[(50*100+50)*4+3],0,'背面へ分けた画素を重ね描きしない');
process.stdout.write('画像別マスク: 色の保持・アルファ分配・モデル分離・解像度・重複・不正入力: 合格\n');
