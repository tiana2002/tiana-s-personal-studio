(function(){
 'use strict';
 // Pure scheduling state: no rendering, browser timers, assets or content data.
 class DiscoveryScheduler{
  constructor(ids,timing,seen=[],random=Math.random){this.ids=ids;this.timing=timing;this.seen=new Set(seen);this.random=random;this.cursor=0;this.active=null;this.until=null;this.nextAt=null;this.started=false;this.startedAt=null;this.paused=false;this.history=[];}
  complete(){return this.ids.every(id=>this.seen.has(id));}
  clear(now,reason){if(this.active){const last=this.history.at(-1);if(last&&!last.hiddenAt){last.hiddenAt=now;last.reason=reason;}}this.active=null;this.until=null;}
  start(now){if(this.started)return;this.started=true;this.startedAt=now;this.nextAt=this.complete()?null:now+this.timing.initialDelay;}
  pause(value,now){if(value===this.paused)return;this.paused=value;this.clear(now,value?'paused':'resumed');this.nextAt=value||this.complete()||!this.started?null:now+this.timing.resumeDelay;}
  activity(now){this.clear(now,'activity');this.nextAt=this.paused||!this.started||this.complete()?null:now+this.timing.resumeDelay;}
  mark(id,now){if(!this.ids.includes(id))return;this.seen.add(id);this.activity(now);}
  tick(now,available){
   if(!this.started||this.paused||this.complete()){this.clear(now,'stopped');this.nextAt=null;return this.active;}
   if(this.active){
    if(!available.includes(this.active)){this.clear(now,'offscreen');this.nextAt=now+this.timing.retryAfter;}
    else if(now>=this.until){this.clear(now,'elapsed');const [min,max]=this.timing.gap;this.nextAt=now+min+(max-min)*this.random();}
    return this.active;
   }
   if(this.nextAt==null||now<this.nextAt)return null;
   for(let n=0;n<this.ids.length;n++){
    const index=(this.cursor+n)%this.ids.length,id=this.ids[index];
    if(this.seen.has(id)||!available.includes(id))continue;
    this.active=id;this.cursor=(index+1)%this.ids.length;this.until=now+this.timing.showFor;this.nextAt=null;
    this.history.push({id,at:now,until:this.until});if(this.history.length>20)this.history.shift();return id;
   }
   this.nextAt=now+this.timing.retryAfter;return null;
  }
  due(){return this.paused||this.complete()?null:this.until??this.nextAt;}
 }
 window.DiscoveryScheduler=DiscoveryScheduler;
})();
