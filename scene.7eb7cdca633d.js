/* Dependency-free WebGL renderer; v2.0 phase 1 is a spatial blockout study.
   The room and furniture are real 3D mesh geometry, not a backdrop image.
   Future GLB/Three.js assets can replace these procedural models. */
(function () {
  const L=window.STUDIO_LAYOUT;
  const ROOM_VS=`attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;attribute float aSurface;attribute vec2 aUV;uniform mat4 uMVP;uniform float uBob;varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying float vSurface;varying vec2 vUV;void main(){vColor=aColor;vNormal=aNormal;vWorld=aPos;vSurface=aSurface;vUV=aUV;gl_Position=uMVP*vec4(aPos.x,aPos.y+uBob,aPos.z,1.0);}`;
  const ROOM_FS=`precision mediump float;
varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying float vSurface;varying vec2 vUV;
uniform float uHighlight;uniform sampler2D uPhoto;
void main(){
 if(vSurface>4.5&&vSurface<5.5){gl_FragColor=vec4(.31,.245,.20,vColor.r);return;}
 if(vSurface>5.5){vec3 photo=texture2D(uPhoto,vUV).rgb;gl_FragColor=vec4(mix(photo,vec3(1.0,.92,.79),uHighlight*.17),1.0);return;}
 vec3 n=normalize(vNormal+vec3(.0001));
 float diffuse=max(dot(n,normalize(vec3(.45,1.0,.35))),0.0);
 vec3 color=vColor*(.86+.16*diffuse);
 float windowGlow=exp(-dot((vWorld.xz-vec2(-4.0,-2.7))*vec2(.34,.32),(vWorld.xz-vec2(-4.0,-2.7))*vec2(.34,.32)));
 color+=vec3(.055,.038,.016)*windowGlow;
 if(vSurface>.5&&vSurface<2.5){
   float grain=sin(vWorld.x*87.0+sin(vWorld.z*2.1)*2.5)*sin(vWorld.x*26.0+vWorld.z*.8);
   color*=1.0+grain*.027;
   if(vSurface>1.5){float seam=step(.985,fract((vWorld.x+4.99)/.78));color*=1.0-seam*.095;
     float beam=exp(-pow((vWorld.z+vWorld.x*.32+2.15)*1.05,2.0));
     color+=vec3(.055,.040,.014)*beam;
   }
 }
 if(vSurface>2.5&&vSurface<3.5){color*=.99+.006*sin(vWorld.y*74.0)*sin(vWorld.x*61.0+vWorld.z*43.0);color*=.94+.06*smoothstep(0.0,.7,vWorld.y);}
 if(vSurface>3.5&&vSurface<4.5)color*=.98+.02*sin(vWorld.x*110.0)*sin(vWorld.z*100.0);
 gl_FragColor=vec4(mix(color,vec3(1.0,.91,.78),uHighlight*.27),1.0);
}`;
  const C = {
    cream: '#f0e5d6', wall: '#f4ebe0', wallSide:'#ebdac6', wood:'#c7a17b', woodDark:'#9c795e', woodLight:'#e5c6a3', white:'#fff7e9', pink:'#bc8290', deepPink:'#a75764', burgundy:'#7c3645', hairDark:'#493333', hairPink:'#e58f8c', skin:'#efc6aa', ink:'#5f514d', denim:'#62646d', greenery:'#7e9a7a', leaf:'#93aa88', silver:'#9d9a93', monitor:'#455c64', screen:'#b5d2ca', gold:'#d0a76b'
  };
  function rgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
  function shade(col,amount=1){const c=rgb(col);return c.map(x=>Math.min(1,x*amount))}
  function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
  function norm(v){let d=Math.hypot(...v)||1;return v.map(x=>x/d)}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function lookAt(eye,ctr,up){let z=norm(eye.map((v,i)=>v-ctr[i])),x=norm(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
  function ortho(l,r,b,t,n,f){return [2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]}
  function mul(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
  function transformed(m,v){const [x,y,z]=v;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]]}
  class Mesh{
    constructor(group='architecture'){this.arr=[];this.group=group}
    vertex(p,color,n,surface,uv=[0,0]){if(this.excluded?.has(this.group))return;const transform=this.group==='windowLight'?'window':this.group==='archiveDecor'?'archive':this.group;this.arr.push(...L.point(transform,p),...color,...L.normal(transform,n),surface,...uv)}
    tri(a,b,c,col,light=1){
      const color=shade(col,light),n=norm(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));
      const wood=['#c7a17b','#9c795e','#e5c6a3','#c7a486','#d9b99f','#e2c3a6','#d1b095','#e5cbb1','#e4c8ab','#bd9d83','#b78a75'];
      const surface=col==='#eddfcd'?2:wood.includes(col)?1:[C.wall,C.wallSide].includes(col)?3:['#f7eee4','#ebddd1','#f2e7df'].includes(col)?4:0;
      for(let p of [a,b,c])this.vertex(p,color,n,surface);
    }
    softShadow(x,y,z,rx,rz,opacity){
      for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
        for(const [p,alpha] of [[[x,y,z],opacity],[[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],0],[[x+rx*Math.cos(b),y,z+rz*Math.sin(b)],0]])this.vertex(p,[alpha,0,0],[0,1,0],5);
      }
    }
    photoQuad(points){for(const i of [0,1,2,0,2,3]){const uv=[[0,0],[1,0],[1,1],[0,1]][i];this.vertex(points[i],[1,1,1],[0,0,1],6,uv)}}
    quad(a,b,c,d,col,light=1){this.tri(a,b,c,col,light);this.tri(a,c,d,col,light)}
    box(x,y,z,w,h,d,col){const a=x-w/2,b=x+w/2,lo=y-h/2,hi=y+h/2,f=z+d/2,back=z-d/2;
      this.quad([a,hi,f],[b,hi,f],[b,hi,back],[a,hi,back],col,1.08);
      this.quad([a,lo,back],[b,lo,back],[b,lo,f],[a,lo,f],col,.7);
      this.quad([a,lo,f],[b,lo,f],[b,hi,f],[a,hi,f],col,.98);
      this.quad([b,lo,back],[a,lo,back],[a,hi,back],[b,hi,back],col,.74);
      this.quad([a,lo,back],[a,lo,f],[a,hi,f],[a,hi,back],col,.78);
      this.quad([b,lo,f],[b,lo,back],[b,hi,back],[b,hi,f],col,.86);
    }
    sphere(x,y,z,rx,ry,rz,col,segments=10,rings=7){for(let j=0;j<rings;j++){const phi1=Math.PI*j/rings,phi2=Math.PI*(j+1)/rings;for(let i=0;i<segments;i++){const t1=2*Math.PI*i/segments,t2=2*Math.PI*(i+1)/segments;
      const p=(phi,t)=>[x+rx*Math.sin(phi)*Math.cos(t),y+ry*Math.cos(phi),z+rz*Math.sin(phi)*Math.sin(t)];
      const a=p(phi1,t1),b=p(phi1,t2),c=p(phi2,t2),d=p(phi2,t1);let brightness=.84+.14*Math.cos(phi1)+.08*Math.sin(t1);this.quad(a,b,c,d,col,brightness)}}}
    cylinder(x,y,z,rBottom,rTop,height,col,segments=12){const low=y-height/2,hi=y+height/2;for(let i=0;i<segments;i++){let a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;const co=(r,t,Y)=>[x+r*Math.cos(t),Y,z+r*Math.sin(t)];this.quad(co(rBottom,a,low),co(rTop,a,hi),co(rTop,b,hi),co(rBottom,b,low),col,.79+.20*Math.cos(a-1));this.tri([x,hi,z],co(rTop,b,hi),co(rTop,a,hi),col,1.05)}}
    ellipsoidDisk(x,y,z,rx,rz,col){const parts=32;for(let i=0;i<parts;i++){const a=2*Math.PI*i/parts,b=2*Math.PI*(i+1)/parts;this.tri([x,y,z],[x+rx*Math.cos(b),y,z+rz*Math.sin(b)],[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],col,.98)}}
    // A soft oval floor shadow and simple paper/decorative planes are also true 3D geometry.
    diamond(x,y,z,rx,rz,col){this.quad([x,y,z-rz],[x+rx,y,z],[x,y,z+rz],[x-rx,y,z],col,1)}
    line3D(ax,ay,az,bx,by,bz,width,col){const dx=bx-ax,dy=by-ay,dz=bz-az;const d=Math.hypot(dx,dy,dz)||1;const nx=-dz/d*width/2,nz=dx/d*width/2;this.quad([ax+nx,ay,az+nz],[ax-nx,ay,az-nz],[bx-nx,by,bz-nz],[bx+nx,by,bz+nz],col,1)}
  }
  function seedRand(){let state=17;return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296}}
  function buildRoom({exclude=[]}={}){const m=new Mesh(),r=seedRand();m.excluded=new Set(exclude);
    // foundation and open, two-wall dollhouse structure
    m.box(0,-.23,0,10.1,.38,7.65,'#c7a486');
    m.box(0,-.022,0,9.90,.09,7.48,'#eddfcd');
    for(let i=0;i<13;i++)m.box(-4.6+i*.78,.027,0,.012,.004,7.3,'#d9c6b0');
    m.box(0,1.75,-3.77,10.0,3.55,.17,C.wall);
    m.box(-4.99,1.75,0,.16,3.55,7.6,C.wallSide);
    m.box(0,3.57,-3.73,10,.12,.27,C.white);
    m.box(-4.90,3.57,0,.24,.12,7.6,C.white);
    m.box(0,.18,-3.64,10,.16,.20,C.woodLight);
    m.box(-4.85,.18,0,.2,.16,7.4,C.woodLight);
    m.group='window';
    // window with sunny sky and soft curtains
    m.box(2.65,2.58,-3.652,2.30,1.65,.07,C.white);
    // Same sky color/opening; thin backing stays behind the dimensional curtains.
    m.group='windowLight';m.box(2.5184210526,2.59,-3.697,2.3431578947,1.43,.001,'#bfd8d0');m.group='window';
    m.box(2.65,2.59,-3.57,.065,1.43,.08,'#f9ebd7');
    m.box(2.65,2.59,-3.57,2.08,.065,.08,'#f9ebd7');
    m.box(1.47,2.60,-3.54,.22,1.76,.12,'#e9d9d1');m.box(3.83,2.60,-3.54,.22,1.76,.12,'#e9d9d1');
    // small wall accents left
    // Wall decorations are now the three interactive album frames.
    // Daylight falls diagonally across the floor; soft layered pools of muted color
    // are used rather than heavy transparent textures or external lighting libraries.
    // Sunlight is now a soft analytic pool in the surface shader.

    // Soft under-furniture grounding shadows and a woven-look oval carpet.
    m.group='desk';m.ellipsoidDisk(2.14,.041,-1.68,1.61,1.06,'#e3d5c6');
    m.group='wardrobe';m.ellipsoidDisk(-3.67,.041,1.46,1.18,.90,'#d9c7b7');
    m.group='rug';m.ellipsoidDisk(.1,.042,.72,2.22,1.68,'#d1beb1');
    m.ellipsoidDisk(.1,.045,.72,2.10,1.56,'#ebddd1');
    m.ellipsoidDisk(.1,.048,.72,1.96,1.44,'#f7eee4');
    for(let k=0;k<24;k++){
      const a=k*Math.PI/12,xx=.1+2.13*Math.cos(a),zz=.72+1.60*Math.sin(a);
      m.sphere(xx,.052,zz,.035,.016,.033,k%3?'#dec8b9':'#cda99e',6,4);
    }
    m.group='books';
    // bookshelf, left rear
    const bx=-3.45,bz=-2.92;
    m.box(bx,1.49,bz,2.13,2.78,.59,C.woodDark);
    m.box(bx,1.5,bz+.06,1.94,2.55,.50,'#f6ecda');
    m.box(bx-.98,1.51,bz+.07,.11,2.6,.57,C.woodLight);m.box(bx+.98,1.51,bz+.07,.11,2.6,.57,C.woodLight);
    for(let j=0;j<4;j++)m.box(bx,.46+j*.64,bz+.13,1.91,.095,.64,C.wood);
    const bookColors=['#b77579','#8d9d8a','#e2b98a','#7d8895','#bda18c','#c88374','#8c777b'];
    for(let row=0;row<3;row++){for(let k=0;k<13;k++){const h=.28+r()*.28,w=.065+r()*.045;const x=bx-.83+k*.138+(r()-.5)*.026;const y=.53+row*.64+h/2;m.box(x,y,bz+.26,w,h,.31,bookColors[Math.floor(r()*bookColors.length)]);if(k%5===0)m.box(x,y,bz+.432,w*.82,h*.85,.01,'#e7d6bd')}}
    m.box(bx,2.90,bz,2.25,.15,.69,C.woodLight);
    // A few curated objects and storage boxes among the books.
    m.box(bx-.58,2.70,bz+.17,.40,.22,.39,'#d7c7b5');
    m.box(bx+.50,2.70,bz+.14,.45,.24,.42,'#c6a5a0');
    for(let i=0;i<3;i++)m.box(bx-.53+i*.21,2.68,bz+.405,.014,.11,.012,'#af8c7e');
    m.cylinder(bx-.69,3.08,bz,.13,.10,.22,'#dfc3a6',10);
    for(let i=0;i<5;i++){let a=i*Math.PI*2/5;m.sphere(bx-.69+Math.cos(a)*.12,3.31,bz+Math.sin(a)*.14,.13,.14,.14,i%2?'#77937b':'#94a688',8,5)}
    m.sphere(bx+.54,3.06,bz,.19,.16,.17,'#e7d1bd',12,7);
    m.sphere(bx+.54,3.22,bz,.13,.11,.13,'#e7d1bd',10,6);
    m.sphere(bx+.44,3.27,bz,.08,.10,.07,'#e7d1bd',9,6);
    m.sphere(bx+.65,3.27,bz,.08,.10,.07,'#e7d1bd',9,6);
    // small lined document drawers at the base of the bookcase
    for(let j=0;j<3;j++){m.box(bx-.62+j*.61,.24,bz+.385,.55,.31,.10,'#d9b99f');m.sphere(bx-.62+j*.61,.24,bz+.445,.045,.035,.022,'#aa8066',9,4)}
    m.group='desk';
    // desk and computer right rear
    const dx=2.13,dz=-1.63;
    m.box(dx,1.10,dz,2.74,.16,1.27,C.woodLight);
    for(let s of [-1,1])for(let t of [-1,1])m.box(dx+s*1.17,.54,dz+t*.47,.12,1.04,.14,C.woodDark);
    m.box(dx,1.44,dz-.28,.15,.64,.17,C.silver);
    m.box(dx,1.80,dz-.28,1.48,1.01,.12,'#6d6f70');
    m.box(dx,1.80,dz-.205,1.33,.84,.016,C.screen);
    m.box(dx,1.91,dz-.182,.99,.06,.012,'#e9f0df');
    m.box(dx-.32,1.75,dz-.182,.31,.27,.012,'#e9e5d9');
    m.box(dx+.18,1.75,dz-.18,.53,.035,.013,'#edf4e8');
    m.box(dx+.13,1.64,dz-.18,.44,.03,.013,'#e8eee7');
    m.box(dx,1.19,dz+.24,1.05,.045,.35,'#e4ded4');
    for(let row=0;row<3;row++)for(let k=0;k<10;k++)m.box(dx-.45+k*.10,1.223,dz+.13+row*.085,.072,.012,.055,k===9?'#ccc5b9':'#f1ece2');
    m.box(dx,1.228,dz+.34,.39,.013,.035,'#b7afa5');
    m.cylinder(dx+1.02,1.22,dz+.14,.13,.13,.19,'#fbf4e7');
    m.cylinder(dx-.92,1.25,dz-.38,.10,.10,.19,'#a9848a');
    // Desk accessories: notebook with pages, pencil, pen cup and a petite warm lamp.
    m.box(dx-.89,1.205,dz+.25,.35,.025,.43,'#d3a0a0');
    m.box(dx-.89,1.222,dz+.25,.30,.018,.37,'#f9eee3');
    m.box(dx-.98,1.238,dz+.26,.018,.008,.30,'#ab8680');
    m.box(dx-.55,1.23,dz+.38,.025,.019,.36,'#8c8178');
    m.cylinder(dx+1.15,1.32,dz-.33,.10,.10,.33,'#f8e0b8',12);
    m.cylinder(dx+1.15,1.55,dz-.33,.25,.12,.23,'#f7e4c8',14);
    m.cylinder(dx+1.15,1.13,dz-.33,.17,.17,.05,'#bf9f80',12);
    m.cylinder(dx+.47,1.31,dz+.48,.10,.10,.19,'#dfbdad',10);
    for(let k=0;k<4;k++)m.cylinder(dx+.42+k*.027,1.44,dz+.48,.012,.012,.25,k%2?'#c5a172':'#ab777b',8);
    // under-desk drawers
    m.box(dx+1.05,.63,dz-.13,.39,.73,.88,'#d1b095');
    for(let j=0;j<2;j++){m.box(dx+1.05,.43+j*.33,dz+.338,.32,.26,.025,'#e5cbb1');m.sphere(dx+1.05,.43+j*.33,dz+.37,.034,.031,.013,'#ac8173',8,4)}
    // chair
    m.box(dx,.64,dz+1.05,.88,.15,.78,'#a9897e');
    m.box(dx,.89,dz+1.38,.92,.89,.16,'#b78e85');
    m.cylinder(dx,.33,dz+1.05,.10,.10,.49,C.woodDark);
    for(let i=0;i<4;i++){const t=i*Math.PI/2;m.box(dx+Math.cos(t)*.25,.09,dz+1.05+Math.sin(t)*.22,.15,.12,.20,C.woodDark)}
    m.group='board';
    // task board back center
    m.box(-.44,2.45,-3.61,2.0,1.15,.10,C.woodDark);
    m.box(-.44,2.45,-3.532,1.85,1.02,.04,'#d1b99d');
    const notes=[['#f7eee4',-.85,2.59,.38,.25],['#c9d8ca',-.29,2.63,.43,.32],['#e5bdba',.32,2.53,.42,.39],['#f2d8af',-.80,2.24,.37,.20],['#f5e6cb',-.19,2.23,.42,.19]];
    notes.forEach(([col,x,y,w,h])=>{m.box(x,y,-3.490,w,h,.012,col);m.sphere(x,y+h*.32,-3.471,.025,.025,.025,C.pink,7,4)});
    // A couple of thread lines and snapshots turn the board into a lived-in planner.
    m.box(-.44,2.91,-3.482,.77,.018,.012,'#eee3d0');
    for(let j=0;j<3;j++){m.box(-1.06+j*.30,2.41,-3.477,.20,.13,.012,'#f9f2e7');m.box(-1.06+j*.30,2.37,-3.462,.13,.052,.011,'#c5bbb2')}
    // a discreet small print on the back wall, outside the task board
    // Back-wall print becomes the third album frame, clear of the task board.
    m.group='wardrobe';
    // wardrobe front left
    const wx=-3.74,wz=1.50;
    m.box(wx,1.20,wz,1.84,2.37,.90,C.woodDark);
    m.box(wx,1.22,wz+.485,1.68,2.17,.08,'#e2c3a6');
    m.box(wx,1.20,wz+.532,.03,2.17,.08,C.woodDark);
    m.sphere(wx-.12,1.24,wz+.590,.04,.04,.025,C.gold,7,5);
    m.sphere(wx+.12,1.24,wz+.590,.04,.04,.025,C.gold,7,5);
    m.box(wx,2.47,wz,2.02,.20,1.0,C.woodLight);
    m.box(wx,2.55,wz,1.68,.035,.84,'#f5dfc6');
    // One slightly open wardrobe side / glimpses of folded fabrics and ribbons.
    m.box(wx-.58,1.35,wz+.572,.48,1.67,.045,'#f6e8d9');
    for(let j=0;j<3;j++)m.box(wx-.58,.73+j*.21,wz+.611,.37,.12,.055,['#b58b96','#f2e7d5','#a97b78'][j]);
    m.sphere(wx+.58,2.13,wz+.591,.08,.10,.028,'#b87883',9,5);
    m.box(wx+.53,1.50,wz+.580,.45,.80,.029,'#b37c87');
    m.box(wx+.53,1.06,wz+.612,.53,.08,.036,'#eee0d0');
    m.group='mirror';
    // full-length mirror to wardrobe's right
    const mx=-2.15,mz=2.21;
    m.box(mx,1.33,mz,.85,2.20,.16,'#b78a75');
    m.box(mx,1.35,mz+.085,.67,2.03,.018,'#c2d5d0');
    m.box(mx-.15,1.8,mz+.099,.08,1.02,.008,'#e8f0e8');
    m.box(mx,2.50,mz,.22,.09,.28,'#b78a75');
    m.sphere(mx,2.58,mz,.12,.11,.13,'#b98790',8,6);
    m.group='dressSeat';
    // wardrobe corner rug and a small upholstered footstool
    m.ellipsoidDisk(-2.96,.065,2.64,.80,.47,'#e8dbd4');
    m.cylinder(-3.10,.30,2.65,.38,.39,.42,'#e5cbd0',16);
    m.cylinder(-3.10,.51,2.65,.35,.34,.08,'#f0dfe1',16);
    m.group='creative';
    // creative display shelving front right
    const sx=3.48,sz=1.73;
    for(let j=0;j<3;j++)m.box(sx,.40+j*.67,sz,1.70,.105,.65,C.woodLight);
    for(let side of [-.75,.75])m.box(sx+side,.99,sz,.095,1.70,.68,C.woodDark);
    // vintage camera and props
    m.box(sx-.41,1.21,sz, .56,.32,.30,'#746a6b');
    m.cylinder(sx-.41,1.21,sz+.18,.13,.13,.10,C.silver,14);
    m.box(sx-.41,1.42,sz,.20,.13,.16,'#65575a');
    m.box(sx+.40,1.20,sz,.47,.44,.30,C.pink);
    m.sphere(sx+.40,1.49,sz,.13,.19,.16,'#eac2af');
    m.box(sx-.42,.56,sz,.36,.22,.36,'#acc2b8');
    m.box(sx+.34,.59,sz,.38,.29,.31,'#c2a6aa');
    m.sphere(sx+.30,.82,sz,.23,.21,.22,'#e7d7c9');
    // photo frames, stacked video reels and a small collectible on top shelf
    for(let k=0;k<2;k++){
      const xx=sx+.24+k*.28;
      m.box(xx,1.42,sz-.16,.23,.34,.05,'#a98779');
      m.box(xx,1.43,sz-.123,.17,.27,.010,k===0?'#d9c5c2':'#c6c8ba');
    }
    m.cylinder(sx-.58,.82,sz,.16,.16,.10,'#988c8f');
    m.cylinder(sx-.58,.93,sz,.12,.12,.08,'#dbc6ad');
    m.sphere(sx+.54,1.50,sz-.10,.15,.16,.14,'#e0c2b4',9,7);
    m.sphere(sx+.48,1.65,sz-.10,.09,.09,.08,'#e8d8bd',9,6);
    m.sphere(sx+.60,1.65,sz-.10,.09,.09,.08,'#e8d8bd',9,6);
    m.group='plantBack';
    // trailing plant in terracotta on a stand near window
    m.cylinder(4.28,.31,-2.48,.34,.34,.53,C.woodLight);
    m.cylinder(4.28,.72,-2.48,.30,.37,.34,'#c38f77');
    for(let k=0;k<8;k++){const a=k*Math.PI*2/8;let px=4.28+Math.cos(a)*.29,pz=-2.48+Math.sin(a)*.28;m.sphere(px,1.13+(.1*(k%3)),pz,.22,.28,.19,k%2===0?C.greenery:C.leaf,8,6)}
    // little pictures on left wall
    // Keep the wardrobe wall quiet; album frames sit beside it rather than over it.
    m.group='floorLamp';
    // decor vase / floor lamp
    m.cylinder(.95,.52,-2.90,.10,.12,1.05,C.woodDark);
    m.cylinder(.95,1.32,-2.90,.42,.23,.62,'#f7ead3');
    m.cylinder(.95,.12,-2.90,.30,.30,.08,C.woodDark);
    m.group='living';
    // small cozy reading corner: round tea table, soft cushion and warm ceramic mug.
    // Kept toward the front to preserve the central living space.
    // One shared central rug replaces the formerly isolated reading-corner rugs.
    m.cylinder(1.28,.35,2.51,.62,.60,.13,'#e4c8ab',20);
    m.cylinder(1.28,.20,2.51,.10,.10,.23,'#bd9d83',12);
    m.cylinder(1.28,.12,2.51,.38,.38,.06,'#c6a387',16);
    m.box(1.13,.43,2.48,.34,.05,.24,'#c3a6a8');
    m.box(1.13,.47,2.48,.30,.025,.20,'#f8efe5');
    m.cylinder(1.53,.50,2.46,.12,.13,.16,'#f5e9df',12);
    m.cylinder(1.55,.57,2.45,.04,.04,.015,'#d5ad8e',10);
    m.cylinder(2.18,.22,2.68,.61,.66,.35,'#d9b9bd',18);
    m.sphere(2.18,.40,2.68,.60,.22,.60,'#e9cfd0',14,7);
    m.sphere(2.43,.53,2.40,.25,.19,.26,'#e7d7cf',12,7);
    m.group='plantFront';
    // lovely small plant and vase near the front of the shelf
    m.cylinder(3.92,.18,2.72,.20,.21,.31,'#c89983',12);
    for(let k=0;k<5;k++){const a=k*Math.PI*2/5;m.sphere(3.92+Math.cos(a)*.19,.49,2.72+Math.sin(a)*.16,.17,.21,.14,k%2?'#88a185':'#9eaf8d',9,6)}
    m.group='archive';
    // neatly stacked archives near the back wall
    m.box(-1.62,.29,-2.10,.60,.57,.45,C.woodLight);
    m.box(-1.62,.65,-2.10,.60,.09,.45,C.woodLight);
    m.group='archiveDecor';m.box(-1.63,.77,-2.10,.41,.16,.31,'#e3c6bd');
    m.group='desk';
    // Shared construction details follow their named furniture group.
    m.box(dx,1.187,dz,2.69,.018,1.23,'#f0d7b6');
    m.box(dx,1.01,dz+.62,2.65,.06,.035,'#b49172');
    for(const side of [-1,1]){m.box(dx+side*1.17,.12,dz+.47,.15,.045,.17,'#b09278');m.box(dx+side*1.17,.90,dz,.075,.065,1.0,C.wood);}
    m.box(dx,1.205,dz-.28,.46,.035,.30,'#aaa69d');
    m.box(dx,1.327,dz-.198,1.36,.035,.018,'#afa99c');
    m.sphere(dx+.58,1.328,dz-.18,.018,.012,.006,'#d8e6c7',7,4);
    m.box(dx-.33,1.76,dz-.165,.24,.20,.006,'#c6d1c1');
    for(let k=0;k<3;k++)m.box(dx+.17,1.81-k*.07,dz-.16,.42-k*.05,.015,.006,'#e8efe0');
    for(let j=0;j<2;j++){m.box(dx+1.05,.57+j*.33,dz+.358,.30,.012,.014,'#af8b6f');m.box(dx+1.05,.43+j*.33,dz+.38,.12,.025,.018,'#b48c6e');}
    m.cylinder(dx+1.15,1.19,dz-.33,.20,.18,.035,'#ac8b75',14);
    m.cylinder(dx+1.15,1.44,dz-.33,.04,.04,.28,'#b99677',10);
    m.cylinder(dx+1.15,1.45,dz-.33,.23,.23,.025,'#ead2ae',14);
    for(let j=0;j<3;j++)m.box(dx-.89,1.23+j*.004,dz+.25,.29,.002,.345,'#e4d4c0');
    m.box(dx-.89,1.244,dz+.25,.31,.008,.37,'#c59896');
    m.group='books';for(let row=0;row<4;row++){const y=.46+row*.64;m.box(bx,y+.025,bz+.46,1.93,.028,.025,'#ead0ac');}
    for(let j=0;j<3;j++){m.box(bx-.62+j*.61,.24,bz+.446,.15,.07,.009,'#ede1cf');m.box(bx-.62+j*.61,.24,bz+.454,.09,.012,.004,'#a78a73');}
    m.group='books';
    // A pair of horizontal volumes breaks up the repeated vertical book spines.
    for(let j=0;j<3;j++)m.box(bx+.56,.60+j*.052,bz+.31,.37,.04,.31,['#b6bda9','#c8a3a0','#e5ceb1'][j]);
    m.group='wardrobe';for(const side of [-1,1]){m.box(wx+side*.80,1.20,wz+.585,.035,2.08,.022,'#f2dcc3');m.box(wx+side*.43,.25,wz+.59,.66,.035,.025,'#bf9a79');m.box(wx+side*.43,2.16,wz+.59,.66,.035,.025,'#f0d7ba');}
    for(const side of [-1,1])m.box(wx+side*.12,1.24,wz+.617,.027,.19,.022,'#b99970');
    m.group='mirror';m.box(mx,1.35,mz+.104,.62,1.96,.006,'#c6c7c2');
    m.quad([mx-.27,.43,mz+.11],[mx-.08,.43,mz+.11],[mx+.24,2.24,mz+.11],[mx+.10,2.24,mz+.11],'#e5e4db',1);
    m.group='creative';for(let j=0;j<3;j++){m.box(sx,.45+j*.67,sz+.34,1.67,.025,.025,'#f1dabb');m.box(sx,.29+j*.67,sz-.30,1.48,.12,.025,'#c6a88a');}
    m.group='board';for(let j=0;j<4;j++)m.box(-.44,2.03+j*.22,-3.505,1.78,.004,.008,'#c6ad91');
    for(const [col,x,y,w,h] of notes){m.box(x,y+.02,-3.474,w*.65,.012,.005,'#bba997');m.box(x,y-.04,-3.474,w*.48,.008,.005,'#bba997');}
    m.group='architecture';
    // Fine board seams and one broken joint per plank, with restrained oak variation in the shader.
    for(let i=0;i<13;i++){const xx=-4.6+i*.78;m.box(xx+.38,.029,((i%3)-1)*2.2,.75,.002,.012,'#c9b397');}
    m.group='window';m.box(2.65,1.79,-3.52,2.49,.10,.32,'#e4c9a5');
    for(let k=0;k<5;k++)m.box(1.47+k*.045,2.60,-3.45,.012,1.68,.008,'#d8c5b7');
    // Alpha-interpolated contact shadows are cheap static geometry, not shadow maps.
    for(const [group,x,z,rx,rz,a,y] of [['desk',2.13,-1.6,1.56,.85,.25,.052],['books',-3.45,-2.85,1.35,.65,.28,.054],['wardrobe',-3.74,1.5,1.15,.75,.27,.056],['creative',3.48,1.73,1.05,.57,.26,.058],['dressSeat',-3.10,2.65,.52,.40,.22,.072],['living',1.28,2.51,.65,.46,.20,.073]]){m.group=group;m.softShadow(x,y,z,rx,rz,a);}
    // Low storage connects the two wall-facing zones without projecting into the living area.
    m.group='world';
    m.box(1.56,.60,-3.55,.78,1.08,1.04,C.woodLight);
    m.box(1.56,1.18,-3.55,.88,.10,1.12,'#e4c8ab');
    for(let j=0;j<3;j++){m.box(1.56,.25+j*.31,-3.018,.65,.25,.027,'#e5cbb1');m.box(1.56,.25+j*.31,-2.995,.18,.025,.024,'#b48c6e');}

    return new Float32Array(m.arr);
  }
  // A small rose-gold phone on its matching desk stand; independent hover lighting.
  const PHONE_SOURCE=[2.96,1.50,-1.14],PHONE=L.points.phone;
  function buildPhone(){
    const m=new Mesh('desk'),[x,y,z]=PHONE_SOURCE;
    m.box(x,1.205,z-.04,.37,.04,.30,'#c3a08d');
    m.box(x,1.29,z-.07,.09,.16,.07,'#b88e7e');
    const rounded=(w,h,d,col,zz)=>{
      const r=.035;
      m.box(x,y,zz,w-2*r,h,d,col);m.box(x,y,zz,w,h-2*r,d,col);
      for(const a of [-1,1])for(const b of [-1,1])m.sphere(x+a*(w/2-r),y+b*(h/2-r),zz,r,r,d/2,col,10,6);
    };
    rounded(.32,.57,.055,'#bc9185',z);
    rounded(.295,.545,.012,'#5d4d4c',z+.034);
    rounded(.268,.512,.008,'#edcdc2',z+.043);
    m.box(x,y+.225,z+.051,.09,.018,.006,'#66524e');
    m.sphere(x,y+.10,z+.053,.055,.055,.004,'#fff5e7',12,8);
    m.box(x,y-.01,z+.052,.16,.013,.005,'#b48180');
    for(let k=0;k<3;k++)m.box(x-.081+k*.081,y-.13,z+.052,.064,.11,.005,['#aebba6','#c59b9a','#d5b286'][k]);
    m.box(x,y-.231,z+.053,.07,.009,.005,'#fff3e6');
    m.box(x+.165,y+.07,z,.012,.075,.024,'#d5b5a0');
    return new Float32Array(m.arr);
  }
  const ALBUM_FRAMES=L.frames;
  function frameCorners(f,inset=0){const [x,y,z]=f.point,w=f.width/2-inset,h=f.height/2-inset;
    return f.side?[[x,y-h,z+w],[x,y-h,z-w],[x,y+h,z-w],[x,y+h,z+w]]:[[x-w,y-h,z],[x+w,y-h,z],[x+w,y+h,z],[x-w,y+h,z]];
  }
  function buildAlbumFrame(f){const m=new Mesh('world'),[x,y,z]=f.point;
    if(f.side){m.box(x-.045,y,z,.10,f.height+.025,f.width+.025,'#b7967c');m.box(x+.01,y,z,.028,f.height,f.width,'#e5c6a3');m.box(x+.03,y,z,.012,f.height-.07,f.width-.07,'#fff7e9');}
    else{m.box(x,y,z-.045,f.width+.025,f.height+.025,.10,'#b7967c');m.box(x,y,z+.01,f.width,f.height,.028,'#e5c6a3');m.box(x,y,z+.03,f.width-.07,f.height-.07,.012,'#fff7e9');}
    const photo=frameCorners(f,.075).map(p=>f.side?[p[0]+.04,p[1],p[2]]:[p[0],p[1],p[2]+.04]);m.photoQuad(photo);
    return new Float32Array(m.arr);
  }
  class Studio3D{
    constructor(canvas,layer,onZone){this.canvas=canvas;this.layer=layer;this.onZone=onZone;const viewName=typeof URLSearchParams==='function'?new URLSearchParams(window.location?.search||'').get('view'):null;const initial=L.views[viewName]||L.views.panorama;this.theta=initial.theta;this.elevation=initial.elevation;this.zoom=initial.zoom;this.target={...initial,center:[...initial.center]};this.center=[...initial.center];this.zone=null;this.last=-1;this.dragging=false;this.dragDist=0;this.phoneHovered=false;this.phoneLight=0;this.points={...L.points};this.labels={computer:['▣','项目电脑'],books:['▤','研究书架'],skills:['✧','能力任务板'],creative:['✿','创作架'],wardrobe:['♧','换装衣柜']};this.init();}
    init(){const gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true})||this.canvas.getContext('experimental-webgl');if(!gl)throw new Error('WebGL unavailable');this.gl=gl;const vs=ROOM_VS;const fs=ROOM_FS;const compile=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));this.program=program;this.aPos=gl.getAttribLocation(program,'aPos');this.aColor=gl.getAttribLocation(program,'aColor');this.aNormal=gl.getAttribLocation(program,'aNormal');this.aSurface=gl.getAttribLocation(program,'aSurface');this.aUV=gl.getAttribLocation(program,'aUV');this.mvpLoc=gl.getUniformLocation(program,'uMVP');this.bobLoc=gl.getUniformLocation(program,'uBob');this.highlightLoc=gl.getUniformLocation(program,'uHighlight');this.phoneMesh=buildPhone();this.phoneBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.phoneBuf);gl.bufferData(gl.ARRAY_BUFFER,this.phoneMesh,gl.STATIC_DRAW);this.staticMesh=buildRoom();this.staticBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuf);gl.bufferData(gl.ARRAY_BUFFER,this.staticMesh,gl.STATIC_DRAW);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.enableVertexAttribArray(this.aPos);gl.enableVertexAttribArray(this.aColor);gl.enableVertexAttribArray(this.aNormal);gl.enableVertexAttribArray(this.aSurface);gl.enableVertexAttribArray(this.aUV);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.initAlbumFrames();this.makeHotspots();this.makePhoneTarget();this.setupControls();this.raf=requestAnimationFrame(t=>this.frame(t));}
    initAlbumFrames(){
      const gl=this.gl,photos=window.StudioAlbumData?window.StudioAlbumData.photos():[];
      this.albumFrames=ALBUM_FRAMES.map((definition,i)=>{
        const mesh=buildAlbumFrame(definition),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([222,201,177,255]));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const photo=photos[i%Math.max(photos.length,1)],path=window.StudioAlbumData?.localImage(photo?.thumbnail);
        if(path&&typeof Image!=='undefined'){const img=new Image();img.onload=()=>{if(this.destroyed)return;try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);}catch{/* A missing or file-origin-blocked thumbnail keeps the neutral insert. */}};img.src=path;}
        const b=document.createElement('button');b.type='button';b.className='album-target';b.dataset.zone='album'+i;b.setAttribute('aria-label','打开生活相册，相框'+(i+1));b.innerHTML='<span class="album-hint">我的生活碎片 ♡</span>';
        const f={...definition,mesh,buffer,texture,button:b,hover:false,light:0};
        b.addEventListener('click',()=>this.onZone('album:'+i));for(const event of ['pointerenter','focus'])b.addEventListener(event,()=>f.hover=true);for(const event of ['pointerleave','blur'])b.addEventListener(event,()=>f.hover=false);
        this.layer.appendChild(b);return f;
      });
    }
    albumHit(px,py){
      if(!this.mvp)return -1;
      return this.albumFrames.findIndex(f=>{const p=frameCorners(f).map(v=>this.project(v));const signs=p.map((a,i)=>{const b=p[(i+1)%4];return (b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0])});return signs.every(v=>v>=0)||signs.every(v=>v<=0)});
    }
    focusAlbum(index){this.beforeAlbum={...this.target,center:[...this.target.center]};const f=this.albumFrames[index%this.albumFrames.length];this.zone='album';this.target={theta:.86,elevation:.54,zoom:1.17,center:[f.point[0]*.38,1.95,-1.75]};}
    leaveAlbum(restore=true){if(restore&&this.beforeAlbum)this.target={...this.beforeAlbum,center:[...this.beforeAlbum.center]};this.beforeAlbum=null;this.zone=null;}
    makeHotspots(){for(let id of ['books','computer','skills','wardrobe','creative']){const b=document.createElement('button');b.type='button';b.className='hotspot';b.dataset.zone=id;b.innerHTML=`<span class="hotspot-icon">${this.labels[id][0]}</span><span>${this.labels[id][1]}</span>`;b.addEventListener('click',()=>this.onZone(id));this.layer.appendChild(b)}}
    makePhoneTarget(){
      const b=document.createElement('button');b.type='button';b.className='phone-target';b.dataset.zone='phone';
      b.setAttribute('aria-label','打开桌面手机，查看抖音主页');
      b.innerHTML='<span class="phone-target-label">▯ 桌面手机</span>';
      b.addEventListener('click',()=>this.onZone('phone'));
      for(const event of ['pointerenter','focus'])b.addEventListener(event,()=>this.setPhoneHover(true));
      for(const event of ['pointerleave','blur'])b.addEventListener(event,()=>this.setPhoneHover(false));
      this.layer.appendChild(b);this.phoneTarget=b;
    }
    setPhoneHover(value){this.phoneHovered=!!value;this.phoneTarget.classList.toggle('hovered',this.phoneHovered)}
    hitPhone(px,py){
      if(!this.mvp)return false;
      const p=[[-.17,-.29],[.17,-.29],[.17,.29],[-.17,.29]].map(([x,y])=>this.project(L.point('desk',[PHONE_SOURCE[0]+x,PHONE_SOURCE[1]+y,PHONE_SOURCE[2]+.055])));
      return px>=Math.min(...p.map(v=>v[0]))-5&&px<=Math.max(...p.map(v=>v[0]))+5&&py>=Math.min(...p.map(v=>v[1]))-5&&py<=Math.max(...p.map(v=>v[1]))+5;
    }
    focusPhone(){
      this.beforePhone={...this.target,center:[...this.target.center]};this.zone='phone';this.setPhoneHover(false);
      this.target={...L.views.work,zoom:1.60,center:[...L.views.work.center]};
    }
    leavePhone(restore=true){if(restore&&this.beforePhone)this.target={...this.beforePhone,center:[...this.beforePhone.center]};this.beforePhone=null;this.zone=null;this.setPhoneHover(false)}
    setupControls(){const c=this.canvas;this._controlHandlers=[];const listen=(name,handler,options)=>{c.addEventListener(name,handler,options);this._controlHandlers.push([name,handler,options]);};listen('pointerdown',e=>{this.dragging=true;this.dragDist=0;this.px=e.clientX;this.py=e.clientY;c.setPointerCapture(e.pointerId)});listen('pointerleave',()=>{this.setPhoneHover(false);this.albumFrames.forEach(f=>f.hover=false)});listen('pointermove',e=>{if(!this.dragging){const r=c.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;this.setPhoneHover(this.hitPhone(px,py));const hit=this.albumHit(px,py);this.albumFrames.forEach((f,i)=>f.hover=i===hit);return;}this.setPhoneHover(false);let dx=e.clientX-this.px,dy=e.clientY-this.py;this.dragDist+=Math.abs(dx)+Math.abs(dy);this.px=e.clientX;this.py=e.clientY;this.target.theta=clamp(this.target.theta+dx*.006,-.16,1.54);this.target.elevation=clamp(this.target.elevation+dy*.004,.32,1.12)});listen('pointerup',e=>{this.dragging=false;if(this.dragDist<9){let r=this.canvas.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;if(this.hitPhone(px,py)){this.onZone('phone');return}const albumIndex=this.albumHit(px,py);if(albumIndex>=0){this.onZone('album:'+albumIndex);return}let match=null,distance=Infinity;for(let [id,p] of Object.entries(this.points)){if(id==='phone')continue;const coord=this.project(p);const d=Math.hypot(px-coord[0],py-coord[1]);if(d<distance){distance=d;match=id}}if(distance<87&&match)this.onZone(match)}});listen('pointercancel',()=>this.dragging=false);listen('wheel',e=>{e.preventDefault();this.target.zoom=clamp(this.target.zoom+(e.deltaY>0?-.095:.095),.67,1.75)},{passive:false})}
    focus(id){this.zone=id;let p=this.points[id];if(!p)return;const view=L.views[id==='computer'||id==='skills'?'work':id]||L.views.panorama;this.target={...view,center:[...view.center]};this.layer.querySelectorAll('.hotspot').forEach(b=>b.classList.toggle('active',b.dataset.zone===id))}
    reset(){this.zone=null;this.target={...L.views.panorama,center:[...L.views.panorama.center]};this.layer.querySelectorAll('.hotspot').forEach(b=>b.classList.remove('active'))}
    changeZoom(dir){this.target.zoom=clamp(this.target.zoom+dir*.13,.67,1.75)}
    resize(){let dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h)}this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;let aspect=w/Math.max(1,h),height=L.viewHeight/this.zoom;const view=lookAt(this.eye(),this.center,[0,1,0]);const proj=ortho(-height*aspect/2,height*aspect/2,-height/2,height/2,.1,80);this.mvp=mul(proj,view)}
    eye(){const dist=18;return [this.center[0]+Math.cos(this.elevation)*Math.cos(this.theta)*dist,this.center[1]+Math.sin(this.elevation)*dist,this.center[2]+Math.cos(this.elevation)*Math.sin(this.theta)*dist]}
    project(pos){const r=transformed(this.mvp,pos);return [(r[0]/r[3]*.5+.5)*this.w,(-r[1]/r[3]*.5+.5)*this.h]}
    renderBuffer(buf,n,usage){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buf);if(usage)gl.bufferData(gl.ARRAY_BUFFER,usage,gl.DYNAMIC_DRAW);gl.vertexAttribPointer(this.aPos,3,gl.FLOAT,false,48,0);gl.vertexAttribPointer(this.aColor,3,gl.FLOAT,false,48,12);gl.vertexAttribPointer(this.aNormal,3,gl.FLOAT,false,48,24);gl.vertexAttribPointer(this.aSurface,1,gl.FLOAT,false,48,36);gl.vertexAttribPointer(this.aUV,2,gl.FLOAT,false,48,40);gl.drawArrays(gl.TRIANGLES,0,n/12)}
    frame(t){if(!this.gl)return;if(!this.canvas.clientWidth||!this.canvas.clientHeight){this.raf=requestAnimationFrame(time=>this.frame(time));return;}this.theta+=(this.target.theta-this.theta)*.10;this.elevation+=(this.target.elevation-this.elevation)*.10;this.zoom+=(this.target.zoom-this.zoom)*.10;for(let i=0;i<3;i++)this.center[i]+=(this.target.center[i]-this.center[i])*.09;this.resize();const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.mvpLoc,false,new Float32Array(this.mvp));gl.uniform1f(this.bobLoc,0);gl.uniform1f(this.highlightLoc,0);this.renderBuffer(this.staticBuf,this.staticMesh.length);for(const f of this.albumFrames){f.light+=((f.hover?1:0)-f.light)*.18;gl.uniform1f(this.highlightLoc,f.light);gl.bindTexture(gl.TEXTURE_2D,f.texture);this.renderBuffer(f.buffer,f.mesh.length);}this.phoneLight+=((this.phoneHovered?1:0)-this.phoneLight)*.18;gl.uniform1f(this.highlightLoc,this.phoneLight);this.renderBuffer(this.phoneBuf,this.phoneMesh.length);gl.uniform1f(this.highlightLoc,0);this.placeHotspots();this.raf=requestAnimationFrame(time=>this.frame(time))}
    placeHotspots(){for(const f of this.albumFrames){const p=frameCorners(f).map(v=>this.project(v)),xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),left=Math.min(...xs),top=Math.min(...ys);Object.assign(f.button.style,{left:left+'px',top:top+'px',width:Math.max(22,Math.max(...xs)-left)+'px',height:Math.max(22,Math.max(...ys)-top)+'px',display:left<0||left>this.w-10||top<0||top>this.h-10?'none':'block'});}for(let b of this.layer.children){const id=b.dataset.zone;if(!id||id.startsWith('album')||!this.points[id])continue;const point=this.points[id],p=this.project(point),offset=this.w<560?L.compactLabelOffsets?.[id]:null;if(offset){p[0]+=offset[0];p[1]+=offset[1];}b.style.left=p[0]+'px';b.style.top=p[1]+'px';b.style.display=p[0]<20||p[0]>this.w-5||p[1]<0||p[1]>this.h?'none':'flex'}}
    removeControls(){for(const args of this._controlHandlers||[])this.canvas.removeEventListener?.(...args);this._controlHandlers=[];}
    destroy(){this.removeControls();this.destroyed=true;cancelAnimationFrame(this.raf);for(const f of this.albumFrames){this.gl.deleteBuffer(f.buffer);this.gl.deleteTexture(f.texture)}}
  }
  window.STUDIO_GEOMETRY={buildRoom,buildPhone,buildAlbumFrame,frameCorners,vertexShader:ROOM_VS,fragmentShader:ROOM_FS};
  window.Studio3D=Studio3D;
})();
