(function(){
  'use strict';
  const vendor='./vendor/three/package/';
  function segmentBox(a,b,box,padding=0){
    let near=0,far=1;
    for(let axis=0;axis<2;axis++){
      const delta=b[axis]-a[axis],lo=box.min[axis]-padding,hi=box.max[axis]+padding;
      if(Math.abs(delta)<1e-9){if(a[axis]<lo||a[axis]>hi)return false;continue;}
      let p=(lo-a[axis])/delta,q=(hi-a[axis])/delta;if(p>q)[p,q]=[q,p];
      near=Math.max(near,p);far=Math.min(far,q);if(near>far)return false;
    }
    return true;
  }
  function validateRoutes(config,obstacles){
    const issues=[];
    for(const [a,b] of config.edges){
      if(!config.points[a]||!config.points[b]){issues.push('Missing route point');continue;}
      for(const p of [config.points[a],config.points[b]])for(let k=0;k<2;k++)if(p[k]<config.roomBounds.min[k]+config.clearance||p[k]>config.roomBounds.max[k]-config.clearance)issues.push('Route outside room');
      for(const box of obstacles)if(segmentBox(config.points[a],config.points[b],box,config.clearance))issues.push(a+' → '+b+' overlaps '+box.id);
    }
    return [...new Set(issues)];
  }
  class CatPatrol{
    constructor(config,random=Math.random){this.config=config;this.random=random;this.point=config.start;this.previous=-1;this.position=[...config.points[this.point]];this.yaw=config.yaw;this.wait=config.initialPause;this.destination=null;this.enabled=false;this.walking=false;this.petLeft=0;}
    pet(){this.petLeft=this.config.petSeconds;this.walking=false;}
    update(dt){
      dt=Math.max(0,Math.min(dt,.05));this.walking=false;
      if(this.petLeft>0){this.petLeft=Math.max(0,this.petLeft-dt);return false;}
      if(!this.enabled)return false;
      if(this.wait>0){this.wait=Math.max(0,this.wait-dt);return false;}
      if(this.destination===null){
        let choices=this.config.edges.flatMap(([a,b])=>a===this.point?[b]:b===this.point?[a]:[]);
        const onward=choices.filter(v=>v!==this.previous);if(onward.length)choices=onward;
        if(!choices.length)return false;
        this.destination=this.previous===-1&&choices.includes(this.config.firstDestination)?this.config.firstDestination:choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
      }
      const target=this.config.points[this.destination],dx=target[0]-this.position[0],dz=target[1]-this.position[1],distance=Math.hypot(dx,dz);
      const desired=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(desired-this.yaw),Math.cos(desired-this.yaw));
      this.yaw+=angle*(1-Math.exp(-dt*5));
      // Turn in place first; never cut a corner while following the approved segments.
      if(this.config.turnInPlace!==false&&Math.abs(angle)>.20)return true;
      const step=Math.min(distance,this.config.speed*dt);this.walking=step>0;
      if(distance>0){this.position[0]+=dx/distance*step;this.position[1]+=dz/distance*step;}
      if(distance<=step+.00001){
        this.previous=this.point;this.point=this.destination;this.destination=null;this.walking=!!this.config.continuous;
        this.wait=this.config.rest[0]+this.random()*(this.config.rest[1]-this.config.rest[0]);
        if(this.random()<(this.config.longRestChance??.15))this.wait+=5;
      }
      return true;
    }
  }
  class StudioCat{
    constructor(room,config=window.STUDIO_CAT_CONFIG){
      this.room=room;this.T=room.T;this.config=config;this.patrol=new CatPatrol(config);
      this.destroyed=false;this.handlers=[];this.elapsed=0;this.publishElapsed=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.motionChange=()=>{this.patrol.enabled=!!this.walkAction&&!this.reduced.matches&&!this.routeIssues.length;this.room.dirty=true;this.publish();};
      this.reduced.addEventListener('change',this.motionChange);
    }
    load(){return this.loadPromise||(this.loadPromise=this.loadOnce());}
    async loadOnce(){
      const started=performance.now(),room=this.room,T=this.T;room.canvas.dataset.catState='loading';
      try{
        const url=new URL(this.config.model,document.baseURI),base=new URL('./assets/cat/',document.baseURI);
        if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||!url.pathname.endsWith('.glb'))throw Error('Cat must use a local GLB');
        this.abort=new AbortController();const response=await fetch(url,{signal:this.abort.signal});if(!response.ok)throw Error('Cat model unavailable');
        const bytes=await response.arrayBuffer();this.bytes=bytes.byteLength;
        const {GLTFLoader}=await import(vendor+'examples/jsm/loaders/GLTFLoader.js');
        const manager=new T.LoadingManager();manager.setURLModifier(resource=>{
          if(resource.startsWith('blob:')||resource.startsWith('data:'))return resource;
          const next=new URL(resource,url);if(next.origin!==base.origin||!next.pathname.startsWith(base.pathname))throw Error('Cat contains an external resource');return next.href;
        });
        const loader=new GLTFLoader(manager);const metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,new DataView(bytes).getUint32(12,true))));
        if(metadata.extensionsUsed?.includes('EXT_meshopt_compression')){const {MeshoptDecoder}=await import(vendor+'examples/jsm/libs/meshopt_decoder.module.js');await MeshoptDecoder.ready;loader.setMeshoptDecoder(MeshoptDecoder);}
        const gltf=await loader.parseAsync(bytes,new URL('.',url).href);
        if(this.destroyed){room.disposeObject(gltf.scene);return false;}
        this.model=gltf.scene;this.model.updateMatrixWorld(true);
        this.model.traverse(object=>{if(object.isSkinnedMesh)object.skeleton.update();});
        const bounds=new T.Box3().setFromObject(this.model,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        if(size.toArray().some(v=>!Number.isFinite(v)||v<=0))throw Error('Cat has no usable geometry');
        this.sourceBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};this.scale=this.config.height/size.y;
        this.normalized=new T.Group();this.normalized.add(this.model);this.normalized.position.set(-center.x,-bounds.min.y,-center.z);
        const scaled=new T.Group();scaled.add(this.normalized);scaled.scale.setScalar(this.scale);
        this.root=new T.Group();this.root.name='studio-calico-cat';this.root.userData.cat=true;this.root.add(scaled);
        this.root.position.set(this.patrol.position[0],this.config.floorY,this.patrol.position[1]);this.root.rotation.y=this.patrol.yaw;
        this.model.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;object.userData.cat=true;if(object.isSkinnedMesh)object.frustumCulled=false;}});
        room.roomScene.add(this.root);this.root.updateMatrixWorld(true);
        this.radius=Math.hypot(size.x,size.z)*this.scale/2;
        if(this.radius>this.config.clearance)throw Error('Cat is larger than safe route clearance');
        const obstacles=this.obstacles();this.routeIssues=validateRoutes(this.config,obstacles);
        this.clips=gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}));
        // No substitute animation, fake leg movement or sliding if the supplied GLB has no walk.
        const clip=this.config.walkClip?gltf.animations.find(c=>c.name===this.config.walkClip):gltf.animations.find(c=>/walk|行走|走路/i.test(c.name));
        if(clip){
          this.mixer=new T.AnimationMixer(this.model);this.walkAction=this.mixer.clipAction(clip);this.walkAction.play();this.walkAction.paused=true;
          this.model.traverse(object=>{if(object.isBone&&/^(tripo)?Root$/i.test(object.name.replace(/\W/g,'')))this.rootBone=object;});this.rootBind=this.rootBone?.position.clone();
        }
        this.patrol.enabled=!!this.walkAction&&!this.reduced.matches&&!this.routeIssues.length;
        this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.installInteraction();this.makeContact();
        this.loadMs=performance.now()-started;room.canvas.dataset.catState='ready';room.dirty=true;this.publish();return true;
      }catch(error){
        if(this.root)room.roomScene.remove(this.root);if(this.model)room.disposeObject(this.model);
        if(!this.destroyed){room.canvas.dataset.catState='failed';room.canvas.dataset.catError=error.message;console.warn('Cat unavailable; room remains usable:',error.message);}
        return false;
      }
    }
    obstacles(){
      const result=[...this.config.extraObstacles];
      for(const entry of this.room.furniture?.entries.values()||[]){
        if(!entry.root.visible||['rug','window','taskboard','folders','monitor','keyboard','lamp'].includes(entry.config.id)||entry.config.id.startsWith('album'))continue;
        const box=entry.hitBox;result.push({id:entry.config.id,min:[box.min.x,box.min.z],max:[box.max.x,box.max.z]});
      }
      return result;
    }
    installInteraction(){
      const button=document.createElement('button');button.type='button';button.className='cat-target';button.setAttribute('aria-label','摸摸三花小猫');
      this.bubble=document.createElement('span');this.bubble.className='cat-bubble';this.bubble.textContent='喵～ ♡';this.bubble.hidden=true;
      this.bubble.setAttribute('role','status');this.bubble.setAttribute('aria-live','polite');button.append(this.bubble);this.button=button;
      this.click=event=>{
        if(event.detail){
          const r=this.room.canvas.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);this.raycaster.setFromCamera(this.pointer,this.room.camera);
          if(!this.raycaster.intersectObject(this.root,true).length)return;
        }
        event.stopPropagation();this.patrol.pet();this.bubble.hidden=false;this.button.classList.add('petted');this.room.dirty=true;this.publish();
      };
      button.addEventListener('click',this.click);this.room.layer.append(button);
    }
    makeContact(){
      const T=this.T,canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const context=canvas.getContext('2d'),gradient=context.createRadialGradient(32,32,1,32,32,31);
      gradient.addColorStop(0,'rgba(91,72,57,0.20)');gradient.addColorStop(.5,'rgba(91,72,57,0.08)');gradient.addColorStop(1,'rgba(91,72,57,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
      const texture=new T.CanvasTexture(canvas),material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
      this.contact=new T.Mesh(new T.PlaneGeometry(this.config.height*.857,this.config.height*1.34),material);this.contact.rotation.x=-Math.PI/2;this.contact.position.set(this.root.position.x,this.config.floorY+.002,this.root.position.z);this.contact.userData.cat=true;this.room.roomScene.add(this.contact);
    }
    update(dt){
      if(!this.root||this.destroyed||!this.button)return false;
      dt=Math.max(0,Math.min(dt,.05));
      const changed=this.patrol.update(dt);if(changed){this.root.position.x=this.patrol.position[0];this.root.position.z=this.patrol.position[1];this.root.rotation.y=this.patrol.yaw;this.root.updateMatrixWorld(true);}
      if(this.walkAction){this.walkAction.paused=!this.patrol.walking;this.walkAction.timeScale=this.config.animationSpeed;if(this.patrol.walking){this.mixer.update(dt);if(this.rootBone&&this.rootBind){this.rootBone.position.x=this.rootBind.x;this.rootBone.position.z=this.rootBind.z;}this.root.updateMatrixWorld(true);}}
      this.contact.position.x=this.root.position.x;this.contact.position.z=this.root.position.z;this.contact.rotation.z=-this.root.rotation.y;
      if(this.patrol.petLeft<=0&&!this.bubble.hidden){this.bubble.hidden=true;this.button.classList.remove('petted');this.publish();}
      this.publishElapsed+=dt;if(this.publishElapsed>.25&&changed){this.publish();this.publishElapsed=0;}
      return changed||!!this.patrol.walking;
    }
    place(){
      if(!this.button)return;
      const key=[...this.room.camera.matrixWorld.elements,...this.root.position.toArray(),this.root.rotation.y,this.room.w,this.room.h,this.room.zoom].join(',');
      if(key===this.lastPlaceKey)return;this.lastPlaceKey=key;
      const room=this.room,box=new this.T.Box3().setFromObject(this.root),center=box.getCenter(new this.T.Vector3()),pixels=[];
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])pixels.push(room.project([x,y,z]));
      const left=Math.min(...pixels.map(p=>p[0])),top=Math.min(...pixels.map(p=>p[1])),right=Math.max(...pixels.map(p=>p[0])),bottom=Math.max(...pixels.map(p=>p[1]));
      this.raycaster.set(room.camera.position,center.clone().sub(room.camera.position).normalize());
      const distance=center.distanceTo(room.camera.position),point=new this.T.Vector3();
      // Cached and bounded: do not raycast every high-poly furniture mesh on every frame.
      const blocked=[...(room.furniture?.entries.values()||[])].some(entry=>entry.root.visible&&this.raycaster.ray.intersectBox(entry.hitBox,point)&&point.distanceTo(room.camera.position)<distance-.03);
      this.button.hidden=blocked||right<0||left>room.w||bottom<0||top>room.h;
      Object.assign(this.button.style,{left:left+'px',top:top+'px',width:Math.max(24,right-left)+'px',height:Math.max(24,bottom-top)+'px'});
      room.canvas.dataset.catPixel=JSON.stringify(room.project(center.toArray()));
    }
    publish(){
      const c=this.room.canvas;if(!this.root)return;
      c.dataset.catWalking=String(this.patrol.walking);c.dataset.catPoint=String(this.patrol.point);
      c.dataset.cat=JSON.stringify({source:this.config.model,bytes:this.bytes,loadMs:+(this.loadMs||0).toFixed(1),height:this.config.height,scale:this.scale,radius:this.radius,speed:this.config.speed,animationSpeed:this.config.animationSpeed,continuous:this.config.continuous,sourceBounds:this.sourceBounds,position:this.root.position.toArray(),yaw:this.root.rotation.y,clips:this.clips,walkAvailable:!!this.walkAction,walking:this.patrol.walking,routeIssues:this.routeIssues,reducedMotion:this.reduced.matches,petting:this.patrol.petLeft>0,point:this.patrol.point,animationTime:this.walkAction?.time||0,sampledAtMs:performance.now()});
      c.dataset.catAnimation=this.walkAction?'walk':'missing-walk';
    }
    destroy(){
      this.destroyed=true;this.abort?.abort();this.reduced.removeEventListener('change',this.motionChange);this.button?.removeEventListener('click',this.click);this.button?.remove();
      this.mixer?.stopAllAction();if(this.model)this.mixer?.uncacheRoot(this.model);
      for(const object of [this.root,this.contact])if(object){this.room.roomScene.remove(object);this.room.disposeObject(object);}
    }
  }
  window.STUDIO_CAT_LOGIC={segmentBox,validateRoutes,CatPatrol};window.StudioCat=StudioCat;
})();
