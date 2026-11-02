/* Real GLBs mounted in the existing room scene, with occlusion-aware mesh picking. */
(function(){
  'use strict';
  const vendor='./vendor/three/package/';
  class StudioFurnitureLoader{
    constructor(room,configuration=window.STUDIO_FURNITURE_CONFIG){
      this.room=room;this.T=room.T;this.items=configuration?.items||[];
      this.entries=new Map();this.destroyed=false;this.pending=new Set();this.handlers=[];
      this.assetCache=new Map();this.ownedMaterials=[];this.photoObjects=[];this.failures=[];
      this.raycaster=new this.T.Raycaster();this.pointer=new this.T.Vector2();
      const canvas=room.canvas;
      const up=event=>{
        if(room.dragDist>=9)return;
        const rect=canvas.getBoundingClientRect(),hit=this.pick((event.clientX-rect.left)*room.w/rect.width,(event.clientY-rect.top)*room.h/rect.height);
        if(!hit)return;
        room.dragging=false;event.stopImmediatePropagation();
        canvas.dataset.lastFurnitureHit=hit.config.id;
        if(hit.config.action)room.onZone(hit.config.action);
      };
      const move=event=>{
        if(room.dragging)return;
        const rect=canvas.getBoundingClientRect();
        canvas.style.cursor=this.pick((event.clientX-rect.left)*room.w/rect.width,(event.clientY-rect.top)*room.h/rect.height)?.config.action?'pointer':'';
      };
      canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointermove',move);
      this.handlers.push(['pointerup',up,true],['pointermove',move,false]);
    }
    localURL(path){
      const url=new URL(path,document.baseURI),base=new URL('./assets/',document.baseURI),decoded=decodeURIComponent(url.pathname);
      if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||!url.pathname.toLowerCase().endsWith('.glb')||decoded.includes('\\')||decoded.split('/').includes('..')||/[\x00-\x1f]/.test(decoded))throw Error('家具模型必须来自本站assets目录');
      return url.href;
    }
    prepare(scene,config){
      const T=this.T,rotated=new T.Group();rotated.rotation.set(...config.rotation);rotated.add(scene);rotated.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(rotated),size=bounds.getSize(new T.Vector3());
      if(size.toArray().some(v=>!Number.isFinite(v)||v<=0))throw Error('家具没有完整的可显示几何体');
      if(config.dimensions){
        const factor=new T.Vector3(...config.dimensions).divide(size),center=bounds.getCenter(new T.Vector3());
        rotated.position.copy(center).negate();
        if(config.attach==='floor')rotated.position.y=-bounds.min.y;
        if(config.attach==='back')rotated.position.z=-bounds.min.z;
        const root=new T.Group();root.name=config.id;root.add(rotated);root.scale.copy(factor);root.position.set(...config.position);
        root.userData.furnitureId=config.id;root.userData.zone=config.action;
        root.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;object.userData.furnitureId=config.id;object.userData.zone=config.action;}});
        root.updateMatrixWorld(true);
        return{root,scale:factor.toArray(),sourceBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},config,hitBox:new T.Box3().setFromObject(root)};
      }
      const factor=Math.min(config.fitSize[0]/size.x,config.fitSize[1]/size.y)*(config.scale||1);
      const center=bounds.getCenter(new T.Vector3());
      // The backmost point meets the configured wall plane; proportions remain uniform.
      rotated.position.set(-center.x,-center.y,config.attach==='back'?-bounds.min.z:-center.z);
      const root=new T.Group();root.name=config.id;root.add(rotated);root.scale.setScalar(factor);root.position.set(...config.position);
      root.userData.furnitureId=config.id;root.userData.zone=config.action;
      root.traverse(object=>{
        if(!object.isMesh)return;
        object.castShadow=false;object.receiveShadow=false; // Never changes the accepted floor/shadow presentation.
        object.userData.furnitureId=config.id;object.userData.zone=config.action;
      });
      root.updateMatrixWorld(true);
      return {root,scale:factor,sourceBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},config,hitBox:new T.Box3().setFromObject(root)};
    }
    async loadAll(){
      const started=performance.now();let next=0,done=0;
      const status=document.getElementById('furnitureStatus');
      if(status){status.hidden=false;status.textContent='正在摆放正式家具…';}
      // Two workers cap peak decode memory. Config order follows the approved migration stages.
      const worker=async()=>{while(next<this.items.length&&!this.destroyed){const config=this.items[next++];await this.load(config);done++;const progress=document.getElementById('roomLoadText');if(progress&&!this.failures.length)progress.textContent='正在布置工作室… '+done+' / '+this.items.length+' 件';if(status&&!this.failures.length)status.textContent='正在摆放正式家具 '+done+' / '+this.items.length;}};
      await Promise.all([worker(),worker()]);
      this.room.canvas.dataset.furnitureReady=this.failures.length?'partial':'true';
      this.room.canvas.dataset.furnitureLoadMs=(performance.now()-started).toFixed(1);
      if(status&&!this.failures.length)status.hidden=true;
      return this.failures.length===0;
    }
    async getAsset(config){
      const url=this.localURL(config.model);
      if(!this.assetCache.has(url))this.assetCache.set(url,(async()=>{
        const abort=new AbortController();this.pending.add(abort);
        try{
        const started=performance.now(),url=this.localURL(config.model),response=await fetch(url,{signal:abort.signal});
        if(!response.ok)throw Error('无法读取家具模型');
        const bytes=await response.arrayBuffer();if(this.destroyed)return false;
        const metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,new DataView(bytes).getUint32(12,true))));
        const {GLTFLoader}=await import(vendor+'examples/jsm/loaders/GLTFLoader.js');
        const manager=new this.T.LoadingManager();
        manager.setURLModifier(resource=>{
          if(resource.startsWith('data:')||resource.startsWith('blob:'))return resource;
          const next=new URL(resource,url),base=new URL('./assets/',document.baseURI);
          if(next.origin!==base.origin||!next.pathname.startsWith(base.pathname))throw Error('家具包含外部资源地址');return next.href;
        });
        const loader=new GLTFLoader(manager);
        if((metadata.extensionsUsed||[]).includes('EXT_meshopt_compression')){
          const {MeshoptDecoder}=await import(vendor+'examples/jsm/libs/meshopt_decoder.module.js');await MeshoptDecoder.ready;loader.setMeshoptDecoder(MeshoptDecoder);
        }
        const gltf=await loader.parseAsync(bytes,new URL('.',url).href);
        if(this.destroyed){this.room.disposeObject(gltf.scene);throw Error('Viewer disposed');}
        return{scene:gltf.scene,bytes:bytes.byteLength,loadMs:performance.now()-started};
        }finally{this.pending.delete(abort);}
      })());
      return this.assetCache.get(url);
    }
    async load(config){
      const canvas=this.room.canvas,key=config.id==='taskboard'?'taskboardState':config.id+'State';canvas.dataset[key]='loading';
      let scene;
      try{
        const asset=await this.getAsset(config);if(this.destroyed)return false;
        scene=asset.scene.clone(true);
        const entry=this.prepare(scene,config);entry.bytes=asset.bytes;entry.loadMs=asset.loadMs;
        const previous=this.entries.get(config.id);
        if(config.stage)entry.root.visible=false;
        this.room.roomScene.add(entry.root);
        try{if(config.replaceGroup)this.room.setLegacyExcluded(config.replaceGroup,true);}catch(error){this.room.roomScene.remove(entry.root);throw error;}
        if(previous)this.room.roomScene.remove(previous.root);
        this.entries.set(config.id,entry);canvas.dataset[key]='glb';this.room.dirty=true;
        if(config.albumIndex!==undefined)this.installAlbum(entry);
        if(config.stage&&this.items.filter(item=>item.stage===config.stage).every(item=>this.entries.has(item.id))){
          for(const item of this.items.filter(item=>item.stage===config.stage))this.entries.get(item.id).root.visible=true;
          if(config.stage==='office')this.room.retainOriginalMouse();
          if(config.stage==='living')this.room.setLegacyExcluded('living',true);
        }
        return true;
      }catch(error){
        if(!this.destroyed){
          canvas.dataset[key]='failed';
          this.failures.push(config.id);
          const status=document.getElementById('furnitureStatus');
          if(status){status.hidden=false;status.textContent=config.name+'模型暂未加载，原入口仍可使用。请刷新重试。';}
          console.warn('Furniture unavailable; previous geometry retained:',config.id,error.message);
        }
        return false;
      }
    }
    installAlbum(entry){
      const T=this.T,index=entry.config.albumIndex,frame=this.room.albumFrames[index],photos=window.StudioAlbumData.photos();
      const bounds=entry.hitBox,size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),settings=entry.config.photo;
      const width=size.x*settings.width,height=size.y*settings.height,z=bounds.max.z+.001;
      const material=new T.MeshBasicMaterial({color:0xfff8ee,toneMapped:false});
      const backing=new T.Mesh(new T.PlaneGeometry(width,height),material);backing.position.set(center.x,center.y,z);backing.userData.furnitureId=entry.config.id;backing.renderOrder=2;
      this.room.roomScene.add(backing);this.photoObjects.push(backing);
      frame.object.visible=false;frame.point=[center.x,center.y,z];frame.width=size.x;frame.height=size.y;frame.glb=entry;
      entry.root.traverse(object=>{if(object.isMesh){object.material=object.material.clone();this.ownedMaterials.push(object.material);}});
      const photo=photos[index%photos.length],url=window.StudioAlbumData.localImage(photo?.thumbnail);
      if(url)new T.TextureLoader().load(url,texture=>{
        if(this.destroyed){texture.dispose();return;}
        texture.colorSpace=T.SRGBColorSpace;const aspect=(texture.image.width||1)/(texture.image.height||1),w=Math.min(width,height*aspect),h=w/aspect;
        const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}));plane.position.set(center.x,center.y,z+.0005);plane.userData.furnitureId=entry.config.id;plane.renderOrder=3;
        this.room.roomScene.add(plane);this.photoObjects.push(plane);this.room.dirty=true;
      },undefined,()=>{});
    }
    updateHighlights(){
      for(const entry of this.entries.values())if(entry.config.albumIndex!==undefined){
        const light=this.room.albumFrames[entry.config.albumIndex].light;
        entry.root.traverse(object=>{if(object.isMesh&&object.material.emissive){object.material.emissive.setRGB(.09*light,.055*light,.035*light);}});
      }
    }
    pick(px,py){
      const room=this.room;if(!this.entries.size||!room.w||!room.h)return null;
      this.pointer.set(px/room.w*2-1,1-py/room.h*2);this.raycaster.setFromCamera(this.pointer,room.camera);
      const candidates=[];
      for(const entry of this.entries.values()){
        if(!entry.root.visible)continue;
        if(entry.config.hitShape==='bounds'){
          // A world-space volume, not rendered geometry. Keeps a dense flat board cheap to click.
          const point=this.raycaster.ray.intersectBox(entry.hitBox,new this.T.Vector3());
          if(point)candidates.push({entry,distance:point.distanceTo(this.raycaster.ray.origin)});
        }else{
          // Exact mesh picking only after a cheap world-space bounds rejection.
          if(!this.raycaster.ray.intersectsBox(entry.hitBox))continue;
          const hit=this.raycaster.intersectObject(entry.root,true)[0];if(hit)candidates.push({entry,distance:hit.distance});
        }
      }
      candidates.sort((a,b)=>a.distance-b.distance);const nearest=candidates[0];if(!nearest)return null;
      const occluders=room.roomScene.children.filter(object=>!object.userData.furnitureId);
      const visible=object=>{for(let current=object;current;current=current.parent)if(!current.visible)return false;return true;};
      const blocker=this.raycaster.intersectObjects(occluders,true).find(hit=>visible(hit.object)&&hit.object.material?.opacity!==0);
      return blocker&&blocker.distance<nearest.distance-.0001?null:nearest.entry;
    }
    placeLabels(){
      const room=this.room;
      for(const entry of this.entries.values()){
        if(!['above','target'].includes(entry.config.label?.placement))continue;
        const button=room.layer?.querySelector('[data-zone="'+entry.config.action+'"]');if(!button)continue;
        const box=entry.hitBox,pixels=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])pixels.push(room.project([x,y,z]));
        const xs=pixels.map(p=>p[0]),ys=pixels.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
        if(entry.config.label.placement==='target'){
          button.hidden=false;Object.assign(button.style,{left:left+'px',top:top+'px',width:Math.max(22,right-left)+'px',height:Math.max(22,bottom-top)+'px',display:right<0||left>room.w||bottom<0||top>room.h?'none':'block'});continue;
        }
        if(right<0||left>room.w||bottom<0||top>room.h){button.style.display='none';continue;}
        button.style.display='flex';
        if(entry.labelViewportWidth!==room.w){entry.labelHeight=button.offsetHeight||30;entry.labelViewportWidth=room.w;}
        const half=entry.labelHeight/2;
        button.style.left=Math.max(20,Math.min(room.w-20,(left+right)/2))+'px';
        button.style.top=Math.max(half+6,top-half-(entry.config.label.gap||6))+'px';
      }
    }
    publish(){
      const room=this.room,T=this.T,metadata=[];
      for(const entry of this.entries.values()){
        const bounds=new T.Box3().setFromObject(entry.root),center=bounds.getCenter(new T.Vector3());
        const probes=[[-.37,.28],[.37,.28],[-.37,-.28],[.37,-.28]].map(([x,y])=>{
          const p=new T.Vector3(center.x+x*(bounds.max.x-bounds.min.x),center.y+y*(bounds.max.y-bounds.min.y),bounds.max.z);
          const pixel=room.project(p.toArray());return {world:p.toArray(),pixel};
        });
        metadata.push({id:entry.config.id,asset:entry.config.asset||entry.config.id,action:entry.config.action,visible:entry.root.visible,model:entry.config.model,scale:entry.scale,bytes:entry.bytes,loadMs:+entry.loadMs.toFixed(1),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},worldMatrix:entry.root.matrixWorld.toArray(),probes});
      }
      room.canvas.dataset.furniture=JSON.stringify(metadata);
      room.canvas.dataset.taskboardRendered=this.entries.has('taskboard')?'glb':'original';
      room.canvas.dataset.furnitureAssets=String(this.assetCache.size);
    }
    destroy(){
      this.destroyed=true;for(const abort of this.pending)abort.abort();this.pending.clear();
      for(const [event,handler,capture] of this.handlers)this.room.canvas.removeEventListener(event,handler,capture);
      for(const entry of this.entries.values())this.room.roomScene.remove(entry.root);
      for(const object of this.photoObjects){this.room.roomScene.remove(object);this.room.disposeObject(object);}
      for(const material of this.ownedMaterials)material.dispose();
      for(const promise of this.assetCache.values())promise.then(asset=>this.room.disposeObject(asset.scene)).catch(()=>{});
      this.assetCache.clear();
      this.entries.clear();
    }
  }
  window.StudioFurnitureLoader=StudioFurnitureLoader;
})();
