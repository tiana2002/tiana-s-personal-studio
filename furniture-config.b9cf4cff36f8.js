// Fixed room anchors. Asset copies are local; repeated frames/plants share one loaded GLB.
(function(){
const frames=window.STUDIO_LAYOUT.frames;
const wallOrder=frames.map((frame,index)=>index).sort((a,b)=>a-b);
const frameAsset=index=>wallOrder.indexOf(index)%2?'frame2':'frame1';
window.STUDIO_FURNITURE_CONFIG={
  items:[{
    id:'taskboard',name:'能力任务板',model:'./assets/furniture/taskboard-447aa79d33c4.glb',
    replaceGroup:'board',action:'skills',
    position:[-1.55,2.95,-4.1909],rotation:[0,-Math.PI/2,0],
    fitSize:[3.904,1.403],scale:1,attach:'back',hitShape:'bounds',
    label:{placement:'above',gap:6},
    inspectionView:{theta:1.35,elevation:.34,zoom:3.25,center:[-.80,2.78,-4.02]}
  },
  {id:'desk',name:'电脑桌',asset:'desk',action:'computer',stage:'office',position:[-1.05,.032,-3.35],dimensions:[4.20,1.308,1.42],rotation:[0,0,0],attach:'floor'},
  {id:'chair',name:'电脑椅',asset:'chair',action:'computer',stage:'office',position:[-1.05,.032,-1.98],dimensions:[1.10,1.48,1.14],rotation:[0,Math.PI/2,0],attach:'floor'},
  {id:'monitor',name:'电脑显示器',asset:'monitor',action:'computer',stage:'office',position:[-1.17,1.34,-3.52],dimensions:[1.85,1.14,.42],rotation:[0,0,0],attach:'floor'},
  {id:'keyboard',name:'奶油色键盘',asset:'keyboard',action:'computer',stage:'office',position:[-1.28,1.34,-3.00],dimensions:[1.28,.13,.43],rotation:[0,0,0],attach:'floor'},
  {id:'lamp',name:'台灯',asset:'lamp',action:'computer',stage:'office',position:[-2.65,1.34,-3.58],dimensions:[.66,1.176,.66],rotation:[0,0,0],attach:'floor'},
  {id:'bookcase',name:'研究书架',asset:'bookcase',action:'books',replaceGroup:'books',position:[-4.82,.032,-.52],dimensions:[.90,3.50,2.90],rotation:[0,0,0],attach:'floor'},
  {id:'folders',name:'文件夹',asset:'folders',action:'awards',label:{placement:'target'},replaceGroup:'archiveDecor',position:[1.56,1.23,-3.55],dimensions:[.38,.48,.36],rotation:[0,0,0],attach:'floor'},
  {id:'wardrobe',name:'衣柜',asset:'wardrobe',action:'wardrobe',replaceGroup:'wardrobe',position:[-4.60,.032,2.21],dimensions:[1.20,3.20,2.45],rotation:[0,0,0],attach:'floor'},
  {id:'mirror',name:'穿衣镜',asset:'mirror',action:'wardrobe',replaceGroup:'mirror',position:[-5.00,.032,3.85],dimensions:[.30,2.85,.80],rotation:[0,0,0],attach:'floor'},
  {id:'rug',name:'中央地毯',asset:'rug',replaceGroup:'rug',position:[.55,.032,1.35],dimensions:[5.20,.065,4.60],rotation:[0,0,0],attach:'floor'},
  {id:'table',name:'圆茶几',asset:'table',stage:'living',position:[1.65,.097,.05],dimensions:[1.9656,1.387152,1.9656],rotation:[0,0,0],attach:'floor'},
  {id:'sofa',name:'懒人沙发',asset:'sofa',stage:'living',position:[1.45,.097,2.03],dimensions:[1.872,.9216,1.872],rotation:[0,0,0],attach:'floor'},
  {id:'display',name:'创作展示架',asset:'display',action:'creative',replaceGroup:'creative',position:[3.28,.032,-3.63],dimensions:[2.50,2.75,.96],rotation:[0,-Math.PI/2,0],attach:'floor'},
  {id:'plantBack',name:'后方盆栽',asset:'plant1',replaceGroup:'plantBack',position:[4.90,.032,-3.48],dimensions:[.62,1.25,.65],rotation:[0,0,0],attach:'floor'},
  {id:'plantFront',name:'前方盆栽',asset:'plant2',replaceGroup:'plantFront',position:[4.45,.032,-2.55],dimensions:[.56,.68,.56],rotation:[0,0,0],attach:'floor'},
  {id:'window',name:'窗框',asset:'window',replaceGroup:'window',position:[-5.205,2.35,-3.10],dimensions:[.17,2.52,2.10],rotation:[0,0,0],attach:'center'},
  // Wall order is physical left-to-right (ascending world X), never incidental mesh order.
  ...frames.map((frame,index)=>({id:'album'+index,name:'生活相框'+(index+1),asset:frameAsset(index),action:'album:'+index,albumIndex:index,
    // Final frame calibration, after all room assets are placed: 1 → 2 → 1.
    position:[.21,[3.22,2.57,1.92][index],-4.1909],dimensions:[frameAsset(index)==='frame2'?.48:.45,.56,.09],rotation:[0,frameAsset(index)==='frame2'?0:-Math.PI/2,0],attach:'back',photo:{width:frameAsset(index)==='frame2'?.55:.68,height:.70,front:.99}}))
  ].map(item=>({...item,model:item.model||{"bookcase":"./assets/furniture/bookcase-2e481ea60d02.glb","chair":"./assets/furniture/chair-99ffee5071c6.glb","desk":"./assets/furniture/desk-9a3173824463.glb","display":"./assets/furniture/display-6b2a99003f28.glb","folders":"./assets/furniture/folders-2dc1c5c1589e.glb","frame1":"./assets/furniture/frame1-93a298539c39.glb","frame2":"./assets/furniture/frame2-f182e88706df.glb","keyboard":"./assets/furniture/keyboard-6dd3c49ad4c7.glb","lamp":"./assets/furniture/lamp-035671606426.glb","mirror":"./assets/furniture/mirror-5e4e91042b4a.glb","monitor":"./assets/furniture/monitor-39dc88f87462.glb","plant1":"./assets/furniture/plant1-66cbc6e8e2b3.glb","plant2":"./assets/furniture/plant2-86ff92953b17.glb","rug":"./assets/furniture/rug-95d6eb5fd0fe.glb","sofa":"./assets/furniture/sofa-d1d19ce63f12.glb","table":"./assets/furniture/table-9ecbd67c4163.glb","taskboard":"./assets/furniture/taskboard-447aa79d33c4.glb","wardrobe":"./assets/furniture/wardrobe-033356ad26d4.glb","window":"./assets/furniture/window-de1933c551c1.glb"}[item.asset],hitShape:item.hitShape||'bounds'}))
};
})();


