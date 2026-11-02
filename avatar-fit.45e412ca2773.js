/* Shared full-body framing math. Fits a cylinder for every horizontal viewing angle. */
(function(){
  'use strict';
  function envelope(outfits,height=2.7){
    let radius=0;
    for(const item of Object.values(outfits)){
      const size=item.sourceSize;
      if(!Array.isArray(size)||size.length!==3||size.some(v=>!Number.isFinite(v)||v<=0))throw Error('人物尺寸配置无效');
      const axis=item.upAxis==='x'?0:item.upAxis==='z'?2:1;
      const cross=size.filter((_,i)=>i!==axis);
      radius=Math.max(radius,Math.hypot(...cross)/2/size[axis]*height);
    }
    return {height,radius};
  }
  function distance({height,radius},aspect,fov,polar=Math.PI/2){
    const tangent=Math.tan(fov*Math.PI/360),halfVertical=height/2*Math.sin(polar)+radius*Math.abs(Math.cos(polar));
    const depth=height/2*Math.abs(Math.cos(polar))+radius*Math.sin(polar);
    return (Math.max(halfVertical/tangent,radius/(tangent*Math.max(.1,aspect)))+depth)*1.035;
  }
  window.STUDIO_AVATAR_FIT={envelope,distance};
})();
