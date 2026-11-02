// v2.0 layout baseline 1: anchors shared by geometry, picking and camera views.
// Future asset replacements must preserve layout-baseline.json and its camera framing.
(function(){
  const groups={
    architecture:{from:[0,0,0],to:[0,0,0],scale:[1.08,1.08,1.14]},
    books:{from:[-3.45,0,-2.92],to:[-4.83,0,-.45],scale:[1.25,1.02,1.10],yaw:Math.PI/2},
    desk:{from:[2.13,0,-1.63],to:[-1.05,0,-3.35],scale:[1.55,1.12,1.14]},
    wardrobe:{from:[-3.74,0,1.50],to:[-4.60,0,2.38],scale:[1.15,1.12,1.22],yaw:Math.PI/2},
    mirror:{from:[-2.15,0,2.21],to:[-3.48,0,3.30],scale:[1,1.04,1],yaw:Math.PI/6},
    dressSeat:{from:[-3.10,0,2.65],to:[-3.25,0,2.35],scale:[1.08,1.05,1.08]},
    creative:{from:[3.48,0,1.73],to:[3.25,0,-3.63],scale:[1.45,1.02,1.35]},
    window:{from:[2.65,2.58,-3.60],to:[-5.20,2.35,-3.20],scale:[.76,1.53,1],yaw:Math.PI/2},
    board:{from:[-.44,0,-3.55],to:[-.80,.33,-4.03],scale:[1.60,1,1]},
    rug:{from:[.10,0,.72],to:[0,0,1.15],scale:[1.15,1,1.52]},
    living:{from:[1.28,0,2.51],to:[.55,0,.70],scale:[1.25,1.20,1.25],yaw:-Math.PI/2},
    plantBack:{from:[4.28,0,-2.48],to:[4.90,0,-3.48],scale:[.65,.75,.65]},
    plantFront:{from:[3.92,0,2.72],to:[4.45,0,-2.55],scale:[.8,.85,.8]},
    floorLamp:{from:[.95,0,-2.90],to:[-3.77,0,-3.45],scale:[.8,1.12,.8]},
    archive:{from:[-1.62,0,-2.10],to:[-4.08,0,-.55],scale:[1.05,1,1.05]}
  };
  function point(name,p){const g=groups[name];if(!g)return [...p];const q=p.map((v,i)=>(v-g.from[i])*g.scale[i]),a=g.yaw||0,c=Math.cos(a),s=Math.sin(a);return [g.to[0]+q[0]*c+q[2]*s,g.to[1]+q[1],g.to[2]-q[0]*s+q[2]*c]}
  function normal(name,n){const g=groups[name];if(!g)return [...n];const q=n.map((v,i)=>v/g.scale[i]),a=g.yaw||0,c=Math.cos(a),s=Math.sin(a),v=[q[0]*c+q[2]*s,q[1],-q[0]*s+q[2]*c],d=Math.hypot(...v)||1;return v.map(x=>x/d)}
  const views={
    panorama:{theta:.80,elevation:.58,zoom:1,center:[0,1.64,.10]},
    work:{theta:.98,elevation:.56,zoom:1.65,center:[-.85,1.90,-2.90]},
    books:{theta:.62,elevation:.50,zoom:1.65,center:[-4.20,1.90,-.60]},
    wardrobe:{theta:.70,elevation:.50,zoom:1.70,center:[-3.80,1.65,2.40]},
    creative:{theta:.94,elevation:.54,zoom:1.75,center:[3.15,1.25,-3.15]},
    living:{theta:.80,elevation:.70,zoom:1.70,center:[.20,.65,1.20]}
  };
  const frames=[
    {point:[1.65,3.00,-4.04],width:.58,height:.74,side:false},
    {point:[2.70,3.10,-4.04],width:.56,height:.72,side:false},
    {point:[4.05,2.85,-4.04],width:.60,height:.78,side:false}
  ];
  window.STUDIO_LAYOUT={version:'2.0-layout-baseline-1',groups,point,normal,views,frames,viewHeight:11.60,
    compactLabelOffsets:{skills:[0,-24],computer:[-10,-4],creative:[-8,44]},
    points:{books:point('books',[-3.45,2.85,-2.48]),computer:point('desk',[2.15,2.17,-1.55]),skills:point('board',[-.45,2.75,-3.41]),creative:point('creative',[3.5,1.85,1.75]),wardrobe:point('wardrobe',[-3.65,2.35,1.65]),phone:point('desk',[2.96,1.50,-1.14])}
  };
})();
