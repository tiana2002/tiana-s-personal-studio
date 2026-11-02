(function(){
  'use strict';
  const lib='./vendor/three/package/';
  class StudioAvatar {
    constructor(canvas,{status,note,onChange=()=>{},config=window.STUDIO_AVATAR_CONFIG}={}){
      this.canvas=canvas;this.status=status;this.note=note;this.onChange=onChange;this.config=config;
      this.cache=new Map();this.token=0;this.outfit=null;this.requested=null;this.source=null;
      this.dirty=true;this.destroyed=false;this.pumping=false;
      this.envelope=window.STUDIO_AVATAR_FIT.envelope(config.outfits,config.height||2.7);
      this.engineReady=this.init();
      this.ready=this.engineReady.then(()=>this.setOutfit(config.defaultOutfit)).catch(error=>{
        this.setStatus('人物预览暂时无法启动，工作室仍可继续浏览。');this.canvas.dataset.state='error';throw error;
      });
    }
    setStatus(message){if(this.status){this.status.textContent=message;this.status.hidden=!message;}}
    state(value,requested=this.requested){
      this.canvas.dataset.state=value;this.canvas.dataset.requested=requested||'';
      this.canvas.parentElement?.setAttribute('aria-busy',String(value==='loading'));
      this.onChange({outfit:this.outfit,requested,state:value,source:this.source});
    }
    async init(){
      const [T,{OrbitControls},{GLTFLoader}]=await Promise.all([import(lib+'build/three.module.js'),import(lib+'examples/jsm/controls/OrbitControls.js'),import(lib+'examples/jsm/loaders/GLTFLoader.js')]);
      if(this.destroyed)return;this.T=T;this.GLTFLoader=GLTFLoader;
      this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.5:1.75));
      this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);
      this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(32,1,.05,100);
      this.scene.add(new T.HemisphereLight(0xfff8f0,0xc5b8b2,1.65));
      const key=new T.DirectionalLight(0xfff6e9,1.5);key.position.set(-3,5,5);this.scene.add(key);
      const fill=new T.DirectionalLight(0xf0f1fa,.65);fill.position.set(4,2,-3);this.scene.add(fill);
      this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enablePan=false;
      this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.rotateSpeed=.65;
      this.controls.minPolarAngle=1.1;this.controls.maxPolarAngle=1.85;
      this.controls.target.set(0,this.envelope.height/2,0);
      this.camera.position.set(0,this.envelope.height/2,8);
      this.controls.addEventListener('change',()=>this.dirty=true);
      this.keyHandler=e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;
        e.preventDefault();if(e.key==='Home'){this.reset();return;}
        if(e.key==='+'||e.key==='-'){this.zoom(e.key==='+'?1:-1);return;}
        const offset=this.camera.position.clone().sub(this.controls.target),sphere=new T.Spherical().setFromVector3(offset);
        if(e.key==='ArrowLeft'||e.key==='ArrowRight')sphere.theta+=e.key==='ArrowLeft'?-.16:.16;
        else sphere.phi=T.MathUtils.clamp(sphere.phi+(e.key==='ArrowUp'?-.06:.06),this.controls.minPolarAngle,this.controls.maxPolarAngle);
        this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(sphere));this.controls.update();this.dirty=true;
      };
      this.canvas.addEventListener('keydown',this.keyHandler);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas.parentElement);
      this.resize();this.fitDistance(true);
      const tick=()=>{
        if(this.destroyed)return;this.raf=requestAnimationFrame(tick);
        if(document.hidden||!this.canvas.clientWidth||!this.canvas.clientHeight)return;
        const changed=this.controls.update();this.updateLimits();
        if(changed||this.dirty){
          this.renderer.render(this.scene,this.camera);this.dirty=false;
          if(this.root){this.canvas.dataset.renderedOutfit=this.outfit;this.publishMetrics();}
        }
      };this.raf=requestAnimationFrame(tick);
    }
    resize(){
      if(!this.renderer)return;this.trimCache();const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
      const ratio=this.fitBase?this.camera.position.distanceTo(this.controls.target)/this.fitBase:1.1;
      this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
      this.fitDistance(!this.fitted,ratio);this.dirty=true;
    }
    safeDistance(){
      return window.STUDIO_AVATAR_FIT.distance(this.envelope,this.camera.aspect,this.camera.fov,this.controls.getPolarAngle());
    }
    updateLimits(){
      const safe=this.safeDistance();this.fitBase=safe;
      this.controls.minDistance=safe;this.controls.maxDistance=safe*1.75;
      const offset=this.camera.position.clone().sub(this.controls.target);
      if(offset.length()<safe){offset.setLength(safe);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.dirty=true;}
    }
    fitDistance(reset=false,ratio){
      if(!this.controls)return;
      if(reset){
        this.controls.reset();this.controls.target.set(0,this.envelope.height/2,0);
        this.camera.position.set(0,this.envelope.height/2+.1,8);this.controls.update();
        const d=this.safeDistance()*1.08,offset=new this.T.Vector3(0,.045,1).normalize().multiplyScalar(d);
        this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.fitted=true;
      }else if(ratio){
        this.updateLimits();const offset=this.camera.position.clone().sub(this.controls.target).setLength(this.fitBase*Math.max(1,Math.min(1.75,ratio)));
        this.camera.position.copy(this.controls.target).add(offset);this.controls.update();
      }
      this.updateLimits();this.dirty=true;
    }
    normalize(model,outfit){
      const T=this.T,item=this.config.outfits[outfit],rotator=new T.Group();rotator.add(model);
      if(item.upAxis==='x')rotator.rotation.z=Math.PI/2;
      if(item.upAxis==='z')rotator.rotation.x=-Math.PI/2;
      const facing=new T.Group();facing.rotation.y=item.yaw||0;facing.add(rotator);facing.updateMatrixWorld(true);
      const box=new T.Box3().setFromObject(facing),size=box.getSize(new T.Vector3());
      if(!Number.isFinite(size.y)||size.y<=0)throw Error('模型没有可显示的几何体');
      const wrapper=new T.Group();wrapper.add(facing);wrapper.scale.setScalar(this.envelope.height/size.y);
      facing.position.sub(box.getCenter(new T.Vector3()));facing.position.y+=size.y/2;wrapper.updateMatrixWorld(true);
      wrapper.userData.outfit=outfit;wrapper.userData.sourceSize=size.toArray();
      return wrapper;
    }
    localModelURL(path){
      const url=new URL(path,document.baseURI),assets=new URL('./assets/',document.baseURI),decoded=decodeURIComponent(url.pathname);
      if(url.origin!==assets.origin||!url.pathname.startsWith(assets.pathname)||!url.pathname.toLowerCase().endsWith('.glb')||decoded.includes('\\')||/[\x00-\x1f]/.test(decoded)||decoded.split('/').includes('..'))throw Error('人物模型必须是本站 assets 目录中的 GLB 文件');
      return url.href;
    }
    setOutfit(outfit){
      const item=this.config.outfits[outfit];if(!item)return Promise.reject(new RangeError('未知造型'));
      return this.loadModel(item.model,{outfit});
    }
    async loadModel(path,{outfit=this.config.defaultOutfit}={}){
      if(!this.config.outfits[outfit])throw new RangeError('未知造型');
      const url=this.localModelURL(path);await this.engineReady;if(this.destroyed)return false;
      const token=++this.token;this.requested=outfit;
      if(this.next)this.next.resolve(false);this.abort?.abort();
      this.setStatus('正在打开'+this.config.outfits[outfit].label+'…');this.state('loading',outfit);
      return new Promise(resolve=>{this.next={url,outfit,token,resolve};this.pump();});
    }
    cacheLimit(){return window.matchMedia('(max-width:700px)').matches?this.config.mobileCacheLimit||1:this.config.cacheLimit||2;}
    trimCache(preparing=false){
      const limit=this.cacheLimit();
      for(const [key,entry] of this.cache){
        if(this.cache.size<(preparing?limit:limit+1))break;
        if(entry.root===this.root)continue;
        this.cache.delete(key);this.disposeObject(entry.root);
      }
    }
    async fetchEntry(request){
      this.trimCache(true);const controller=new AbortController();this.abort=controller;
      const start=performance.now(),response=await fetch(request.url,{signal:controller.signal});
      if(!response.ok)throw Error('模型文件暂时无法读取');
      const buffer=await response.arrayBuffer();if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      if(request.token!==this.token||this.destroyed)return null;
      const manager=new this.T.LoadingManager();
      manager.setURLModifier(resource=>{
        if(resource.startsWith('data:')||resource.startsWith('blob:'))return resource;
        const url=new URL(resource,request.url),base=new URL('./assets/',document.baseURI);
        if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error('模型引用了非本地资源');return url.href;
      });
      const jsonBytes=new Uint8Array(buffer,20,new DataView(buffer).getUint32(12,true));
      const metadata=JSON.parse(new TextDecoder().decode(jsonBytes));
      const loader=new this.GLTFLoader(manager);
      if((metadata.extensionsUsed||[]).includes('EXT_meshopt_compression')){
        const {MeshoptDecoder}=await import(lib+'examples/jsm/libs/meshopt_decoder.module.js');
        await MeshoptDecoder.ready;loader.setMeshoptDecoder(MeshoptDecoder);
      }
      const parsed=await loader.parseAsync(buffer,new URL('.',request.url).href);
      if(request.token!==this.token||this.destroyed){this.disposeObject(parsed.scene);return null;}
      let root;
      try{root=this.normalize(parsed.scene,request.outfit);}catch(error){this.disposeObject(parsed.scene);throw error;}
      return {root,url:request.url,loadMs:performance.now()-start,bytes:buffer.byteLength};
    }
    async pump(){
      if(this.pumping)return;this.pumping=true;
      try{
        while(this.next&&!this.destroyed){
          const request=this.next;this.next=null;
          try{
            let entry=this.cache.get(request.url),cached=!!entry;
            if(!entry)entry=await this.fetchEntry(request);
            if(!entry||request.token!==this.token||this.destroyed){if(entry&&!cached)this.disposeObject(entry.root);request.resolve(false);continue;}
            this.cache.delete(request.url);this.cache.set(request.url,entry);
            if(this.root)this.scene.remove(this.root);
            this.root=entry.root;this.source='glb';this.outfit=request.outfit;this.scene.add(this.root);
            this.trimCache();this.updateLimits();this.dirty=true;
            Object.assign(this.canvas.dataset,{source:'glb',outfit:this.outfit,model:new URL(entry.url).pathname,loadMs:entry.loadMs.toFixed(1),modelBytes:String(entry.bytes),cacheHit:String(cached)});
            if(this.note)this.note.textContent=this.config.outfits[this.outfit].label+' · 3D人物';
            this.setStatus('');this.state('ready');request.resolve(true);
          }catch(error){
            if(!this.destroyed&&request.token===this.token){this.setStatus('这套造型暂时未能加载，请再点一次重试。工作室可继续浏览。');this.state('error');console.warn('Avatar model unavailable:',error.message);}
            request.resolve(false);
          }
        }
      }finally{this.pumping=false;this.abort=null;}
    }
    publishMetrics(){
      const T=this.T,box=new T.Box3().setFromObject(this.root);let inside=true;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const p=new T.Vector3(x,y,z).project(this.camera);if(Math.abs(p.x)>.999||Math.abs(p.y)>.999||p.z<-1||p.z>1)inside=false;
      }
      Object.assign(this.canvas.dataset,{fit:inside?'inside':'clipped',yaw:this.controls.getAzimuthalAngle().toFixed(4),distance:this.camera.position.distanceTo(this.controls.target).toFixed(4),bounds:JSON.stringify({min:box.min.toArray(),max:box.max.toArray()}),cachedModels:String(this.cache.size),triangles:String(this.renderer.info.render.triangles),textures:String(this.renderer.info.memory.textures),geometryCount:String(this.renderer.info.memory.geometries)});
    }
    zoom(direction){
      if(!this.controls)return;this.updateLimits();const offset=this.camera.position.clone().sub(this.controls.target).multiplyScalar(direction>0?.90:1.10).clampLength(this.controls.minDistance,this.controls.maxDistance);
      this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.dirty=true;
    }
    reset(){this.fitDistance(true);}
    disposeObject(object){
      const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
      object?.traverse(item=>{if(item.geometry)geometries.add(item.geometry);for(const material of (Array.isArray(item.material)?item.material:item.material?[item.material]:[]))materials.add(material);});
      for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      for(const texture of textures){if(texture.source?.data)images.add(texture.source.data);texture.dispose();}
      for(const image of images)image.close?.();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();
    }
    destroy(){
      this.destroyed=true;this.token++;this.abort?.abort();if(this.next){this.next.resolve(false);this.next=null;}
      cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();this.canvas.removeEventListener('keydown',this.keyHandler);this.controls?.dispose();
      if(this.root)this.scene.remove(this.root);for(const entry of this.cache.values())this.disposeObject(entry.root);this.cache.clear();this.root=null;this.renderer?.dispose();
    }
  }
  window.StudioAvatar=StudioAvatar;
})();
