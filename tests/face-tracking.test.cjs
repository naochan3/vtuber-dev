// 奥行きを使ううなずき、眉・まばたきの分離、旧設定の互換性を検査。
const assert = require('node:assert/strict');
const path = require('node:path');
const FF = require(path.resolve(process.argv[2]));
const I = FF.INDEX;
function face(pitch=0,roll=0,scale=1,dx=0,dy=0){
  const lm=Array.from({length:468},()=>({x:.5,y:.5,z:0}));
  const put=(i,x,y,z=0)=>{
    const py=y*Math.cos(pitch)-z*Math.sin(pitch),pz=y*Math.sin(pitch)+z*Math.cos(pitch);
    lm[i]={x:.5+dx+scale*(x*Math.cos(roll)-py*Math.sin(roll)),
      y:.5+dy+scale*(x*Math.sin(roll)+py*Math.cos(roll)),z:scale*pz};
  };
  put(I.forehead,0,-.25);put(I.chin,0,.25);put(I.nose,0,.05,-.1);
  put(I.cheekR,-.2,0);put(I.cheekL,.2,0);
  for(const [side,cx] of [[I.eyeR,-.1],[I.eyeL,.1]]){
    put(side.outer,cx-.04,-.05);put(side.inner,cx+.04,-.05);
    put(side.top,cx,-.062);put(side.bottom,cx,-.038);
  }
  for(const [ids,cx] of [[I.browR,-.1],[I.browL,.1]])ids.forEach((i,j)=>put(i,cx+(j-2)*.015,-.12));
  put(I.mouth.top,0,.12);put(I.mouth.bottom,0,.124);put(I.mouth.right,-.05,.12);put(I.mouth.left,.05,.12);
  return lm;
}
const options={...FF.DEFAULT_OPTIONS,headGain:1.6,linkEyes:false};
const n=FF.calibrate([FF.measure(face(),1)]);
const params=lm=>FF.toParams(FF.measure(lm,1),n,options);
assert.ok(Math.abs(params(face()).ay)<1e-12);
for(const angle of [-.15,.15]){
  const out=params(face(angle));
  assert.ok(Math.sign(out.ay)===-Math.sign(angle));
  assert.ok(Math.abs(out.ay)>.5&&Math.abs(out.ay)<.65,'約9度のうなずきを見える動きへ');
  assert.ok(Math.abs(out.ay-params(face(angle,.5,.6,.1,-.1)).ay)<1e-10,'傾き・顔の大きさ・位置に依存しない');
}
const aspectFace=face(.15).map(p=>({...p,x:p.x/(16/9),z:p.z/(16/9)}));
assert.ok(Math.abs(FF.toParams(FF.measure(aspectFace,16/9),n,options).ay-params(face(.15)).ay)<1e-10);
const wink=face();wink[I.eyeR.top].y=wink[I.eyeR.bottom].y=.45;
assert.ok(Math.abs(params(wink).br)<1e-10,'まばたきで眉を動かさない');
assert.equal(params(wink).eL,0);assert.equal(params(wink).eR,1);
assert.ok(Math.abs(params(face(0,.5)).br)<1e-10,'首の傾きで眉を動かさない');
const lifted=face();for(const i of [...I.browR,...I.browL])lifted[i].y-=.005;
assert.ok(params(lifted).br>.5,'小さな眉上げに反応');
assert.equal(FF.toParams(FF.measure(lifted,1),n,{...options,trackBrow:false}).br,0);
const old={...FF.DEFAULT_NEUTRAL};
const flat={...old,pitch:old.pitch+.04,hasIris:false};
assert.ok(Math.abs(FF.toParams(flat,old,options).ay+.352)<1e-12,'奥行きなし入力は画像比率へ戻す');
const tracker=new FF.Tracker(options);tracker.setCalibration(old);
assert.ok(Number.isFinite(tracker.update(face(.15),1,1).ay));
assert.deepEqual(tracker.neutral,old,'旧正面記録を上書きしない');
tracker.startCalibration();tracker.update(face(),2,1);const saved=tracker.finishCalibration();
assert.ok(Number.isFinite(saved.pitchDepth)&&Number.isFinite(saved.browStableL));
const reloaded=new FF.Tracker(options);reloaded.setCalibration(JSON.parse(JSON.stringify(saved)));
assert.ok(Math.abs(reloaded.update(face(),1,1).ay)<1e-12);
process.stdout.write('うなずきの奥行き・縦横比・移動/拡縮/傾き、眉とまばたきの分離、旧設定引継ぎ: 合格\n');
