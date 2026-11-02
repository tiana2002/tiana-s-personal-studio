/* Incremental office pilot. Original room geometry, shaders, hit regions and camera behavior
   are reused; only the desk group is replaced after a local GLB loads successfully. */
(function(){
  'use strict';
  const Native=window.Studio3D,L=window.STUDIO_LAYOUT,G=window.STUDIO_GEOMETRY;
  const vendor='./vendor/three/package/';
  class OfficeRoom extends Native{
    init(){
      this.destroyed=false;this.materials=[];this.textures=[];this.dirty=true;
      this.canvas.dataset.renderer='loading';this.canvas.dataset.office='loading';
      this.ready=this.initThree().catch(error=>this.useNativeFallback(error));
    }
    async initThree(){
      const options=new URLSearchParams(window.location.search);
      this.baseline=false;
      this.excludedGroups=new Set(['dressSeat','archive','archiveDecor','floorLamp']);
      if(['cat','taskboard','walls','window','research','office','rest','creation','wardrobeDetail','targetA','targetB','alternate'].includes(options.get('view'))){
        const inspection={cat:{theta:.80,elevation:.44,zoom:3.3,center:[-2.90,.64,1.90]},targetA:{theta:.15,elevation:.52,zoom:1.12,center:[0,1.65,0]},targetB:{theta:1.42,elevation:.54,zoom:1.12,center:[0,1.65,0]},alternate:{theta:1.05,elevation:.88,zoom:1.05,center:[0,1.65,0]},wardrobeDetail:{theta:.50,elevation:.44,zoom:1.55,center:[-4.35,1.7,2.6]},window:{theta:.32,elevation:.38,zoom:2.20,center:[-5.05,2.40,-3.15]},walls:{theta:1.34,elevation:.37,zoom:2.10,center:[.2,2.85,-3.95]},research:{theta:.62,elevation:.50,zoom:1.42,center:[-4.08,1.90,1.20]},office:L.views.work,rest:L.views.living,creation:L.views.creative};
        const view=options.get('view')==='taskboard'?window.STUDIO_FURNITURE_CONFIG?.items.find(item=>item.id==='taskboard')?.inspectionView:inspection[options.get('view')];
        if(view){Object.assign(this,{theta:view.theta,elevation:view.elevation,zoom:view.zoom,center:[...view.center]});this.target={...view,center:[...view.center]};}
      }
      if(options.get('rendererFailure')==='1')throw Error('Development fallback check');
      const T=await import(vendor+'build/three.module.js');if(this.destroyed)return;
      this.T=T;this.viewProjection=new T.Matrix4();this.roomScene=new T.Scene();
      this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.25:2));
      this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;
      this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.VSMShadowMap;
      this.renderer.shadowMap.autoUpdate=false;
      this.camera=new T.OrthographicCamera(-1,1,1,-1,.1,80);
      this.defaultTexture=new T.DataTexture(new Uint8Array([222,201,177,255]),1,1,T.RGBAFormat);
      this.defaultTexture.needsUpdate=true;this.textures.push(this.defaultTexture);
      this.staticMesh=G.buildRoom({exclude:[...this.excludedGroups]});this.roomObject=this.legacyObject(this.staticMesh);this.roomScene.add(this.roomObject);
      this.phoneMesh=G.buildPhone();this.phoneObject=this.legacyObject(this.phoneMesh);this.phoneObject.renderOrder=3;this.phoneObject.castShadow=true;this.roomScene.add(this.phoneObject);
      this.initAlbumFrames();this.makeHotspots();this.makePhoneTarget();this.makeAwardsTarget();this.setupControls();
      this.roomScene.add(new T.HemisphereLight(0xfff5e6,0xc6b7a6,this.baseline?2.0:1.35));
      this.sun=new T.DirectionalLight(0xffefda,this.baseline?2.4:2.55);this.sun.position.set(-5.5,7,-4.0);
      this.sun.target.position.set(-.8,.6,-3.1);this.roomScene.add(this.sun,this.sun.target);
      this.sun.castShadow=true;this.sun.shadow.mapSize.set(this.baseline?512:1024,this.baseline?512:1024);
      Object.assign(this.sun.shadow.camera,{left:-4.5,right:4.5,top:4,bottom:-4,near:.5,far:18});
      this.sun.shadow.normalBias=this.baseline?.018:.009;this.sun.shadow.bias=-.00012;this.sun.shadow.radius=this.baseline?4:7;this.sun.shadow.blurSamples=8;
      this.resize();this.canvas.dataset.renderer='three';this.canvas.dataset.office='procedural';
      this.frame();this.canvas.dataset.ready='true';
      // Keep initial shell and text responsive; default avatar gets bandwidth first.
      await window.STUDIO_AVATAR_VIEWER?.ready.catch(()=>{});
      if(options.get('office')!=='0')await this.loadOffice(options.get('office')==='missing'?'./assets/office/not-found.glb':this.baseline?'./assets/office/office-workspace-dffb1bf53497.glb':'./assets/office/office-workspace-dffb1bf53497.glb');
      if(options.get('furniture')!=='0'&&window.StudioFurnitureLoader){
        const missing=options.get('missingFurniture');
        const configuration=options.get('furniture')==='missing'||missing?{items:window.STUDIO_FURNITURE_CONFIG.items.map(item=>options.get('furniture')==='missing'||item.id===missing?({...item,model:'./assets/furniture/intentionally-missing.glb'}):item)}:window.STUDIO_FURNITURE_CONFIG;
        this.furniture=new window.StudioFurnitureLoader(this,configuration);await this.furniture.loadAll();
      }else{this.canvas.dataset.taskboardState='original';}
      if(options.get('cat')!=='0'&&window.StudioCat){this.cat=new window.StudioCat(this,options.get('cat')==='missing'?{...window.STUDIO_CAT_CONFIG,model:'./assets/cat/intentionally-missing.glb'}:window.STUDIO_CAT_CONFIG);await this.cat.load();}
    }
    setLegacyExcluded(group,hidden=true){
      if(hidden)this.excludedGroups.add(group);else this.excludedGroups.delete(group);
      const geometry=G.buildRoom({exclude:[...this.excludedGroups]});
      const replacement=this.rawGeometry(geometry);
      this.roomObject.geometry.dispose();this.roomObject.geometry=replacement;this.staticMesh=geometry;this.dirty=true;
      this.canvas.dataset.legacyExcluded=[...this.excludedGroups].join(',');
    }
    rawGeometry(raw){
      const T=this.T,count=raw.length/12,geometry=new T.BufferGeometry();
      const interleaved=new T.InterleavedBuffer(raw,12);
      for(const [name,size,offset] of [['aPos',3,0],['aColor',3,3],['aNormal',3,6],['aSurface',1,9],['aUV',2,10]]){
        geometry.setAttribute(name,new T.InterleavedBufferAttribute(interleaved,size,offset));
      }
      geometry.setAttribute('position',geometry.getAttribute('aPos'));
      geometry.setAttribute('normal',geometry.getAttribute('aNormal'));
      geometry.computeBoundingSphere();return geometry;
    }
    retainOriginalMouse(){
      // Preserve exact mouse triangles/attributes from the accepted, material-merged office.
      if(!this.office||this.canvas.dataset.originalMouse==='retained')return;
      const T=this.T,box=new T.Box3(new T.Vector3(.643,1.343,.077),new T.Vector3(.877,1.467,.433));
      this.office.updateMatrixWorld(true);let kept=0;const removed=[],retainedMaterials=new Set(),retainedTextures=new Set();
      this.office.traverse(object=>{
        if(!object.isMesh)return;
        const geometry=object.geometry,positions=geometry.attributes.position,indices=geometry.index,selected=[],point=new T.Vector3();
        const mugBox=new T.Box3(new T.Vector3(-1.89,1.343,-.55),new T.Vector3(-1.54,1.586,-.31)),mugIndices=[];
        const inMug=index=>mugBox.containsPoint(point.fromBufferAttribute(positions,index).applyMatrix4(object.matrixWorld).sub(this.office.position));
        for(let j=0;j<(indices?.count||positions.count);j+=3){const ids=[0,1,2].map(k=>indices?indices.getX(j+k):j+k);if(ids.every(inMug))mugIndices.push(...ids);}
        if(mugIndices.length){const mugGeometry=geometry.clone();mugGeometry.setIndex(mugIndices);mugGeometry.applyMatrix4(object.matrixWorld);const mug=new T.Mesh(mugGeometry,object.material);mug.position.set(.12,-.005,.79);mug.userData.zone='computer';this.roomScene.add(mug);this.canvas.dataset.originalMug='restored';this.canvas.dataset.mugTriangles=String(Number(this.canvas.dataset.mugTriangles||0)+mugIndices.length/3);for(const material of Array.isArray(object.material)?object.material:[object.material]){retainedMaterials.add(material);for(const value of Object.values(material))if(value?.isTexture)retainedTextures.add(value);}}
        const inside=index=>box.containsPoint(point.fromBufferAttribute(positions,index).applyMatrix4(object.matrixWorld).sub(this.office.position));
        for(let i=0;i<(indices?.count||positions.count);i+=3){const ids=[0,1,2].map(k=>indices?indices.getX(i+k):i+k);if(ids.every(inside))selected.push(...ids);}
        if(!selected.length){object.visible=false;removed.push(object);return;}
        const retained=geometry.clone();retained.setIndex(selected);object.geometry=retained;geometry.dispose();kept+=selected.length/3;
        for(const material of Array.isArray(object.material)?object.material:[object.material]){retainedMaterials.add(material);for(const value of Object.values(material))if(value?.isTexture)retainedTextures.add(value);}
      });
      for(const object of removed){object.removeFromParent();object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])if(!retainedMaterials.has(material)){for(const value of Object.values(material))if(value?.isTexture&&!retainedTextures.has(value)){value.source?.data?.close?.();value.dispose();}material.dispose();}}
      this.canvas.dataset.originalMouse='retained';this.canvas.dataset.mouseTriangles=String(kept);
      this.canvas.dataset.office='formal-glb';this.dirty=true;
    }
    legacyMaterial(texture=this.defaultTexture){
      const T=this.T;
      const material=new T.RawShaderMaterial({vertexShader:G.vertexShader,fragmentShader:G.fragmentShader,
        uniforms:{uMVP:{value:this.viewProjection},uBob:{value:0},uHighlight:{value:0},uPhoto:{value:texture}},
        transparent:true,depthWrite:true,side:T.DoubleSide,toneMapped:false});
      this.materials.push(material);return material;
    }
    legacyObject(raw,texture){return new this.T.Mesh(this.rawGeometry(raw),this.legacyMaterial(texture));}
    initAlbumFrames(){
      const T=this.T,photos=window.StudioAlbumData?window.StudioAlbumData.photos():[];
      this.albumFrames=L.frames.map((definition,i)=>{
        const object=this.legacyObject(G.buildAlbumFrame(definition));object.renderOrder=2;this.roomScene.add(object);
        const path=window.StudioAlbumData?.localImage(photos[i%Math.max(photos.length,1)]?.thumbnail);
        if(path){
          new T.TextureLoader().load(path,texture=>{
            if(this.destroyed){texture.dispose();return;}
            texture.colorSpace=T.NoColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
            texture.generateMipmaps=false;this.textures.push(texture);
            object.material.uniforms.uPhoto.value=texture;this.dirty=true;
          },undefined,()=>{});
        }
        const b=document.createElement('button');b.type='button';b.className='album-target';b.dataset.zone='album'+i;
        b.setAttribute('aria-label','打开生活相册，相框'+(i+1));b.innerHTML='<span class="album-hint">我的生活碎片 ♡</span>';
        const frame={...definition,object,button:b,hover:false,light:0};
        b.addEventListener('click',()=>this.onZone('album:'+i));
        for(const event of ['pointerenter','focus'])b.addEventListener(event,()=>frame.hover=true);
        for(const event of ['pointerleave','blur'])b.addEventListener(event,()=>frame.hover=false);
        this.layer.appendChild(b);return frame;
      });
    }
    async loadOffice(path){
      const T=this.T;this.canvas.dataset.office='loading';
      try{
        const {GLTFLoader}=await import(vendor+'examples/jsm/loaders/GLTFLoader.js');
        const manager=new T.LoadingManager();
        manager.setURLModifier(resource=>{
          if(resource.startsWith('blob:')||resource.startsWith('data:'))return resource;
          const url=new URL(resource,document.baseURI),base=new URL('./assets/',document.baseURI);
          if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error('Office asset references a non-local resource');
          return url.href;
        });
        const gltf=await new GLTFLoader(manager).loadAsync(path);
        if(this.destroyed){this.disposeObject(gltf.scene);return;}
        this.office=gltf.scene;this.office.position.set(...L.groups.desk.to);
        this.office.userData.zone='computer';
        this.office.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;obj.userData.zone='computer';}});
        if(!this.baseline)this.addOfficeSurfaceLight();
        this.roomScene.add(this.office);
        this.setLegacyExcluded('desk');
        this.shadowMaterial=new T.ShadowMaterial({color:0x806e59,opacity:this.baseline?.20:.25});
        this.shadowReceiver=new T.Mesh(new T.PlaneGeometry(6,3.5),this.shadowMaterial);
        this.shadowReceiver.rotation.x=-Math.PI/2;this.shadowReceiver.position.set(-.6,.034,-2.8);
        this.shadowReceiver.receiveShadow=true;this.shadowReceiver.renderOrder=1;this.shadowMaterial.depthWrite=false;
        this.roomScene.add(this.shadowReceiver);
        if(!this.baseline)await this.addContactOcclusion();
        this.renderer.shadowMap.needsUpdate=true;
        this.canvas.dataset.office='glb';this.canvas.dataset.officeAsset=this.baseline?'office-baseline/office-workspace.glb':'office/office-workspace.glb';this.dirty=true;
      }catch(error){
        if(this.destroyed)return;
        this.canvas.dataset.office='failed';this.canvas.dataset.officeError='kept-procedural-desk';
        console.warn('Office model unavailable; original desk retained:',error.message);this.dirty=true;
      }
    }
    addOfficeSurfaceLight(){
      // An original, low resolution studio-light field, filtered once. Only refined
      // wood and fabric use it; the remaining room keeps its original shader/colors.
      const T=this.T,w=128,h=64,pixels=new Float32Array(w*h*4);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const u=x/w,v=y/h;
        const upper=Math.max(0,Math.cos(v*Math.PI));
        const window=Math.exp(-(((u-.23)/.095)**8)-((v-.35)/.22)**8)*1.25;
        const fill=Math.exp(-(((u-.72)/.16)**4)-((v-.35)/.25)**4)*.34;
        const energy=.12+upper*.22+window+fill,index=(y*w+x)*4;
        pixels[index]=energy;pixels[index+1]=energy*.94;pixels[index+2]=energy*.85;pixels[index+3]=1;
      }
      const source=new T.DataTexture(pixels,w,h,T.RGBAFormat,T.FloatType);
      source.mapping=T.EquirectangularReflectionMapping;source.needsUpdate=true;
      const generator=new T.PMREMGenerator(this.renderer);
      this.environmentTarget=generator.fromEquirectangular(source);source.dispose();generator.dispose();
      this.office.traverse(obj=>{
        if(!obj.isMesh)return;
        for(const material of (Array.isArray(obj.material)?obj.material:[obj.material])){
          if(/^Refined|^Upholstery/.test(material.name)){
            material.envMap=this.environmentTarget.texture;material.envMapIntensity=.45;material.needsUpdate=true;
          }
        }
      });
    }
    async addContactOcclusion(){
      const T=this.T;
      try{
        const texture=await new T.TextureLoader().loadAsync('./assets/office/office-contact-1dac6a29556f.png');
        if(this.destroyed){texture.dispose();return;}
        texture.colorSpace=T.SRGBColorSpace;this.textures.push(texture);
        const material=new T.MeshBasicMaterial({map:texture,color:0x655345,transparent:true,depthWrite:false,toneMapped:false});
        const contact=new T.Mesh(new T.PlaneGeometry(5.6,3.2),material);
        contact.rotation.x=-Math.PI/2;contact.position.set(L.groups.desk.to[0],.036,L.groups.desk.to[2]+.5);
        contact.renderOrder=2;this.roomScene.add(contact);this.canvas.dataset.contactOcclusion='baked';
      }catch(error){
        console.warn('Office contact texture unavailable; soft shadow remains:',error.message);
        this.canvas.dataset.contactOcclusion='shadow-only';
      }
    }
    resize(){
      if(!this.renderer)return;
      const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
      if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.dirty=true;}
      const aspect=this.canvas.width/Math.max(1,this.canvas.height),height=L.viewHeight/this.zoom;
      Object.assign(this.camera,{left:-height*aspect/2,right:height*aspect/2,top:height/2,bottom:-height/2});
      this.camera.position.set(...this.eye());this.camera.lookAt(...this.center);
      this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
      this.viewProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
      this.mvp=this.viewProjection.elements;
    }
    frame(now=performance.now()){
      if(this.destroyed)return;
      this.raf=requestAnimationFrame(()=>this.frame());
      if(document.hidden||!this.canvas.clientWidth||!this.canvas.clientHeight){this.catLastTime=null;return;}
      const catDelta=this.catLastTime==null?0:Math.min(.05,Math.max(0,(now-this.catLastTime)/1000));this.catLastTime=now;
      this.catTick=(this.catTick||0)+catDelta;
      let catMoving=false;if(this.catTick>=1/30){catMoving=this.cat?.update(this.catTick)||false;this.catTick=0;}
      const moving=Math.abs(this.target.theta-this.theta)+Math.abs(this.target.elevation-this.elevation)+Math.abs(this.target.zoom-this.zoom)+this.target.center.reduce((sum,v,i)=>sum+Math.abs(v-this.center[i]),0)>.00001;
      this.theta+=(this.target.theta-this.theta)*.10;this.elevation+=(this.target.elevation-this.elevation)*.10;
      this.zoom+=(this.target.zoom-this.zoom)*.10;for(let i=0;i<3;i++)this.center[i]+=(this.target.center[i]-this.center[i])*.09;
      let highlighting=false;
      for(const f of this.albumFrames){
        highlighting ||= Math.abs((f.hover?1:0)-f.light)>.001;
        f.light+=((f.hover?1:0)-f.light)*.18;f.object.material.uniforms.uHighlight.value=f.light;
      }
      if(highlighting||this.dirty)this.furniture?.updateHighlights();
      highlighting ||= Math.abs((this.phoneHovered?1:0)-this.phoneLight)>.001;
      this.phoneLight+=((this.phoneHovered?1:0)-this.phoneLight)*.18;
      this.phoneObject.material.uniforms.uHighlight.value=this.phoneLight;
      const viewChanged=moving||this.dirty||this.w!==this.canvas.clientWidth||this.h!==this.canvas.clientHeight;
      if(viewChanged){this.resize();this.placeHotspots();this.furniture?.placeLabels();}this.cat?.place();
      if(moving||highlighting||catMoving||this.dirty){this.renderer.render(this.roomScene,this.camera);this.canvas.dataset.officeRendered=this.canvas.dataset.office;if(moving||this.dirty)this.furniture?.publish();this.dirty=false;}
    }
    useNativeFallback(error){
      if(this.destroyed)return;
      this.cleanupThree();this.layer.replaceChildren();
      const canvas=this.canvas.cloneNode(false);this.canvas.replaceWith(canvas);this.canvas=canvas;
      try{
        this.fallback=new Native(canvas,this.layer,this.onZone);
        this.fallback.target={...this.target,center:[...this.target.center]};this.fallback.zone=this.zone;
        canvas.dataset.renderer='native-fallback';canvas.dataset.office='procedural';canvas.dataset.ready='true';
        console.warn('Office renderer unavailable; original room restored:',error.message);
      }catch(fallbackError){
        canvas.dataset.renderer='unavailable';canvas.hidden=true;this.layer.replaceChildren();
        document.getElementById('stageError').hidden=false;
        console.error('Room graphics unavailable:',fallbackError.message);
      }
    }
    makeAwardsTarget(){
      const config=window.STUDIO_FURNITURE_CONFIG.items.find(item=>item.id==='folders');
      this.points.awards=[config.position[0],config.position[1]+config.dimensions[1]/2,config.position[2]];
      const button=document.createElement('button');button.type='button';button.className='award-target';button.dataset.zone='awards';button.hidden=true;
      button.setAttribute('aria-label','打开我的获奖情况');button.innerHTML='<span class="award-hint">我的获奖情况</span>';
      button.addEventListener('click',()=>this.onZone('awards'));this.layer.appendChild(button);
    }
    focus(id){
      if(id==='awards'&&!this.fallback){this.zone=id;this.target={...L.views.work,center:[1.1,1.65,-3.15]};return;}
      return this.fallback?this.fallback.focus(id):super.focus(id);
    }
    reset(){return this.fallback?this.fallback.reset():super.reset();}
    changeZoom(dir){return this.fallback?this.fallback.changeZoom(dir):super.changeZoom(dir);}
    focusPhone(){return this.fallback?this.fallback.focusPhone():super.focusPhone();}
    leavePhone(...args){return this.fallback?this.fallback.leavePhone(...args):super.leavePhone(...args);}
    focusAlbum(index){return this.fallback?this.fallback.focusAlbum(index):super.focusAlbum(index);}
    leaveAlbum(...args){return this.fallback?this.fallback.leaveAlbum(...args):super.leaveAlbum(...args);}
    getMetrics(){
      if(this.fallback)return {renderer:'native-fallback',office:'procedural',roomTriangles:this.fallback.staticMesh.length/36};
      const geometries=new Set(),textures=new Set();this.roomScene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
      let geometryBytes=0,estimatedTextureBytes=0;const arrays=new Set();
      for(const geometry of geometries)for(const attribute of [...Object.values(geometry.attributes),geometry.index].filter(Boolean)){const array=attribute.isInterleavedBufferAttribute?attribute.data.array:attribute.array;if(!arrays.has(array)){geometryBytes+=array.byteLength;arrays.add(array);}}
      for(const texture of textures){const image=texture.image;if(image?.width&&image?.height)estimatedTextureBytes+=image.width*image.height*4*(texture.generateMipmaps?4/3:1);}
      return {renderer:'three',office:this.canvas.dataset.office,roomTriangles:this.staticMesh?.length/36,drawCalls:this.renderer?.info.render.calls,renderedTriangles:this.renderer?.info.render.triangles,textures:this.renderer?.info.memory.textures,geometries:this.renderer?.info.memory.geometries,jsHeapBytes:performance.memory?.usedJSHeapSize||null,furnitureAssets:this.furniture?.assetCache.size||0,sceneGeometryBytes:geometryBytes,estimatedTextureBytes:Math.round(estimatedTextureBytes),furnitureLoadMs:Number(this.canvas.dataset.furnitureLoadMs)||null};
    }
    disposeObject(object){
      object?.traverse(obj=>{
        obj.geometry?.dispose();
        for(const material of (Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[])){
          for(const value of Object.values(material))if(value?.isTexture){value.source?.data?.close?.();value.dispose();}
          material.dispose();
        }
      });
    }
    cleanupThree(){
      cancelAnimationFrame(this.raf);this.removeControls();
      this.cat?.destroy();this.furniture?.destroy();
      if(this.roomScene)this.disposeObject(this.roomScene);
      for(const texture of this.textures||[])texture.dispose();
      for(const material of this.materials||[])material.dispose();
      this.sun?.shadow?.map?.dispose();this.environmentTarget?.dispose();this.renderer?.dispose();
    }
    destroy(){this.destroyed=true;if(this.fallback)this.fallback.destroy();else this.cleanupThree();}
  }
  window.StudioOfficeRoom=OfficeRoom;
  window.createStudioRoom=(canvas,layer,onZone)=>{
    if(new URLSearchParams(window.location.search).get('renderer')==='native'){
      canvas.dataset.renderer='native';canvas.dataset.office='procedural';canvas.dataset.ready='true';
      return new Native(canvas,layer,onZone);
    }
    return new OfficeRoom(canvas,layer,onZone);
  };
})();

