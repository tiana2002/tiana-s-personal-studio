// Independent static GLBs. Source sizes are measured from the supplied originals.
// Orientation is checked separately for every outfit; no bones or animations are required.
window.STUDIO_AVATAR_CONFIG={
  defaultOutfit:'casual',height:2.7,cacheLimit:2,mobileCacheLimit:1,
  outfits:{
    lolita:{label:'洛丽塔洋装',model:'./assets/avatar/lolita-70a89fbcc62a.glb',upAxis:'y',yaw:-Math.PI/2,sourceSize:[.443023681640625,1,.6451416015625]},
    casual:{label:'日常穿搭',selectable:false,model:'./assets/avatar/casual-d47b8132e773.glb',upAxis:'y',yaw:-Math.PI/2,sourceSize:[.42529296875,1,.47662353515625]},
    lady:{label:'淑女装',model:'./assets/avatar/lady-2f78973439ed.glb',upAxis:'y',yaw:-Math.PI/2,sourceSize:[.44671630859375,1,.443389892578125]},
    qipao:{label:'旗袍穿搭',model:'./assets/avatar/qipao-f056f5d2b452.glb',upAxis:'y',yaw:-Math.PI/2,sourceSize:[.4613037109375,1,.50726318359375]},
    hanfu:{label:'汉服着装',model:'./assets/avatar/hanfu-2780943137a1.glb',upAxis:'y',yaw:0,sourceSize:[.540557861328125,.979095458984375,.49468994140625]}
  }
};
