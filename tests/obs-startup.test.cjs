'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(process.argv[2],'utf8'),RT=require(path.resolve(process.argv[3]));
const stem=process.argv[4],psd='avatars/'+stem+'.psd',settings='avatars/'+stem+'.rig.json';
const start=app.slice(app.indexOf('// ---------- start ----------'),app.indexOf('requestAnimationFrame(tick);',app.indexOf('// ---------- start ----------')))
  .replace('(async()=>{','globalThis.boot=(async()=>{');
const after=app.slice(app.indexOf('async function afterObsModel(){'),app.indexOf('const obsUrl='));
async function boot(query,serverModel=null,alreadyLoaded=false){
  const loaded=[],context={OBS_MODE:true,CAMERA_MODE:false,QUERY:new URLSearchParams(query),RT,auto:{},
    layers:alreadyLoaded?[{}]:[],relayLoadingId:null,
    sync:{ready:Promise.resolve(),status:{relay:!!serverModel,serverModel},listen:()=>{}},
    fetchSource:url=>url,loadModel:async(url)=>{loaded.push(url);context.layers=[{}];},
    loadSample:()=>{throw Error('公式サンプルを表示してしまった');},
    loadFromRelay:async(id)=>{loaded.push('relay:'+id);context.layers=[{}];}};
  vm.createContext(context);vm.runInContext(start,context);await context.boot;return loaded;
}
async function configure(query,relay=false,state=null,switchModel=false){
  const fetched=[],applied=[],errors=[],context={QUERY:new URLSearchParams(query),RT,modelName:stem+'.psd',
    modelId:'initial',relayLoadingId:null,pendingRemoteState:null,layers:[{}],
    sync:{status:{relay},fetchState:async()=>state},receiveState:s=>applied.push('remote'),
    fetch:async(url)=>{fetched.push(url);return{ok:true,json:async()=>{if(switchModel)context.modelId='changed';return{};}};},
    applySettings:(data,options)=>applied.push(options.anyModel?'explicit':'default'),status:m=>errors.push(m)};
  vm.createContext(context);vm.runInContext(after,context);await context.afterObsModel();return{fetched,applied,errors};
}
(async()=>{
  assert.deepEqual(await boot(''),[psd]);
  assert.deepEqual(await boot('model=avatars/custom.psd'),['avatars/custom.psd']);
  assert.deepEqual(await boot('',{id:'existing'}),['relay:existing']);
  assert.deepEqual(await boot('',null,true),[]);
  assert.deepEqual((await configure('')).fetched,[settings]);
  assert.deepEqual((await configure('')).applied,['default']);
  assert.deepEqual((await configure('settings=avatars/custom.json')).applied,['explicit']);
  assert.deepEqual((await configure('',true,{settings:{modelId:'initial'}})).applied,['remote']);
  assert.deepEqual((await configure('',true,null)).fetched,[settings]);
  assert.deepEqual((await configure('',false,null,true)).applied,[]);
  assert.ok(app.includes('&model='+psd+'&settings='+settings));
  console.info('OBS既定素材・設定、コピーURL、既存中継の優先、途中切替の保護: 合格');
})().catch(error=>{console.error(error);process.exitCode=1;});
