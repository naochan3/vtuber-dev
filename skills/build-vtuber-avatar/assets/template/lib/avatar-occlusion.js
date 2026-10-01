/* Anime2.5DRigの画像別の前後マスク。元画素を再描画せずアルファだけ分配する。 */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AvatarOcclusion=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function validate(profile){
    if(profile===null)return null;
    if(!profile||profile.version!==1||typeof profile.model_id!=='string'||
       !/^[0-9a-f]{1,16}-[0-9a-f]{1,8}-[0-9a-f]{1,8}$/.test(profile.model_id)||
       profile.layer!=='topwear')throw new Error('画像別マスクの識別情報が不正です');
    for(const key of ['collar_front','rear_cloth']){
      const polygons=profile[key];
      if(!Array.isArray(polygons)||polygons.length>32)throw new Error('マスクの領域数が不正です');
      for(const polygon of polygons){
        if(!Array.isArray(polygon)||polygon.length<3||polygon.length>256||
           polygon.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))
          throw new Error('マスクの頂点は画像全体の0〜1の座標で指定してください');
      }
    }
    return profile;
  }
  function coverage(x,y,polygons,width,height){
    let union=0;
    for(const polygon of polygons){
      let inside=false,distance=Infinity;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[i],b=polygon[j],ax=a[0]*width,ay=a[1]*height,bx=b[0]*width,by=b[1]*height;
        if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
        const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
        distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
      }
      const v=Math.max(0,Math.min(1,.5+(inside?distance:-distance)/2));
      union=Math.max(union,v*v*(3-2*v));
    }
    return union;
  }
  function split(image,layer,canvas,modelId,profile){
    validate(profile);
    if(!profile||profile.model_id!==modelId||profile.layer!==layer.bn)return null;
    if(!(canvas.w>0&&canvas.h>0))throw new Error('マスクの画像寸法が不正です');
    const back=new Uint8ClampedArray(image.data),front=new Uint8ClampedArray(image.data),rear=new Uint8ClampedArray(image.data);
    for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
      const index=(y*image.width+x)*4+3,px=layer.x+x,py=layer.y+y;
      const r=coverage(px,py,profile.rear_cloth,canvas.w,canvas.h);
      const f=coverage(px,py,profile.collar_front,canvas.w,canvas.h);
      const alpha=image.data[index]/255,ra=alpha*r,fa=alpha*(1-r)*f,remaining=(1-ra)*(1-fa);
      // 通常の重ね描きでも元のアルファを再現し、境界の透明な筋を避ける。
      back[index]=remaining>0?255*(1-(1-alpha)/remaining):0;
      front[index]=255*fa;rear[index]=255*ra;
    }
    return {back,front:profile.collar_front.length?front:null,rear:profile.rear_cloth.length?rear:null};
  }
  return {validate,coverage,split};
});
