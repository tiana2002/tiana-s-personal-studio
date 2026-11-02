(function(){
 'use strict';
 window.STUDIO_EXPLORATION={
  welcome:'试试点击房间里的小猫、相框、文件夹和手机，发现更多惊喜吧！',
  timing:{initialDelay:5000,showFor:3500,gap:[15000,25000],resumeDelay:12000,retryAfter:4000,previewFor:3500,pointerRecent:800,welcomeFor:7500,speechFor:4200,fadeFor:200},
  greetings:['嗨，欢迎来到我的小工作室！','今天也来看看我的小世界吧～','这里藏着不少有趣的小东西哦！','慢慢探索，说不定会有惊喜～'],
  outfits:{lolita:'今天换上了洛丽塔～',lady:'今天走温柔淑女风～',qipao:'换一身东方韵味～',hanfu:'今天穿汉服啦～',casual:'换回日常穿搭啦～'},
  objects:[
   {id:'cat',icon:'cat',title:'小猫咪',hint:'点我打招呼',invite:'和它打招呼',selector:'.cat-target',prompt:'点击和它打招呼',description:'点击工作室里的三花小猫，看看它有什么回应。'},
   {id:'photo-frame',icon:'photo',title:'小相框',hint:'点我看看照片',invite:'看看生活照片',selector:'.album-target',prompt:'点击看看我的生活照片',description:'点击墙面相框，浏览我的生活照片。'},
   {id:'awards-folder',icon:'folder',title:'小文件夹',hint:'点我看看获奖情况',invite:'发现获奖记录',selector:'.award-target',prompt:'点击看看我的获奖记录',description:'点击文件夹，查看个人获奖情况。'},
   {id:'phone',icon:'phone',title:'小手机',hint:'点我看看抖音主页～',invite:'看看我的抖音主页',selector:'.phone-target',prompt:'点击看看我的抖音主页',description:'点击桌面手机，探索我的抖音主页。'}
  ]
 };
})();
