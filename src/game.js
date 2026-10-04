(()=>{
const cv=document.getElementById('c'),X=cv.getContext('2d');
const DEBUG=/[?&]debug=1/.test(location.search);
let W=400,H=760,DPR=1,SC=1;
function resize(){const vw=innerWidth,vh=innerHeight;DPR=Math.min(devicePixelRatio||1,2.5);SC=vw/400;W=400;H=vh/SC;
  cv.width=Math.round(vw*DPR);cv.height=Math.round(vh*DPR);cv.style.width=vw+'px';cv.style.height=vh+'px'}
addEventListener('resize',resize);resize();
const R=Math.random,rr=(a,b)=>a+R()*(b-a),pick=a=>a[(R()*a.length)|0],clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3);
// ---------------- state ----------------
const HATS=['#e53935','#1e88e5','#8e24aa','#43a047','#fb8c00','#ec407a','#fdd835'];
let hatA=+(localStorage.getItem('wwp_hatA')||0),hatZ=+(localStorage.getItem('wwp_hatZ')||2);
let best=+(localStorage.getItem('wwp_best')||0);
let state='title',T=0,runT=0,dist=0,speed=0;const RUN=150;
let card=null,TS=1,seen=[],cards=0,bumps=0,tiltOn=false,tiltG=null;
let canoe,objs,shots,parts,floats,decor,hearts,regen,shooter,score,splashes,treasure,dadFalls,missStreak,lastPraise,lastMiss,nextBig,section,banner,dadSeq,endT,shake,spawnT,treasureT,obstT,decorY,camp;
const SECTIONS=[
 {n:'Sunny Stream',icon:'☀️',col:'#ffa000',at:0,water:['#4fd1ee','#2fb4dc'],grass:'#7fd35b',sand:'#f7dc94',sky:null},
 {n:'Duck Pond Bend',icon:'🦆',col:'#2e9b5a',at:0.25,water:['#5ad6e0','#33b8c9'],grass:'#86d45e',sand:'#f4d58a',sky:null},
 {n:'Beaver Rapids',icon:'🦫',col:'#8d5a2b',at:0.5,water:['#45c3ea','#2a9fd0'],grass:'#6cc653',sand:'#ead08a',sky:null},
 {n:'Sunset Camp',icon:'🌅',col:'#ff5ca8',at:0.76,water:['#f6a96b','#c779a8'],grass:'#7fb85a',sand:'#f2c58a',sky:1}];
function riverC(wy){return 200+Math.sin(wy*0.0021)*62+Math.sin(wy*0.00083+1)*30}
function riverW(wy){const p=wy/(RUN*112);const pond=(p>0.27&&p<0.47)?Math.sin((p-0.27)/0.2*Math.PI)*60:0;return 255+Math.sin(wy*0.0013)*20+pond}
const CY=()=>H*0.7; // canoe center screen y
const sy=wy=>CY()-(wy-dist);
function reset(){canoe={x:riverC(0),tx:riverC(0),vx:0,wob:0,tilt:0,inv:0,bob:0,armA:0,armZ:0,cheer:0};
  objs=[];shots=[];parts=[];floats=[];decor=[];hearts=3;regen=0;shooter='alex';score=0;splashes=0;treasure=0;dadFalls=0;missStreak=0;lastPraise=-9;lastMiss=-9;
  nextBig=30;section=0;banner=null;dadSeq=null;endT=0;shake=0;spawnT=1.2;treasureT=1.5;obstT=3;decorY=-400;runT=0;dist=0;speed=0;camp=false;card=null;seen=[];cards=0;bumps=0;fillDecor()}
// ---------------- decor (trees, birches, lighthouse, tent) ----------------
function fillDecor(){while(decorY<dist+H+300){decorY+=rr(26,46);for(const side of[-1,1]){if(R()<0.75){const c=riverC(decorY),w=riverW(decorY);
  const off=w/2+rr(26,150);const x=c+side*off;if(x<-40||x>440)continue;const p=decorY/(RUN*112);
  const r=R();let k=r<0.33?'pine':r<0.5?'birch':r<0.6?'bush':r<0.7?'flower':r<0.77?'mushroom':r<0.83?'rockb':r<0.86?'picnic':r<0.875?'cabin':r<0.89?'deer':'flower';
  if(off<w/2+48&&R()<0.55)k='cattail';if((k==='cabin'||k==='picnic')&&off<w/2+70)k='bush';
  decor.push({k,x,wy:decorY,s:rr(0.8,1.25),side,ph:R()*9,c:pick(['#ff6b8b','#ffd23f','#c387ff','#fff'])})}
  if(R()<0.16)decor.push({k:'lily',x:riverC(decorY)+side*(riverW(decorY)/2-rr(14,34)),wy:decorY,s:rr(0.8,1.2),ph:R()*9,fl:R()<0.4})}
  const p=decorY/(RUN*112);
  if(p>0.8&&p<0.81&&!decor.some(d=>d.k==='lighthouse'))decor.push({k:'lighthouse',x:riverC(decorY)+riverW(decorY)/2+80,wy:decorY,s:1});
  if(R()<0.05)decor.push({k:'dragonfly',x:rr(60,340),wy:decorY,s:1,ph:R()*9});if(R()<0.04)decor.push({k:'butterfly',x:rr(20,380),wy:decorY,s:1,ph:R()*9,c:pick(['#ff8a3d','#c387ff','#5ec8ff','#ffd23f'])})}
  decor=decor.filter(d=>sy(d.wy)<H+120);decor.sort((a,b)=>b.wy-a.wy)}
// ---------------- spawning ----------------
const TGT={duck:{r:20,hp:1,pts:10},paddler:{r:28,hp:1,pts:20},tuber:{r:24,hp:1,pts:15},frog:{r:20,hp:1,pts:15},bear:{r:30,hp:1,pts:30,bank:1},
  fish:{r:18,hp:1,pts:25},beaver:{r:34,hp:2,pts:40},raft:{r:34,hp:3,pts:50},sprinkler:{r:22,hp:1,pts:15,bank:1}};
function spawnTarget(k,x,wy){const d=TGT[k];const o={type:'t',k,x,wy,r:d.r,hp:d.hp,pts:d.pts,hit:0,ht:0,ph:R()*9,vx:0,done:0,flip:R()<0.5?-1:1};
  if(k==='duck'){o.ducklings=R()<0.5?(1+R()*3|0):0;o.vx=rr(-12,12)}
  if(k==='raft'){o.vx=rr(-30,30)}
  if(k==='fish'){o.jump=0;o.jt=rr(0.5,1.5)}
  objs.push(o);return o}
function sectionIx(){const p=runT/RUN;let s=0;SECTIONS.forEach((S,i)=>{if(p>=S.at)s=i});return s}
function spawnStuff(dt){if(runT>RUN-6)return;const wy=dist+CY()+70,c=riverC(wy),w=riverW(wy),s=sectionIx();
  if(card&&card.t<2.4)return;spawnT-=dt;if(spawnT<=0){spawnT=rr(1.1,1.8)-s*0.1;
    const pool=[['duck','duck','paddler','tuber','frog','fish','bear','sprinkler'],['duck','duck','duck','frog','frog','paddler','tuber','fish','bear'],['beaver','paddler','raft','duck','tuber','fish','bear','frog','sprinkler'],['duck','paddler','tuber','raft','fish','bear','frog']][s];
    const k=pick(pool);const def=TGT[k];
    if(def.bank){const side=R()<0.5?-1:1;spawnTarget(k,c+side*(w/2+22),wy).side=side}
    else if(k==='beaver'){const side=R()<0.5?-1:1;const o=spawnTarget(k,c+side*(w/2-34),wy);o.side=side}
    else spawnTarget(k,c+rr(-w/2+30,w/2-30),wy)}
  treasureT-=dt;if(treasureT<=0){treasureT=rr(0.9,1.6);let k=pick(['coin','coin','coin','ducky','popsicle','smore','cherry','icecream','beachball']);if(R()<0.06)k='chest';
    const lane=c+rr(-w/2+40,w/2-40);const n=k==='coin'?3+(R()*3|0):1;for(let i=0;i<n;i++)objs.push({type:'g',k,x:lane+Math.sin(i*0.8)*14,wy:wy+i*34,r:k==='chest'?22:16,ph:R()*9})}
  obstT-=dt;if(obstT<=0){obstT=rr(3.0,4.4)-s*0.3;const k=s===2?pick(['rock','log','rapids','rapids']):pick(['rock','rock','log','rapids']);
    const side=R()<0.5?-1:1;const x=c+side*rr(w*0.12,w*0.36);objs.push({type:'o',k,x,wy,r:k==='log'?18:k==='rapids'?44:22,ph:R()*9,ang:rr(-0.3,0.3),len:rr(70,95)})}
  if(runT>nextBig&&!dadSeq){nextBig=runT+rr(42,52);objs.push({type:'o',k:'big',x:canoe.x,wy:wy+40,r:40,ph:0})}}
// ---------------- input ----------------
const ptrs={};
function toGame(e){return{x:e.clientX/SC,y:e.clientY/SC}}
function inRect(p,r){return p.x>=r[0]&&p.x<=r[0]+r[2]&&p.y>=r[1]&&p.y<=r[1]+r[3]}
let ui={};
cv.addEventListener('pointerdown',e=>{e.preventDefault();const p=toGame(e);
  if(state==='title'){titleTap(p);return}
  if(state==='end'){if(endT>1.2&&ui.again&&inRect(p,ui.again)){startGame()}else if(endT>1.2&&ui.home&&inRect(p,ui.home)){goTitle()}return}
  if(ui.mute&&inRect(p,ui.mute)){AUD.setMuted(!AUD.muted);return}
  if(card&&card.t<2.3)card.t=2.3;
  if(state!=='play'){if(dadSeq&&dadSeq.t>4.2&&dadSeq.t<9)dadSeq.t=Math.max(dadSeq.t,9.6);return}
  if(ui.sw&&inRect(p,ui.sw)){switchShooter();return}
  const steer=p.y>CY()-40;ptrs[e.pointerId]={sx:p.x,sy:p.y,cx0:canoe.tx,steer};
  if(steer)canoe.tx=p.x;else fire(p.x,p.y)},{passive:false});
cv.addEventListener('pointermove',e=>{const q=ptrs[e.pointerId];if(!q)return;const p=toGame(e);
  if(!q.steer&&Math.abs(p.x-q.sx)>28){q.steer=true;q.rel=true;q.cx0=canoe.tx;q.sx=p.x}
  if(q.steer){canoe.tx=q.rel?q.cx0+(p.x-q.sx)*1.3:p.x}});
cv.addEventListener('click',e=>{if(state!=='title'||!titleUI.tilt)return;const p=toGame(e);if(inRect(p,titleUI.tilt))toggleTilt()});
function onTilt(e){if(e.gamma==null)return;const ang=(screen.orientation&&screen.orientation.angle)||window.orientation||0;const v=ang==90?e.beta:(ang==-90||ang==270)?-e.beta:e.gamma;tiltG=clamp((v||0)/22,-1,1)}
function toggleTilt(){if(tiltOn){tiltOn=false;tiltG=null;removeEventListener('deviceorientation',onTilt);AUD.SFX.pop();return}
  const D=window.DeviceOrientationEvent;if(!D)return;const go=()=>{tiltOn=true;addEventListener('deviceorientation',onTilt);AUD.SFX.boing()};
  try{if(typeof D.requestPermission==='function'){D.requestPermission().then(r=>{if(r==='granted')go()}).catch(()=>{})}else go()}catch(e){}}
const canTilt=('DeviceOrientationEvent' in window)&&(('ontouchstart' in window)||navigator.maxTouchPoints>0);
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,e=>{delete ptrs[e.pointerId]}));
addEventListener('keydown',e=>{if(state!=='play')return;if(e.key==='ArrowLeft')canoe.tx-=40;if(e.key==='ArrowRight')canoe.tx+=40;if(e.key===' ')switchShooter()});
function switchShooter(){shooter=shooter==='alex'?'zoe':'alex';AUD.SFX.boing();floatText(shooter==='alex'?'Alex!':'Zoe!',ui.sw[0]+50,ui.sw[1]-10,shooter==='alex'?HATS[hatA]:HATS[hatZ])}
function seatPos(who){const c=canoeGeom();return who==='alex'?{x:c.x+Math.sin(c.a)*46,y:c.y-46}:who==='zoe'?{x:c.x,y:c.y}:{x:c.x-Math.sin(c.a)*46,y:c.y+46}}
function canoeGeom(){return{x:canoe.x,y:CY()+Math.sin(T*2.2)*2,a:canoe.tilt}}
function fire(x,y){// aim assist: snap to nearest live target near the tap
  let bestO=null,bd=shooter==='zoe'?135:110;for(const o of objs){if(o.type!=='t'||o.hit>=o.hp)continue;const d=Math.hypot(o.x-x,sy(o.wy)-y);if(d<bd){bd=d;bestO=o}}
  if(bestO){x=bestO.x;y=sy(bestO.wy)}
  const s=seatPos(shooter);
  if(shooter==='alex'){canoe.armA=0.35;AUD.SFX.squirt();for(let i=0;i<7;i++)shots.push({k:'jet',x:s.x,y:s.y-14,tx:x,ty:y,t:-i*0.035,dur:0.28,lead:i===0,tgt:bestO,wy0:dist})}
  else{canoe.armZ=0.5;AUD.SFX.toss();shots.push({k:'bal',x:s.x,y:s.y-14,tx:x,ty:y,t:0,dur:0.6,tgt:bestO,wy0:dist,col:pick(['#ff5ca8','#ffd23f','#7ee081','#5ec8ff','#c387ff'])})}}
function impact(sh){const big=sh.k==='bal';const rad=big?88:44;let hitAny=false,nh=0;
  for(const o of objs){if(o.type!=='t'||o.hit>=o.hp)continue;const oy=sy(o.wy);if(Math.hypot(o.x-sh.ex,oy-sh.ey)<o.r+rad*(big?1:0.6)){hitAny=true;nh++;hitTarget(o,big?'zoe':'alex')}}
  if(nh>=2&&runT-lastPraise>1)if(AUD.say('t6',2))lastPraise=runT;
  if(big){AUD.SFX.pop();AUD.SFX.splash(true);burst(sh.ex,sh.ey,26,sh.col,1.4);ring(sh.ex,sh.ey,70)}else{burst(sh.ex,sh.ey,6,'#bff2ff',0.8);if(sh.lead)ring(sh.ex,sh.ey,30)}
  if(sh.lead||big){if(hitAny)missStreak=0;else{missStreak++;if(missStreak>=3&&runT-lastMiss>9&&runT-lastPraise>2.5){if(AUD.say(pick(['miss','miss2']),1)){lastMiss=runT;missStreak=0}}}}}
function hitTarget(o,who){o.hit++;o.ht=0;splashes++;const oy=sy(o.wy);burst(o.x,oy,14,'#d8f6ff',1.1);ring(o.x,oy+6,o.r+30);
  if(o.hit<o.hp){AUD.SFX.splash();floatText('SPLASH!',o.x,oy-30,'#fff');return}
  const pts=o.pts;score+=pts;floatText('+'+pts,o.x,oy-34,'#fff59d');
  const S=AUD.SFX;({duck:()=>S.quack(),frog:()=>S.ribbit(),paddler:()=>{S.laughMan();S.splash()},tuber:()=>{S.giggle(true);S.splash()},bear:()=>{S.laughMan();S.splash(true)},fish:()=>S.splash(),beaver:()=>{S.boing()},raft:()=>{S.giggle();S.cheer()},sprinkler:()=>S.splash()}[o.k]||S.splash)();
  if(o.k==='paddler'||o.k==='raft'||o.k==='tuber')o.splashBack=0.5;
  canoe.cheer=1.2;
  if(runT-lastPraise>(o.k==='raft'||o.k==='bear'||o.k==='beaver'?1.2:2.6)){const pool=who==='zoe'?['z1','z2','z3','z4','z5','z6','z7','zoe','yay']:['a1','a2','a3','a4','a5','a6','a7','alex','splash'];
    let k=pick(pool);if(o.k==='raft')k=pick(['t1','t4','t5']);if(o.k==='bear'&&R()<0.6)k='bear';if(o.k==='duck'&&R()<0.3)k='duck';if(AUD.say(k,1))lastPraise=runT}
  S.giggle(who==='zoe')}
// ---------------- particles ----------------
function burst(x,y,n,col,sp){for(let i=0;i<n;i++){const a=R()*TAU,v=rr(60,200)*sp;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80*sp,life:rr(0.4,0.8),t:0,r:rr(3,7)*sp,col})}}
function ring(x,y,r){parts.push({ring:1,x,y,t:0,life:0.7,r})}
function floatText(s,x,y,col){floats.push({s,x,y,t:0,col})}
function confetti(n){for(let i=0;i<n;i++)parts.push({x:rr(0,W),y:rr(-60,-10),vx:rr(-40,40),vy:rr(60,180),life:rr(2,3.5),t:0,r:rr(4,7),col:pick(['#ff5ca8','#ffd23f','#7ee081','#5ec8ff','#c387ff','#ff8a3d']),conf:1,rot:R()*6})}
// ---------------- update ----------------
function startGame(){reset();state='play';AUD.setTheme('play');showCard(0);AUD.say('ahoy',2)}
function showCard(i){card={i,t:0};cards++;seen.push(i);setTimeout(()=>AUD.say('s'+(i+1),2),i?400:1700)}
function goTitle(){state='title';AUD.setTheme('title')}
function update(dt){T+=dt;
  for(const p of parts){p.t+=dt;if(p.ring){p.y+=speed*dt;continue}p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.conf){p.rot+=dt*5;p.vx*=0.99}else p.vy+=420*dt}parts=parts.filter(p=>p.t<p.life);
  for(const f of floats){f.t+=dt;f.y-=40*dt}floats=floats.filter(f=>f.t<1.2);
  if(banner){banner.t+=dt;if(banner.t>2.6)banner=null}
  if(card){card.t+=dt;if(card.t>2.7)card=null}
  if(state==='end'){endT+=dt;if(endT<4&&R()<dt*3)confetti(6);return}
  if(state!=='play'&&state!=='dad')return;
  if(state==='dad'){updateDad(dt);return}
  runT+=dt;speed=lerp(speed,runT>RUN-3?40:card&&card.t<2.3?45:112,dt*1.5);dist+=speed*dt;fillDecor();
  const s=sectionIx();if(s!==section){section=s;showCard(s);AUD.SFX.fanfare();AUD.setTheme(s===3?'sunset':'play')}
  spawnStuff(dt);
  // steering (with Dad's gentle help keeping us off the banks)
  const c=riverC(dist),w=riverW(dist);
  if(tiltOn&&tiltG!=null&&!Object.values(ptrs).some(q=>q.steer)){const g=Math.abs(tiltG)<0.08?0:tiltG;canoe.tx=lerp(canoe.tx,c+g*(w/2-30),Math.min(1,dt*6))}
  for(const o of objs){if(o.type!=='o'||o.used||o.k==='rapids'||o.k==='big')continue;const oy=sy(o.wy),dy=CY()-oy;const hx=(o.k==='log'?o.len/2:o.r)+40;
    if(dy>60&&dy<260&&Math.abs(o.x-canoe.tx)<hx){canoe.tx+=(canoe.tx<o.x?-1:1)*dt*150}}// Dad steers away a little
  canoe.tx=clamp(canoe.tx,c-w/2+30,c+w/2-30);
  const ax=(canoe.tx-canoe.x)*9-canoe.vx*5.5;canoe.vx+=ax*dt;canoe.x+=canoe.vx*dt;canoe.x=clamp(canoe.x,c-w/2+26,c+w/2-26);
  canoe.wob*=Math.pow(0.12,dt);canoe.tilt=clamp(canoe.vx*0.0016,-0.25,0.25)+Math.sin(T*18)*canoe.wob*0.18;
  canoe.inv=Math.max(0,canoe.inv-dt);canoe.armA=Math.max(0,canoe.armA-dt);canoe.armZ=Math.max(0,canoe.armZ-dt);canoe.cheer=Math.max(0,canoe.cheer-dt);
  if(hearts<3){regen+=dt;if(regen>6){regen=0;hearts++;AUD.SFX.coin();floatText('🦺',40+hearts*34,40,'#fff')}}
  shake=Math.max(0,shake-dt);
  // shots
  for(const sh of shots){sh.t+=dt;if(sh.t<0)continue;const k=Math.min(1,sh.t/sh.dur);
    if(sh.tgt&&sh.tgt.hit<sh.tgt.hp){sh.tx=sh.tgt.x;sh.ty=sy(sh.tgt.wy)}else{sh.ty+=speed*dt}
    sh.px=lerp(sh.x,sh.tx,k);sh.py=lerp(sh.y,sh.ty,k)-(sh.k==='bal'?Math.sin(k*Math.PI)*90:0);sh.k2=k;
    if(k>=1&&!sh.done){sh.done=1;sh.ex=sh.tx;sh.ey=sh.ty;impact(sh)}}
  shots=shots.filter(s=>!s.done);
  // objects
  const cg=canoeGeom();
  for(const o of objs){o.ph+=dt;const oy=sy(o.wy);
    if(o.type==='t'){o.ht+=dt;o.x+=(o.vx||0)*dt;if(o.k==='duck'||o.k==='raft'){const cc=riverC(o.wy),ww=riverW(o.wy);if(o.x<cc-ww/2+30||o.x>cc+ww/2-30)o.vx*=-1}
      if(o.k==='fish'){o.jt-=dt;if(o.jt<0){o.jump=1;o.jt=rr(1.2,2);AUD.SFX.splash()}o.jump=Math.max(0,o.jump-dt*1.4)}
      if(o.hit>=o.hp&&o.k==='duck'){o.wy+=dt*160;o.x+=dt*80*o.flip}
      if(o.splashBack!=null&&o.splashBack>0){o.splashBack-=dt;if(o.splashBack<=0){o.splashBack=null;for(let i=0;i<8;i++)parts.push({x:o.x,y:oy,vx:(cg.x-o.x)*rr(0.8,1.2)+rr(-20,20),vy:(cg.y-oy)*1.1-150,life:0.9,t:0,r:rr(3,6),col:'#c8f1ff'});setTimeout(()=>{if(state==='play'){AUD.SFX.giggle(R()<0.5);canoe.cheer=1}},700)}}}
    else if(o.type==='g'){const ddx=cg.x-o.x,ddy=cg.y-oy;if(Math.hypot(ddx,ddy)<120){o.x+=ddx*dt*2.5;o.wy-=ddy*dt*1.2}if(!o.got&&Math.abs(o.x-cg.x)<38&&Math.abs(oy-cg.y)<78){o.got=1;const v={coin:5,ducky:15,popsicle:20,smore:25,cherry:15,icecream:20,beachball:15,chest:100}[o.k];score+=v;treasure++;AUD.SFX.coin();floatText('+'+v,o.x,oy-20,'#ffe066');burst(o.x,oy,8,'#ffe066',0.6);if(o.k==='chest'){confetti(30);AUD.SFX.fanfare();if(AUD.say('chest',2))lastPraise=runT}else if(o.k!=='coin'&&runT-lastPraise>3){if(AUD.say('treasure',1))lastPraise=runT}}}
    else if(o.type==='o'){
      if(o.k==='rapids'){if(Math.abs(o.x-cg.x)<o.r+10&&Math.abs(oy-cg.y)<50){canoe.wob=Math.max(canoe.wob,0.7);if(!o.used){o.used=1;AUD.SFX.whoosh();AUD.SFX.giggle(true)}}}
      else if(o.k==='big'){if(!o.used&&Math.abs(o.x-cg.x)<o.r+60&&oy>cg.y-110&&oy<cg.y+30){o.used=1;startDad(o)}}
      else if(!o.used&&canoe.inv<=0){const dx=Math.abs(o.x-cg.x),dy=Math.abs(oy-cg.y);const hx=o.k==='log'?o.len/2+16:o.r+18;if(dx<hx&&dy<o.r+64){o.used=1;bump(o)}}}}
  objs=objs.filter(o=>sy(o.wy)<H+120&&!(o.type==='g'&&o.got));
  if(runT>=RUN-4&&!camp){camp=true}
  if(runT>=RUN){finish()}}
function bump(o){hearts--;bumps++;canoe.wob=1;canoe.inv=2.2;shake=0.35;canoe.vx+=(canoe.x<o.x?-1:1)*260;AUD.SFX.bump();burst(o.x,sy(o.wy),10,'#d8f6ff',0.8);
  if(hearts<=0){startDad(o)}}
// ---------------- DAD SAVES THE DAY ----------------
function startDad(o){state='dad';dadFalls++;dadSeq={t:0,side:canoe.x<riverC(dist)?1:-1,rock:o};AUD.SFX.bump();shake=0.5;canoe.vx=0}
function updateDad(dt){const d=dadSeq,t0=d.t;d.t+=dt;const t=d.t;const at=x=>t0<x&&t>=x;
  canoe.wob*=Math.pow(0.3,dt);canoe.cheer=Math.max(0,canoe.cheer-dt);
  if(at(0.45)){AUD.SFX.splash(true);burst(canoe.x+d.side*-60,CY()+40,40,'#d8f6ff',1.9);ring(canoe.x+d.side*-52,CY()+60,90);ring(canoe.x+d.side*-52,CY()+60,50);shake=0.4}
  if(at(1.5)){AUD.say('dad',3);banner={s:'DAD SAVES THE DAY!',icon:'🦸',t:0,big:1};AUD.SFX.fanfare();confetti(40)}
  if(at(2.2)){AUD.SFX.cheer();canoe.cheer=2}
  if(at(3.2)){AUD.SFX.beep()}
  if(at(4.2)){AUD.SFX.rewind()}
  if(at(4.75)){AUD.SFX.whoosh()}
  if(at(6.05)){AUD.SFX.splash(true);AUD.SFX.bump()}
  if(at(6.3)){AUD.SFX.laughTrack()}
  if(at(8.0)){AUD.SFX.stamp();shake=0.3}
  if(at(9.8)){AUD.SFX.giggle(true);AUD.SFX.giggle(false);canoe.cheer=2}
  if(at(10.6)){AUD.say(pick(['t3','yay','t1']),2)}
  if(t>11.6){state='play';dadSeq=null;hearts=3;canoe.inv=2.5;objs=objs.filter(o=>!(o.type==='o'&&Math.abs(sy(o.wy)-CY())<200))}}
// ---------------- end ----------------
function stars(){return score>=2000?3:score>=800?2:1}
function finish(){state='end';endT=0;AUD.setTheme('end');AUD.SFX.fanfare();AUD.SFX.cheer();setTimeout(()=>AUD.say('camp',2),600);setTimeout(()=>AUD.say(pick(['t2','t1','t3']),2),2600);
  if(score>best){best=score;localStorage.setItem('wwp_best',best)}confetti(80)}
// ================= DRAWING =================
function rrect(x,y,w,h,r){X.beginPath();X.moveTo(x+r,y);X.arcTo(x+w,y,x+w,y+h,r);X.arcTo(x+w,y+h,x,y+h,r);X.arcTo(x,y+h,x,y,r);X.arcTo(x,y,x+w,y,r);X.closePath()}
function circ(x,y,r,fill){X.beginPath();X.arc(x,y,r,0,TAU);X.fillStyle=fill;X.fill()}
function ell(x,y,rx,ry,fill,rot){X.beginPath();X.ellipse(x,y,rx,ry,rot||0,0,TAU);X.fillStyle=fill;X.fill()}
function txt(s,x,y,size,fill,align,stroke,font){X.font=(font||'900 ')+size+'px "Baloo 2","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';X.textAlign=align||'center';X.textBaseline='middle';
  if(stroke){X.lineJoin='round';X.lineWidth=size*0.22;X.strokeStyle=stroke;X.strokeText(s,x,y)}X.fillStyle=fill;X.fillText(s,x,y)}
function secMix(){const p=runT/RUN;return{s:sectionIx(),sun:clamp((p-0.72)/0.12,0,1)}}
function drawWorld(){const {s,sun}=state==='title'?{s:0,sun:0}:secMix();const S=SECTIONS[s];
  // grass
  X.fillStyle=S.grass;X.fillRect(0,0,W,H);
  // grass texture dots
  X.fillStyle='rgba(255,255,255,0.08)';for(let i=0;i<40;i++){const wy=Math.floor((dist/40))*40+i*40,y=sy(wy);const x=((wy*7919)%400+400)%400;X.beginPath();X.arc(x,y,6,0,TAU);X.fill()}
  // river polygon
  const step=12;const L=[],Rr=[];for(let y=-20;y<=H+20;y+=step){const wy=dist+(CY()-y);const c=riverC(wy),w=riverW(wy);L.push([c-w/2,y]);Rr.push([c+w/2,y])}
  X.beginPath();L.forEach(([x,y],i)=>i?X.lineTo(x-18,y):X.moveTo(x-18,y));for(let i=Rr.length-1;i>=0;i--)X.lineTo(Rr[i][0]+18,Rr[i][1]);X.closePath();X.fillStyle=S.sand;X.fill();
  X.beginPath();L.forEach(([x,y],i)=>i?X.lineTo(x,y):X.moveTo(x,y));for(let i=Rr.length-1;i>=0;i--)X.lineTo(Rr[i][0],Rr[i][1]);X.closePath();
  const gr=X.createLinearGradient(0,0,W,0);let wc=S.water;if(s===3){wc=[mixC('#4fd1ee',S.water[0],sun),mixC('#2fb4dc',S.water[1],sun)]}
  gr.addColorStop(0,wc[1]);gr.addColorStop(0.5,wc[0]);gr.addColorStop(1,wc[1]);X.fillStyle=gr;X.fill();
  // shoreline foam
  X.strokeStyle='rgba(255,255,255,0.55)';X.lineWidth=4;X.setLineDash([14,10]);X.lineDashOffset=-T*20;
  X.beginPath();L.forEach(([x,y],i)=>i?X.lineTo(x+4,y):X.moveTo(x+4,y));X.stroke();X.beginPath();Rr.forEach(([x,y],i)=>i?X.lineTo(x-4,y):X.moveTo(x-4,y));X.stroke();X.setLineDash([]);
  // water sparkles / ripples
  X.strokeStyle='rgba(255,255,255,0.45)';X.lineWidth=3;X.lineCap='round';
  for(let i=0;i<26;i++){const wy=Math.floor(dist/60)*60+i*60-120;const y=sy(wy);const h=(wy*2654435761>>>0)%1000/1000;const c=riverC(wy),w=riverW(wy);const x=c+(h-0.5)*w*0.8;const k=(Math.sin(T*2+h*9)+1)/2;
    X.beginPath();X.moveTo(x-10-k*4,y);X.quadraticCurveTo(x,y-5,x+10+k*4,y);X.stroke()}
  for(let i=0;i<14;i++){const wy=Math.floor(dist/90)*90+i*90-90,y=sy(wy),h=((wy*40503)>>>0)%997/997,cc=riverC(wy),ww=riverW(wy),x=cc+(h-0.5)*ww*0.85;const g=Math.max(0,Math.sin(T*3+h*20));if(g>0.2){X.globalAlpha=g;star4(x,y-10,3+g*6,'#fff');X.globalAlpha=1}}
  // decor
  for(const d of decor)drawDecor(d);
  if(camp||state==='end')drawCamp();
  if(sun>0){const g2=X.createLinearGradient(0,0,0,H);g2.addColorStop(0,`rgba(255,140,70,${0.18*sun})`);g2.addColorStop(1,`rgba(140,60,160,${0.18*sun})`);X.fillStyle=g2;X.fillRect(0,0,W,H)}}
function star4(x,y,r,c){X.beginPath();X.moveTo(x,y-r);X.quadraticCurveTo(x,y,x+r,y);X.quadraticCurveTo(x,y,x,y+r);X.quadraticCurveTo(x,y,x-r,y);X.quadraticCurveTo(x,y,x,y-r);X.fillStyle=c;X.fill()}
function mixC(a,b,t){const p=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16));const A=p(a),B=p(b);return'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],t))).join(',')+')'}
function drawDecor(d){const y=sy(d.wy);if(y<-120||y>H+120)return;const x=d.x,s=d.s;
  if(d.k==='pine'){ell(x+6,y+6,20*s,8*s,'rgba(0,0,0,0.12)');X.fillStyle='#7a4b2a';X.fillRect(x-4*s,y-6*s,8*s,12*s);
    for(let i=0;i<3;i++){X.beginPath();X.moveTo(x,y-(70-i*18)*s);X.lineTo(x-(26-i*-2)*s+i*0*s,y-(18+i*-2)*s-i*14*s);X.lineTo(x+(26)*s,y-(18)*s-i*14*s);X.closePath();X.fillStyle=['#2e8b57','#2a7d4f','#246f45'][i];X.fill()}
    X.beginPath();X.moveTo(x,y-70*s);X.lineTo(x-26*s,y-18*s);X.lineTo(x+26*s,y-18*s);X.closePath();X.fillStyle='#2f9a5c';X.fill();
    X.beginPath();X.moveTo(x,y-62*s);X.lineTo(x-8*s,y-40*s);X.lineTo(x+2*s,y-44*s);X.closePath();X.fillStyle='rgba(255,255,255,0.15)';X.fill()}
  else if(d.k==='birch'){ell(x+5,y+4,16*s,6*s,'rgba(0,0,0,0.12)');X.fillStyle='#fafafa';rrect(x-4*s,y-46*s,8*s,48*s,3);X.fill();X.fillStyle='#333';for(let i=0;i<4;i++)X.fillRect(x-4*s+(i%2)*4*s,y-40*s+i*10*s,4*s,2.5*s);
    circ(x-10*s,y-50*s,14*s,'#9ee06a');circ(x+10*s,y-54*s,15*s,'#8bd55a');circ(x,y-66*s,15*s,'#a8e874')}
  else if(d.k==='bush'){circ(x-9*s,y,10*s,'#4fb04a');circ(x+9*s,y,10*s,'#4fb04a');circ(x,y-7*s,12*s,'#5cc055');circ(x-4*s,y-6*s,2.5,'#ff6b8b');circ(x+6*s,y-2*s,2.5,'#ff6b8b')}
  else if(d.k==='flower'){for(let j=0;j<3;j++){const fx=x+(j-1)*12,fy=y+(j%2)*6;for(let i=0;i<5;i++){const a=i/5*TAU+T*0.2*(j-1);circ(fx+Math.cos(a)*4.5,fy+Math.sin(a)*4.5,3.6,d.c||'#fff')}circ(fx,fy,3,'#ffcc33')}}
  else if(d.k==='rockb'){ell(x,y,16*s,11*s,'#a7a9b4');ell(x-4,y-4,8*s,4*s,'#c6c8d1')}
  else if(d.k==='dragonfly'){const fx=x+Math.sin(T*1.3+d.ph)*60,fy=y+Math.cos(T*1.7+d.ph)*30;X.save();X.translate(fx,fy);X.rotate(Math.sin(T+d.ph)*0.5);
    const fl=Math.sin(T*40)*0.3+0.7;X.fillStyle='rgba(200,240,255,0.7)';ell(-9,-3,10,4*fl,'rgba(220,250,255,0.75)',-0.3);ell(9,-3,10,4*fl,'rgba(220,250,255,0.75)',0.3);ell(-8,3,8,3*fl,'rgba(220,250,255,0.75)',0.3);ell(8,3,8,3*fl,'rgba(220,250,255,0.75)',-0.3);
    X.fillStyle='#2ec4b6';rrect(-2,-6,4,22,2);X.fill();circ(0,-7,4,'#1b998b');X.restore()}
  else if(d.k==='cattail'){for(let i=0;i<3;i++){const bx=x-8+i*8,sw=Math.sin(T*1.5+d.ph+i)*3;X.strokeStyle='#4f9a3a';X.lineWidth=2.5;X.beginPath();X.moveTo(bx,y);X.quadraticCurveTo(bx,y-18,bx+sw,y-34*s);X.stroke();ell(bx+sw,y-36*s,3.5,8,'#7a4b25')}}
  else if(d.k==='mushroom'){X.fillStyle='#fff3e0';X.fillRect(x-3,y-8,6,10);X.beginPath();X.arc(x,y-8,10*s,Math.PI,0);X.fillStyle='#e53935';X.fill();circ(x-4,y-12,2,'#fff');circ(x+4,y-14,1.6,'#fff');circ(x+1,y-10,1.4,'#fff')}
  else if(d.k==='picnic'){ell(x+4,y+6,34,10,'rgba(0,0,0,0.12)');X.fillStyle='#8a5a2b';X.fillRect(x-30,y-22,60,5);X.fillRect(x-30,y+10,60,5);rrect(x-26,y-14,52,22,4);X.fillStyle='#fff';X.fill();
    X.fillStyle='#e53935';for(let i=0;i<4;i++)for(let j=0;j<2;j++)if((i+j)%2===0)X.fillRect(x-26+i*13,y-14+j*11,13,11);circ(x+10,y-4,5,'#ffd23f')}
  else if(d.k==='cabin'){X.save();X.translate(x,y);ell(4,4,44,10,'rgba(0,0,0,0.15)');X.fillStyle='#9a6234';X.fillRect(-36,-40,72,42);X.strokeStyle='#7a4b25';X.lineWidth=2;for(let i=0;i<5;i++){X.beginPath();X.moveTo(-36,-34+i*8);X.lineTo(36,-34+i*8);X.stroke()}
    X.beginPath();X.moveTo(-44,-38);X.lineTo(0,-70);X.lineTo(44,-38);X.closePath();X.fillStyle='#4e342e';X.fill();X.fillStyle='#6d4c41';X.fillRect(18,-74,10,22);X.fillStyle='#ffd23f';X.fillRect(-26,-28,16,14);X.fillStyle='#5d3a1a';X.fillRect(6,-24,14,26);
    for(let i=0;i<3;i++){const k=(T*0.4+i/3)%1;X.globalAlpha=1-k;circ(23+k*10,-80-k*40,4+k*8,'#eee');X.globalAlpha=1}X.restore()}
  else if(d.k==='deer'){X.save();X.translate(x,y);X.scale(d.side>0?-1:1,1);ell(0,10,18,5,'rgba(0,0,0,0.12)');X.fillStyle='#a86a3a';X.fillRect(-10,-2,3,12);X.fillRect(7,-2,3,12);ell(0,-6,16,9,'#c07a42');circ(-4,-8,1.8,'#fff');circ(4,-5,1.6,'#fff');
    const nod=Math.sin(T*1.2+d.ph)*2;circ(-15,-18+nod,8,'#c07a42');ell(-20,-27+nod,3,6,'#c07a42',-0.4);ell(-11,-27+nod,3,6,'#c07a42',0.4);circ(-18,-19+nod,1.6,'#222');circ(-22,-15+nod,2,'#333');X.restore()}
  else if(d.k==='lily'){const b=Math.sin(T+d.ph)*1.5;X.save();X.translate(x,y+b);X.beginPath();X.moveTo(0,0);X.arc(0,0,13*s,0.3,TAU-0.2);X.closePath();X.fillStyle='#4caf50';X.fill();X.strokeStyle='#388e3c';X.lineWidth=1.5;X.stroke();
    if(d.fl){for(let i=0;i<6;i++){const a=i/6*TAU;ell(Math.cos(a)*4,Math.sin(a)*4-3,4,2.5,'#ffc1e3',a)}circ(0,-3,2.5,'#ffd23f')}X.restore()}
  else if(d.k==='butterfly'){const fx=x+Math.sin(T*0.9+d.ph)*80,fy=y+Math.sin(T*1.9+d.ph)*25;const fl=Math.abs(Math.sin(T*14+d.ph));X.save();X.translate(fx,fy);
    ell(-6*fl,-3,7*fl+1,6,d.c);ell(6*fl,-3,7*fl+1,6,d.c);ell(-5*fl,4,5*fl+1,4,d.c);ell(5*fl,4,5*fl+1,4,d.c);X.fillStyle='#333';X.fillRect(-1,-6,2,12);X.restore()}
  else if(d.k==='lighthouse'){X.save();X.translate(x,y);ell(4,4,30,10,'rgba(0,0,0,0.15)');X.beginPath();X.moveTo(-16,0);X.lineTo(-10,-110);X.lineTo(10,-110);X.lineTo(16,0);X.closePath();X.fillStyle='#fff';X.fill();
    for(let i=0;i<3;i++){X.beginPath();const y0=-20-i*34,y1=y0-14;const w0=16-((-y0)/110)*6,w1=16-((-y1)/110)*6;X.moveTo(-w0,y0);X.lineTo(-w1,y1);X.lineTo(w1,y1);X.lineTo(w0,y0);X.closePath();X.fillStyle='#e53935';X.fill()}
    X.fillStyle='#333';X.fillRect(-13,-118,26,8);X.fillStyle='#ffe066';X.fillRect(-9,-134,18,16);X.beginPath();X.moveTo(-12,-134);X.lineTo(0,-148);X.lineTo(12,-134);X.fillStyle='#e53935';X.fill();
    X.globalAlpha=0.25+0.2*Math.sin(T*3);X.beginPath();X.moveTo(0,-126);X.lineTo(-90,-150);X.lineTo(-90,-102);X.closePath();X.fillStyle='#fff6a0';X.fill();X.globalAlpha=1;X.restore()}}
function drawCamp(){const wy=RUN*112+40;let y=sy(wy+120);if(state==='end')y=Math.max(y,H*0.18);const c=riverC(wy),x=c+riverW(wy)/2+40;
  X.save();X.translate(Math.min(x,330),y);ell(0,30,70,16,'rgba(0,0,0,0.12)');X.beginPath();X.moveTo(-50,30);X.lineTo(0,-40);X.lineTo(50,30);X.closePath();X.fillStyle='#ff8a3d';X.fill();
  X.beginPath();X.moveTo(-12,30);X.lineTo(0,0);X.lineTo(12,30);X.closePath();X.fillStyle='#8a4b1f';X.fill();X.fillStyle='#ffd23f';X.fillRect(-2,-50,4,14);X.beginPath();X.moveTo(2,-50);X.lineTo(22,-44);X.lineTo(2,-38);X.fill();
  // campfire
  X.translate(-80,40);X.fillStyle='#7a4b2a';X.save();X.rotate(0.4);X.fillRect(-16,-3,32,6);X.rotate(-0.8);X.fillRect(-16,-3,32,6);X.restore();
  const fl=Math.sin(T*12)*3;X.beginPath();X.moveTo(-12,0);X.quadraticCurveTo(-10,-22-fl,0,-34+fl);X.quadraticCurveTo(10,-22+fl,12,0);X.fillStyle='#ff7b25';X.fill();
  X.beginPath();X.moveTo(-6,0);X.quadraticCurveTo(-5,-12,0,-20-fl);X.quadraticCurveTo(5,-12,6,0);X.fillStyle='#ffd23f';X.fill();X.restore()}
// ---------- characters ----------
function drawHat(x,y,s,col){X.save();X.translate(x,y);X.scale(s,s);
  X.beginPath();X.moveTo(-22,2);X.quadraticCurveTo(-24,-10,-14,-12);X.quadraticCurveTo(0,-30,14,-12);X.quadraticCurveTo(24,-10,22,2);X.quadraticCurveTo(0,-6,-22,2);X.closePath();X.fillStyle=col;X.fill();
  X.lineWidth=2.5;X.strokeStyle='rgba(0,0,0,0.25)';X.stroke();X.beginPath();X.moveTo(-21,1);X.quadraticCurveTo(0,-7,21,1);X.strokeStyle='#ffd23f';X.lineWidth=2.5;X.stroke();
  // smiling water-drop emblem
  X.beginPath();X.moveTo(0,-20);X.quadraticCurveTo(6,-12,5,-9);X.arc(0,-9,5,0,Math.PI);X.quadraticCurveTo(-6,-12,0,-20);X.fillStyle='#fff';X.fill();
  circ(-1.8,-9.5,0.9,'#333');circ(1.8,-9.5,0.9,'#333');X.beginPath();X.arc(0,-8,2,0.2,Math.PI-0.2);X.strokeStyle='#333';X.lineWidth=0.9;X.stroke();X.restore()}
function face(x,y,r,o){o=o||{};circ(x,y,r,'#ffd9b5');if(o.oops){[-1,1].forEach(sd=>{circ(x+sd*r*0.36,y-r*0.08,r*0.22,'#fff');circ(x+sd*r*0.36,y-r*0.05,r*0.13,'#2b1d14')});circ(x-r*0.62,y+r*0.25,r*0.17,'rgba(255,120,140,0.45)');circ(x+r*0.62,y+r*0.25,r*0.17,'rgba(255,120,140,0.45)');ell(x,y+r*0.42,r*0.15,r*0.19,'#b8364a');return}
  const blink=(Math.sin(T*1.3+(o.seed||0))>0.985);const ey=y-r*0.05;
  if(o.happy||blink){X.strokeStyle='#3a2a20';X.lineWidth=r*0.12;X.lineCap='round';[-1,1].forEach(sd=>{X.beginPath();X.arc(x+sd*r*0.36,ey+r*0.05,r*0.14,Math.PI*1.1,Math.PI*1.9);X.stroke()})}
  else{[-1,1].forEach(sd=>{circ(x+sd*r*0.36,ey,r*0.15,'#2b1d14');circ(x+sd*r*0.36+r*0.05,ey-r*0.06,r*0.055,'#fff')})}
  circ(x-r*0.62,y+r*0.25,r*0.17,'rgba(255,120,140,0.45)');circ(x+r*0.62,y+r*0.25,r*0.17,'rgba(255,120,140,0.45)');
  X.beginPath();if(o.open){X.ellipse(x,y+r*0.38,r*0.26,r*0.2,0,0,TAU);X.fillStyle='#b8364a';X.fill()}else{X.arc(x,y+r*0.22,r*0.32,0.2,Math.PI-0.2);X.strokeStyle='#5a2a1a';X.lineWidth=r*0.1;X.lineCap='round';X.stroke()}}
function drawKid(x,y,who,o){o=o||{};const s=o.s||1;const girl=who==='zoe';const hat=girl?HATS[hatZ]:HATS[hatA];X.save();X.translate(x,y);X.scale(s,s);
  const cheer=o.cheer;const r=girl?14:15;
  // body (life jacket)
  rrect(-13,-2,26,24,9);X.fillStyle='#ff8a1f';X.fill();X.fillStyle='#ffd23f';X.fillRect(-13,6,26,4);
  // arms
  X.strokeStyle='#ffd9b5';X.lineWidth=6;X.lineCap='round';
  if(cheer){X.beginPath();X.moveTo(-11,2);X.lineTo(-20,-16);X.moveTo(11,2);X.lineTo(20,-16);X.stroke()}
  else{X.beginPath();X.moveTo(-11,4);X.lineTo(-6,o.aim?-12:12);X.moveTo(11,4);X.lineTo(6,o.aim?-12:12);X.stroke()}
  if(!girl&&!cheer){// super soaker
    X.save();X.translate(0,o.aim?-14:8);X.rotate(o.aim?0:0.0);rrect(-6,-16,12,26,5);X.fillStyle='#35c46a';X.fill();rrect(-3,-24,6,10,2);X.fillStyle='#ff8a1f';X.fill();circ(0,-2,7,'#5ec8ff');circ(-2,-4,2,'#fff');X.restore()}
  if(girl&&!cheer&&!o.noBalloon){const bob=Math.sin(T*4)*1.5;X.save();X.translate(0,o.aim?-14:8+bob);circ(0,0,9,'#ff5ca8');circ(-3,-3,2.5,'rgba(255,255,255,0.6)');X.beginPath();X.moveTo(-2,8);X.lineTo(2,8);X.lineTo(0,11);X.fillStyle='#ff5ca8';X.fill();X.restore()}
  // head
  const hy=-16;
  if(girl){// pigtails
    circ(-15,hy+2,6,'#e8b04a');circ(15,hy+2,6,'#e8b04a');circ(-15,hy+2,2.5,'#ff5ca8');}
  X.beginPath();X.arc(0,hy,r+1,Math.PI,0);X.fillStyle=girl?'#e8b04a':'#7a4a24';X.fill();
  face(0,hy,r,{happy:cheer||o.happy,open:cheer,oops:o.oops&&!cheer,seed:girl?3:7});
  X.beginPath();X.arc(0,hy-2,r,Math.PI*1.1,Math.PI*1.9);X.strokeStyle=girl?'#e8b04a':'#7a4a24';X.lineWidth=5;X.stroke();
  drawHat(0,hy-r+4,girl?0.85:0.92,hat);X.restore()}
function drawDad(x,y,o){o=o||{};const s=o.s||1;X.save();X.translate(x,y);X.rotate(o.rot||0);X.scale(s,s);
  rrect(-17,-4,34,30,11);X.fillStyle='#2f6fd6';X.fill();X.fillStyle='#ffd23f';X.fillRect(-17,6,34,4);
  X.strokeStyle='#ffd9b5';X.lineWidth=7;X.lineCap='round';X.beginPath();
  if(o.thumbs){X.moveTo(14,2);X.lineTo(26,-12);X.stroke();circ(27,-14,5,'#ffd9b5');X.beginPath();X.moveTo(27,-18);X.lineTo(27,-25);X.lineWidth=4;X.stroke()}
  else if(o.flail){const a=Math.sin(T*24)*8;X.moveTo(-14,0);X.lineTo(-28,-16+a);X.moveTo(14,0);X.lineTo(28,-16-a);X.stroke()}
  else if(o.push){X.moveTo(-14,2);X.lineTo(-22,-18);X.moveTo(14,2);X.lineTo(22,-18);X.stroke()}
  else{X.moveTo(-14,2);X.lineTo(-4,14);X.moveTo(14,2);X.lineTo(4,14);X.stroke()}
  const hy=-20,r=17;face(0,hy,r,{happy:o.happy,open:o.open,seed:1});
  // beard
  X.beginPath();X.moveTo(-r*0.95,hy+2);X.quadraticCurveTo(-r*0.9,hy+r*1.25,0,hy+r*1.2);X.quadraticCurveTo(r*0.9,hy+r*1.25,r*0.95,hy+2);X.quadraticCurveTo(r*0.6,hy+r*0.75,0,hy+r*0.72);X.quadraticCurveTo(-r*0.6,hy+r*0.75,-r*0.95,hy+2);X.fillStyle='#8a5a2b';X.fill();
  X.beginPath();X.arc(0,hy+r*0.42,r*0.28,0.15,Math.PI-0.15);X.strokeStyle='#5a2a1a';X.lineWidth=2.4;X.stroke();
  // cap
  X.beginPath();X.arc(0,hy-4,r,Math.PI,0);X.fillStyle='#2e7d4f';X.fill();ell(0,hy-5,r+8,4,'#24653f');circ(0,hy-r-3,2.5,'#24653f');
  X.fillStyle='#fff';txt('W',0,hy-11,10,'#ffd23f');
  if(o.drip){for(let i=0;i<4;i++){const k=((T*1.5+i*0.25)%1);circ(-14+i*9,hy+r+k*30,2.4*(1-k*0.5),'rgba(120,210,255,0.9)')}}
  X.restore()}
function drawCanoe(x,y,a,opt){opt=opt||{};X.save();X.translate(x,y);X.rotate(a*0.5);X.scale(1+Math.abs(a)*0.4,1);
  ell(4,6,40,102,'rgba(0,40,80,0.18)');
  // wake
  X.strokeStyle='rgba(255,255,255,0.6)';X.lineWidth=3;X.beginPath();X.moveTo(-12,-96);X.quadraticCurveTo(-34,-40,-44,40);X.moveTo(12,-96);X.quadraticCurveTo(34,-40,44,40);X.stroke();
  // hull
  X.beginPath();X.moveTo(0,-104);X.bezierCurveTo(40,-70,40,70,0,104);X.bezierCurveTo(-40,70,-40,-70,0,-104);X.fillStyle='#d9472b';X.fill();
  X.beginPath();X.moveTo(0,-94);X.bezierCurveTo(30,-64,30,64,0,94);X.bezierCurveTo(-30,64,-30,-64,0,-94);X.fillStyle='#8b4a26';X.fill();
  X.strokeStyle='#ffd23f';X.lineWidth=3;X.beginPath();X.moveTo(0,-100);X.bezierCurveTo(36,-68,36,68,0,100);X.bezierCurveTo(-36,68,-36,-68,0,-100);X.stroke();
  X.fillStyle='#c98a4b';[-46,0,46].forEach(yy=>{X.fillRect(-25,yy+14,50,6)});
  X.restore();}
function drawFlag(x,y){X.save();X.translate(x,y);X.fillStyle='#6b4423';X.fillRect(-2,-70,4,72);
  const wv=t=>Math.sin(T*5+t*3)*3;X.beginPath();X.moveTo(2,-70);for(let i=0;i<=10;i++)X.lineTo(2+i*5.6,-70+wv(i/10));for(let i=10;i>=0;i--)X.lineTo(2+i*5.6,-36+wv(i/10));X.closePath();X.fillStyle='#1d2b4f';X.fill();
  X.save();X.translate(30,-56);X.beginPath();X.moveTo(0,-11);X.quadraticCurveTo(8,-2,7,3);X.arc(0,3,7,0,Math.PI);X.quadraticCurveTo(-8,-2,0,-11);X.fillStyle='#5ec8ff';X.fill();
  circ(-2.5,1.5,1.3,'#fff');circ(2.5,1.5,1.3,'#fff');X.beginPath();X.arc(0,4,3,0.2,Math.PI-0.2);X.strokeStyle='#fff';X.lineWidth=1.3;X.stroke();X.restore();
  X.font='900 5.2px system-ui,sans-serif';X.textAlign='center';X.fillStyle='#ffd23f';X.fillText('WILSON WATER',30,-42);X.fillText('PIRATES',30,-37);X.restore()}
function drawFamily(x,y,a,opt){opt=opt||{};const cheer=opt.cheer;const oops=opt.oops||(state==='play'&&canoe.wob>0.45);drawCanoe(x,y,a);
  const sn=Math.sin(a*0.5),cs=Math.cos(a*0.5);const P=d=>[x-sn*d,y+cs*d];
  if(!opt.dadOut){const [dx,dy]=P(52);X.save();X.translate(dx,dy);// paddle
    X.save();X.rotate(Math.sin(T*2.5)*0.4+0.3);X.fillStyle='#c98a4b';X.fillRect(-2,-4,4,50);ell(0,50,7,14,'#e0a060');X.restore();X.restore();
    drawDad(dx,dy,{happy:cheer>0,open:cheer>0.6||oops});}
  const [fx,fy]=P(78);drawFlag(fx+16,fy+12);
  const [zx,zy]=P(4);drawKid(zx,zy,'zoe',{cheer:cheer>0,aim:canoe.armZ>0,oops});
  const [ax,ay]=P(-44);drawKid(ax,ay,'alex',{cheer:cheer>0,aim:canoe.armA>0,oops})}
// ---------- targets, treasure, obstacles ----------
function drawObj(o){const y=sy(o.wy),x=o.x;if(y<-80||y>H+80)return;const done=o.type==='t'&&o.hit>=o.hp,ht=o.ht;
  if(o.type==='g'){const b=Math.sin(o.ph*3)*3;ell(x,y+10,14,5,'rgba(0,0,0,0.12)');X.save();X.translate(x,y+b);
    if(o.k==='coin'){const sx=Math.abs(Math.cos(o.ph*3));ell(0,0,13*sx+2,13,'#f5b700');ell(0,0,(9*sx)+1,9,'#ffd23f');if(sx>0.4)txt('★',0,1,11,'#f5b700')}
    else if(o.k==='ducky'){ell(0,4,14,10,'#ffd23f');circ(7,-6,8,'#ffd23f');X.beginPath();X.moveTo(13,-6);X.lineTo(21,-4);X.lineTo(13,-2);X.fillStyle='#ff8a1f';X.fill();circ(9,-8,1.8,'#222')}
    else if(o.k==='popsicle'){X.fillStyle='#e0a060';X.fillRect(-2,6,4,12);rrect(-9,-16,18,26,8);X.fillStyle='#ff5ca8';X.fill();X.fillStyle='#ffd23f';X.fillRect(-9,-4,18,5);circ(-4,-10,2,'rgba(255,255,255,0.6)')}
    else if(o.k==='cherry'){X.strokeStyle='#4f9a3a';X.lineWidth=2;X.beginPath();X.moveTo(-6,2);X.quadraticCurveTo(-2,-14,4,-16);X.moveTo(7,4);X.quadraticCurveTo(6,-8,4,-16);X.stroke();ell(9,-16,6,3,'#5cc055',0.4);circ(-6,4,8,'#d81b60');circ(7,6,8,'#e53935');circ(-8,1,2.2,'rgba(255,255,255,0.7)');circ(5,3,2.2,'rgba(255,255,255,0.7)')}
    else if(o.k==='icecream'){X.beginPath();X.moveTo(-9,-2);X.lineTo(0,18);X.lineTo(9,-2);X.fillStyle='#e0a060';X.fill();X.strokeStyle='#b97a3a';X.lineWidth=1;X.beginPath();X.moveTo(-6,2);X.lineTo(4,10);X.moveTo(6,2);X.lineTo(-4,10);X.stroke();circ(0,-6,9,'#ff9ecb');circ(0,-15,7,'#9be7c4');circ(1,-22,3,'#e53935')}
    else if(o.k==='beachball'){X.rotate(o.ph);['#e53935','#fff','#1e88e5','#fff','#ffd23f','#fff'].forEach((c,i)=>{X.beginPath();X.moveTo(0,0);X.arc(0,0,14,i*TAU/6,(i+1)*TAU/6);X.closePath();X.fillStyle=c;X.fill()});circ(0,0,3,'#fff');circ(-5,-6,3,'rgba(255,255,255,0.6)')}
    else if(o.k==='chest'){const gl=0.5+0.5*Math.sin(o.ph*6);circ(0,-4,30,`rgba(255,230,100,${0.25*gl})`);rrect(-18,-6,36,22,4);X.fillStyle='#8a5a2b';X.fill();X.fillStyle='#ffd23f';X.fillRect(-18,-6,36,4);X.fillRect(-3,-4,6,8);
      X.save();X.translate(0,-6);X.rotate(-0.35);rrect(-18,-14,36,14,6);X.fillStyle='#9a6234';X.fill();X.restore();circ(-6,-9,5,'#ffd23f');circ(4,-10,5,'#f5b700');circ(10,-8,4,'#ffd23f');txt('✦',-12,-18,10,'#fff')}
    else{rrect(-13,-12,26,9,3);X.fillStyle='#d79a5a';X.fill();rrect(-12,-4,24,6,3);X.fillStyle='#fff';X.fill();rrect(-12,-6,24,3,1);X.fillStyle='#6b3a1f';X.fill();rrect(-13,2,26,9,3);X.fillStyle='#d79a5a';X.fill()}
    X.restore();// sparkle
    if(Math.sin(o.ph*5)>0.8){txt('✦',x+12,y-12,10,'#fff')}return}
  if(o.type==='o'){
    if(o.k==='rock'){ell(x,y+8,26,10,'rgba(255,255,255,0.5)');ell(x,y,24,18,'#8d8f9c');ell(x-6,y-6,10,6,'#b7b9c4')}
    else if(o.k==='big'){const wv=Math.sin(T*3)*3;ell(x,y+14,58,18,'rgba(255,255,255,0.6)');ell(x,y,52,36,'#7d7f8c');ell(x-14,y-12,20,10,'#a9abb7');ell(x+20,y+6,10,6,'#6d6f7c');
      if(!o.used){txt('!',x,y-50+wv,30,'#ffd23f','center','#a33')}}
    else if(o.k==='log'){X.save();X.translate(x,y);X.rotate(o.ang);ell(0,6,o.len/2+6,10,'rgba(255,255,255,0.45)');rrect(-o.len/2,-11,o.len,22,11);X.fillStyle='#8a5a2b';X.fill();ell(o.len/2-6,0,7,10,'#d8a46a');ell(o.len/2-6,0,3,5,'#8a5a2b');
      X.strokeStyle='#6b4423';X.lineWidth=2;X.beginPath();X.moveTo(-o.len/2+10,-4);X.lineTo(o.len/2-20,-4);X.stroke();circ(-10,-12,4,'#5cc055');X.restore()}
    else if(o.k==='rapids'){X.strokeStyle='rgba(255,255,255,0.85)';X.lineWidth=4;X.lineCap='round';for(let i=0;i<3;i++){const yy=y-24+i*18+((T*40)%18);X.beginPath();X.moveTo(x-34,yy+6);X.lineTo(x-14,yy-4);X.lineTo(x,yy+6);X.lineTo(x+14,yy-4);X.lineTo(x+34,yy+6);X.stroke()}
      circ(x-26,y+16,5,'rgba(255,255,255,0.6)');circ(x+24,y-20,4,'rgba(255,255,255,0.6)')}
    return}
  // targets
  const wet=done?Math.min(1,ht*3):0;const wig=o.hit&&ht<0.4?Math.sin(ht*40)*4:0;
  X.save();X.translate(x+wig,y);
  switch(o.k){
  case'duck':{const fl=done?Math.sin(T*30)*0.8:0;X.scale(o.flip,1);for(let i=0;i<o.ducklings;i++){ell(-24-i*16,6,7,5,'#ffe066');circ(-21-i*16,1,4,'#ffe066')}
    ell(0,6,20,13,'#fff');if(done){ell(-4,-4,16,6,'#fff',-0.8+fl)}circ(10,-8,10,'#2e9b5a');X.beginPath();X.moveTo(18,-8);X.lineTo(28,-5);X.lineTo(18,-2);X.fillStyle='#ff9f1c';X.fill();circ(12,-11,2,'#111');X.fillStyle='#fff';X.fillRect(4,-1,10,2);
    if(done&&ht<1)txt('QUACK!',0,-30,13,'#fff','center','#2a6');break}
  case'paddler':{ell(0,10,16,38,'#1e88e5');ell(0,10,12,32,'#0d5fb0');const hap=o.hit>0;
    X.save();X.rotate(Math.sin(T*2+o.ph)*0.4);X.fillStyle='#c98a4b';X.fillRect(-30,-2,60,4);ell(-31,0,8,5,'#e0a060');ell(31,0,8,5,'#e0a060');X.restore();
    rrect(-11,-4,22,20,8);X.fillStyle=o.ph%2>1?'#ab47bc':'#ef5350';X.fill();face(0,-14,12,{happy:hap,open:hap&&ht<1.5,seed:o.ph});X.beginPath();X.arc(0,-18,13,Math.PI,0);X.fillStyle='#ffe066';X.fill();ell(0,-18,17,3,'#ffd23f');
    if(hap&&ht<1.4)txt('HA HA!',0,-42,13,'#fff','center','#1565c0');break}
  case'tuber':{X.rotate(Math.sin(T+o.ph)*0.3);circ(0,0,22,'#ff5ca8');circ(0,0,12,'rgba(0,80,120,0.35)');circ(-8,-8,4,'rgba(255,255,255,0.5)');X.rotate(-Math.sin(T+o.ph)*0.3);
    face(0,-6,11,{happy:o.hit>0,open:o.hit>0&&ht<1,seed:o.ph});X.beginPath();X.arc(0,-9,11.5,Math.PI,0);X.fillStyle='#3a2a20';X.fill();ell(0,-16,8,6,'#222');ell(-4,-16,5,4,'#5ec8ff');ell(4,-16,5,4,'#5ec8ff');
    if(o.hit&&ht<1.2)txt('WHEE!',0,-36,13,'#fff','center','#c2185b');break}
  case'frog':{ell(0,6,26,16,'#3fae5a');ell(4,4,6,4,'rgba(255,255,255,0.3)');X.beginPath();X.moveTo(0,6);X.lineTo(26,0);X.lineTo(22,12);X.fillStyle='#4fd1ee';X.fill();
    const jy=done?-Math.sin(Math.min(1,ht*1.5)*Math.PI)*36:0;X.translate(0,jy);ell(0,-2,14,11,'#7ee081');circ(-7,-11,5,'#7ee081');circ(7,-11,5,'#7ee081');circ(-7,-11,2.5,'#111');circ(7,-11,2.5,'#111');
    X.beginPath();X.arc(0,-2,7,0.2,Math.PI-0.2);X.strokeStyle='#226b33';X.lineWidth=2;X.stroke();if(done&&ht<1.2)txt('RIBBIT!',0,-34,13,'#fff','center','#226b33');break}
  case'bear':{X.scale(o.side||1,1);X.scale(o.side||1,1);ell(0,18,22,8,'rgba(0,0,0,0.15)');ell(0,4,18,20,'#8d5a2b');ell(0,8,10,12,'#c79a6a');
    const wave=Math.sin(T*6+o.ph)*0.5;X.save();X.translate(14,-6);X.rotate(-1.2+wave);ell(0,-10,6,12,'#8d5a2b');X.restore();
    circ(-12,-28,7,'#8d5a2b');circ(12,-28,7,'#8d5a2b');circ(0,-18,16,'#8d5a2b');ell(0,-12,8,6,'#c79a6a');circ(0,-15,3,'#222');
    if(o.hit){X.strokeStyle='#222';X.lineWidth=2;[-6,6].forEach(s=>{X.beginPath();X.arc(s,-21,3,Math.PI*1.1,Math.PI*1.9);X.stroke()})}else{circ(-6,-22,2.5,'#222');circ(6,-22,2.5,'#222')}
    X.beginPath();X.arc(0,-11,4,0.2,Math.PI-0.2);X.strokeStyle='#222';X.lineWidth=2;X.stroke();circ(-11,-16,3,'rgba(255,120,140,0.5)');circ(11,-16,3,'rgba(255,120,140,0.5)');
    if(o.hit){for(let i=0;i<4;i++){const k=(T*1.4+i*0.25)%1;circ(-12+i*8,-30+k*40,2.5,'rgba(120,210,255,0.9)')}if(ht<1.5)txt('HI!',0,-50,15,'#fff','center','#6d3b14')}break}
  case'fish':{const j=o.jump;const jy=-Math.sin(j*Math.PI)*40;if(j>0){X.translate(0,jy);X.rotate(-0.6+j*1.2)}else{X.globalAlpha=0.55}
    ell(0,0,18,10,'#ff8a3d');X.beginPath();X.moveTo(-14,0);X.lineTo(-26,-9);X.lineTo(-26,9);X.fillStyle='#ff8a3d';X.fill();circ(9,-2,2.5,'#111');ell(-2,-2,6,3,'rgba(255,255,255,0.4)');X.globalAlpha=1;
    if(j<=0){X.strokeStyle='rgba(255,255,255,0.6)';X.lineWidth=2;X.beginPath();X.arc(0,8,22,0,Math.PI);X.stroke()}
    if(done&&ht<1)txt('SPLOOSH!',0,-34,12,'#fff','center','#d35400');break}
  case'beaver':{X.scale(o.side||1,1);for(let i=0;i<7;i++){X.save();X.translate(-34+i*12,14);X.rotate((i%2?0.3:-0.2));rrect(-26,-4,52,8,4);X.fillStyle=i%2?'#8a5a2b':'#7a4b25';X.fill();X.restore()}
    ell(14,24,14,5,'#6b4423');ell(0,-2,16,18,'#9a6234');circ(0,-16,14,'#9a6234');circ(-10,-27,4,'#9a6234');circ(10,-27,4,'#9a6234');ell(0,-10,8,6,'#c79a6a');X.fillStyle='#fff';X.fillRect(-4,-6,8,6);X.strokeStyle='#ccc';X.lineWidth=1;X.beginPath();X.moveTo(0,-6);X.lineTo(0,0);X.stroke();
    const happy=done;X.strokeStyle='#222';X.lineWidth=2.4;if(happy){[-6,6].forEach(s=>{X.beginPath();X.arc(s,-18,3,Math.PI*1.1,Math.PI*1.9);X.stroke()})}else{circ(-6,-18,2.5,'#222');circ(6,-18,2.5,'#222');X.beginPath();X.moveTo(-10,-25);X.lineTo(-3,-22);X.moveTo(10,-25);X.lineTo(3,-22);X.stroke()}
    if(done&&ht<1.5)txt('OK, OK!',0,-46,13,'#fff','center','#6b4423');else if(!o.hit)txt('hmph',0,-44,11,'#fff','center','#6b4423');break}
  case'raft':{X.rotate(Math.sin(T+o.ph)*0.08);rrect(-34,-20,68,44,8);X.fillStyle='#d79a5a';X.fill();X.strokeStyle='#a86e3a';X.lineWidth=2;for(let i=-24;i<34;i+=12){X.beginPath();X.moveTo(i,-20);X.lineTo(i,24);X.stroke()}
    X.fillStyle='#6b4423';X.fillRect(22,-58,3,58);X.beginPath();X.moveTo(25,-58);X.lineTo(52,-50);X.lineTo(25,-40);X.fillStyle='#e53935';X.fill();txt('★',35,-50,10,'#fff');
    for(let i=0;i<2;i++){const px=-14+i*24;rrect(px-9,-6,18,16,6);X.fillStyle='#7e57c2';X.fill();face(px,-14,10,{happy:o.hit>0,open:o.hit>0,seed:i*4});X.beginPath();X.moveTo(px-12,-20);X.lineTo(px,-32);X.lineTo(px+12,-20);X.fillStyle='#222';X.fill()}
    for(let i=0;i<o.hp;i++)circ(-14+i*14,32,4,i<o.hit?'#5ec8ff':'rgba(255,255,255,0.7)');
    if(done&&ht<1.6)txt('YOU WIN!',0,-48,13,'#fff','center','#7e57c2');break}
  case'sprinkler':{X.fillStyle='#777';X.fillRect(-3,-6,6,16);circ(0,-8,6,'#ffd23f');const a=Math.sin(T*3+o.ph)*0.9;for(let i=0;i<6;i++){const k=((T*2+i/6)%1);const dx=Math.sin(a)*k*44,dy=-Math.sin(k*Math.PI)*30;circ(dx,-8+dy,2.5,'rgba(150,220,255,0.9)')}
    if(done&&ht<1)txt('SPRITZ!',0,-40,12,'#fff','center','#1565c0');break}
  }
  X.restore();
  if(!done&&o.type==='t'){X.globalAlpha=0.35+0.25*Math.sin(T*5+o.ph);X.strokeStyle='#fff';X.lineWidth=3;X.setLineDash([6,6]);X.beginPath();X.arc(x,y,o.r+10,0,TAU);X.stroke();X.setLineDash([]);X.globalAlpha=1}}
function drawShots(){for(const s of shots){if(s.t<0||s.px==null)continue;
  if(s.k==='jet'){circ(s.px,s.py,6,'rgba(120,210,255,0.95)');circ(s.px-1.5,s.py-1.5,2.2,'#fff')}
  else{ell(s.px,s.ty+(s.py-s.ty)*0+0,10*(1-s.k2*0.3),4,'rgba(0,0,0,0.12)');X.save();X.translate(s.px,s.py);X.rotate(s.t*8);circ(0,0,12,s.col);circ(-4,-4,3.5,'rgba(255,255,255,0.6)');X.restore()}}}
function drawParts(){for(const p of parts){const k=1-p.t/p.life;if(p.ring){const e=ease(p.t/p.life);X.strokeStyle=`rgba(255,255,255,${0.75*k})`;X.lineWidth=3*k+1;X.beginPath();X.ellipse(p.x,p.y,p.r*(0.3+e),p.r*(0.3+e)*0.35,0,0,TAU);X.stroke();continue}if(p.conf){X.save();X.translate(p.x,p.y);X.rotate(p.rot);X.fillStyle=p.col;X.fillRect(-p.r,-p.r/2,p.r*2,p.r);X.restore()}else{X.globalAlpha=Math.min(1,k*1.5);const pr=p.r*(0.5+k*0.5);circ(p.x,p.y,pr,p.col);if(pr>3)circ(p.x-pr*0.35,p.y-pr*0.35,pr*0.3,'rgba(255,255,255,0.8)');X.globalAlpha=1}}
  for(const f of floats){X.globalAlpha=1-Math.max(0,f.t-0.7)/0.5;txt(f.s,f.x,f.y,20,f.col,'center','rgba(0,0,0,0.45)');X.globalAlpha=1}}
// ---------- HUD ----------
function lifeJacket(x,y,on){X.save();X.translate(x,y);X.globalAlpha=on?1:0.3;rrect(-12,-13,24,26,8);X.fillStyle='#ff8a1f';X.fill();X.fillStyle='#ffd23f';X.fillRect(-12,-2,24,4);X.fillStyle='#c25a00';X.fillRect(-1.5,-13,3,26);X.restore()}
function drawHUD(){const top=Math.max(8,(window.__safeTop||0));
  rrect(8,top,W-16,48,24);X.fillStyle='rgba(255,255,255,0.82)';X.fill();
  for(let i=0;i<3;i++)lifeJacket(32+i*30,top+24,i<hearts);
  // splash score
  X.save();X.translate(140,top+24);X.beginPath();X.moveTo(0,-14);X.quadraticCurveTo(11,-2,9,5);X.arc(0,5,9,0,Math.PI);X.quadraticCurveTo(-11,-2,0,-14);X.fillStyle='#29b6f6';X.fill();X.restore();
  txt(String(score),156,top+25,24,'#1d2b4f','left');
  // treasure
  ell(236,top+24,11,11,'#f5b700');ell(236,top+24,7,7,'#ffd23f');txt(String(treasure),252,top+25,22,'#1d2b4f','left');
  // mute
  ui.mute=[W-56,top,48,48];txt(AUD.muted?'🔇':'🔊',W-32,top+25,24,'#000');
  // progress river map
  const py=top+58;rrect(40,py,W-80,12,6);X.fillStyle='rgba(255,255,255,0.6)';X.fill();const p=clamp(runT/RUN,0,1);rrect(40,py,(W-80)*p+6,12,6);X.fillStyle='#29b6f6';X.fill();
  SECTIONS.forEach(S=>{circ(40+(W-80)*S.at,py+6,4,'#fff')});txt('⛺',W-30,py+5,20,'#000');ell(40+(W-80)*p,py+6,8,5,'#d9472b');
  // shooter switch button
  const bx=14,by=H-118;ui.sw=[bx,by,100,104];rrect(bx,by,100,104,26);X.fillStyle=shooter==='alex'?'rgba(53,196,106,0.92)':'rgba(255,92,168,0.92)';X.fill();X.strokeStyle='#fff';X.lineWidth=4;X.stroke();
  drawKid(bx+50,by+62,shooter,{s:1.5,happy:true,noBalloon:true});
  txt(shooter==='alex'?'💦':'🎈',bx+86,by+18,22,'#000');txt('⇄',bx+16,by+18,22,'#fff','center','rgba(0,0,0,0.3)');
  // hint
  if(state==='play'&&runT<6){const a=Math.min(1,(6-runT));X.globalAlpha=a;const hx=280+Math.sin(T*3)*40;txt('👆',hx,CY()+90,40,'#000');txt('💦',200,CY()-230+Math.sin(T*4)*6,34,'#000');circ(200,CY()-230,40,'rgba(255,255,255,0.15)');X.globalAlpha=1}}
function drawBanner(){if(!banner)return;const b=banner,k=ease(b.t*3),out=b.t>2.2?ease((b.t-2.2)*3):0;const y=H*0.32-out*40;X.save();X.globalAlpha=1-out;X.translate(W/2,y);X.scale(k,k);X.rotate(-0.04);
  const w=b.big?360:300,h=b.big?92:74;rrect(-w/2,-h/2,w,h,24);X.fillStyle=b.big?'#ffd23f':'rgba(255,255,255,0.95)';X.fill();X.lineWidth=5;X.strokeStyle=b.big?'#e53935':'#29b6f6';X.stroke();
  txt(b.icon,-w/2+38,0,b.big?40:34,'#000');txt(b.s,18,b.big?2:2,b.big?30:26,b.big?'#e53935':'#1d2b4f','center',b.big?'#fff':null);X.restore()}
// ---------- Dad sequence render ----------
function drawDadScene(){const d=dadSeq,t=d.t,side=d.side;const c=canoeGeom();
  // phases: 0-0.45 tip; 0.45-1.4 dad in water, pushes canoe level; 1.4-3.2 hero + cheer; 3.2-4.2 camcorder; 4.2-8 VHS replay; 8-9.6 stamp; 9.6-11.6 climb back
  let tilt=0;if(t<0.45)tilt=side*0.9*ease(t/0.45);else if(t<1.4)tilt=side*0.9*(1-ease((t-0.45)/0.95))+Math.sin(t*20)*0.05*(1.4-t);
  const dadOut=t>0.25&&t<11.2;drawFamily(c.x,c.y,tilt,{dadOut,cheer:t>1.4&&t<4?1:t>9.6?1:0,oops:t<1.4});
  if(dadOut){let dx,dy,o={};const wx=c.x-side*52,wy=c.y+60;
    if(t<0.6){const k=(t-0.25)/0.35;dx=lerp(c.x,wx,k);dy=lerp(c.y+50,wy,k)-Math.sin(k*Math.PI)*60;o={flail:1,rot:-side*k*2,open:1}}
    else if(t<1.4){dx=wx;dy=wy+Math.sin(t*6)*3;o={push:1,open:1}}
    else if(t<9.6){dx=wx;dy=wy+Math.sin(t*3)*3;o={thumbs:1,happy:1,drip:1}}
    else{const k=ease((t-9.6)/1.6);dx=lerp(wx,c.x,k);dy=lerp(wy,c.y+52,k)-Math.sin(k*Math.PI)*30;o={thumbs:1,happy:1,drip:1}}
    if(t<9.6){X.save();X.beginPath();X.rect(0,0,W,dy+4);X.clip();drawDad(dx,dy,o);X.restore();X.strokeStyle='rgba(255,255,255,0.8)';X.lineWidth=3;X.beginPath();X.ellipse(dx,dy+4,26+Math.sin(t*4)*3,7,0,0,TAU);X.stroke()}
    else drawDad(dx,dy,o)}
  // camcorder pops out of Zoe's hands
  if(t>3.0&&t<4.4){const k=ease((t-3)/0.4);const zx=c.x+30,zy=c.y-10-k*20;camcorder(zx,zy,k*1.3)}
  if(t>4.2&&t<9.6)drawVHS(t-4.2);
  if(t>8&&t<9.8)stampDraw(t-8)}
function camcorder(x,y,s){X.save();X.translate(x,y);X.scale(s,s);rrect(-18,-11,30,22,5);X.fillStyle='#37474f';X.fill();circ(16,0,9,'#263238');circ(16,0,5,'#5ec8ff');circ(14,-2,1.6,'#fff');rrect(-14,-17,14,7,3);X.fillStyle='#455a64';X.fill();
  if(Math.sin(T*10)>0)circ(-11,-4,3.5,'#ff1744');X.font='900 6px system-ui';X.fillStyle='#fff';X.fillText('REC',-3,-3);X.restore()}
function drawVHS(t){// instant replay, slow-mo, VHS style
  const a=Math.min(1,t*4)*(t>5.2?Math.max(0,(5.4-t)/0.2):1);X.save();X.globalAlpha=a;
  X.fillStyle='rgba(10,10,30,0.82)';X.fillRect(0,0,W,H);const fw=W-30,fh=fw*0.78,fx=15,fy=H*0.5-fh/2-20;
  X.save();rrect(fx,fy,fw,fh,10);X.clip();
  const g=X.createLinearGradient(0,fy,0,fy+fh);g.addColorStop(0,'#58c9e8');g.addColorStop(1,'#2f8fbf');X.fillStyle=g;X.fillRect(fx,fy,fw,fh);
  // slow-mo replay: canoe rolls hard, Dad cartwheels out, giant crown splash
  const rt=Math.min(1,t/3.6),zoom=1.1+ease(rt)*0.4,cx=fx+fw*0.52,cy=fy+fh*0.5;
  X.save();X.translate(cx,cy);X.scale(zoom,zoom);X.translate(-cx,-cy+rt*14);
  X.strokeStyle='rgba(255,255,255,0.35)';X.lineWidth=3;for(let i=0;i<6;i++){const yy=cy-120+i*50+((t*30)%50);X.beginPath();X.moveTo(cx-200,yy);X.quadraticCurveTo(cx-100,yy-8,cx,yy);X.quadraticCurveTo(cx+100,yy+8,cx+200,yy);X.stroke()}
  const tip=rt<0.3?ease(rt/0.3)*0.8:0.8*Math.max(0,1-ease((rt-0.3)/0.45))+Math.sin(rt*28)*0.07*(1-rt);
  const kx=cx+30,ky=cy-20;X.save();X.translate(kx,ky);X.rotate(tip);X.scale(1-tip*0.28,1);drawCanoe(0,0,0);
  drawKid(0,4,'zoe',{oops:rt<0.55,cheer:rt>0.8});drawKid(0,-44,'alex',{oops:rt<0.55,cheer:rt>0.8});X.restore();
  const k=clamp((rt-0.1)/0.42,0,1),sx0=kx-Math.sin(tip)*52,sy0=ky+Math.cos(tip)*52,ex=cx-95,ey=cy+80;
  if(rt<0.52){drawDad(lerp(sx0,ex,k),lerp(sy0,ey,k)-Math.sin(k*Math.PI)*120,{flail:1,open:1,rot:-k*4.2,s:1+Math.sin(k*Math.PI)*0.3});
    if(k>0.15&&k<0.9)txt('WHOA!',lerp(sx0,ex,k)+40,lerp(sy0,ey,k)-Math.sin(k*Math.PI)*120-40,22,'#fff','center','#e53935')}
  else{const sp=(rt-0.52)/0.48,h=Math.sin(Math.min(1,sp*1.4)*Math.PI*0.5+(sp>0.7?(sp-0.7)*2:0));
    for(let j=0;j<4;j++){const rs=clamp(sp*1.3-j*0.18,0,1);X.strokeStyle=`rgba(255,255,255,${0.85*(1-rs)})`;X.lineWidth=5;X.beginPath();X.ellipse(ex,ey+10,30+rs*170,9+rs*42,0,0,TAU);X.stroke()}
    X.globalAlpha=Math.max(0,1-sp*1.4);ell(ex,ey-70*Math.min(1,sp*3),30,80*(1-sp*0.5),'rgba(235,250,255,0.92)');X.globalAlpha=1;
    if(sp>0.3){X.save();X.beginPath();X.rect(fx-100,fy-100,fw+200,ey+6-fy+100);X.clip();drawDad(ex,ey+34-ease((sp-0.3)/0.4)*34,{thumbs:sp>0.65,happy:sp>0.65,open:sp<=0.65,drip:1});X.restore()}
    for(let i=0;i<26;i++){const an=Math.PI+i/25*Math.PI,r=40+sp*170;circ(ex+Math.cos(an)*r*0.75,ey+Math.sin(an)*r*h*1.1-sp*30+sp*sp*120,9*(1-sp*0.6),'rgba(240,252,255,0.95)')}
    if(sp<0.85)txt('KER-SPLASH!',cx+20,fy+70,34*(1+0.15*Math.sin(sp*25)),'#fff','center','#1565c0')}
  X.restore();
  txt(rt<1?'x0.25':'⏸',fx+fw-40,fy+fh-42,13,'#fff','center','rgba(0,0,0,0.5)','700 ');
  // VHS artefacts: scanlines, tracking band, colour fringe
  X.globalAlpha=a*0.18;X.fillStyle='#000';for(let y=fy;y<fy+fh;y+=3)X.fillRect(fx,y,fw,1.3);X.globalAlpha=a;
  const band=fy+((t*90)%fh);X.fillStyle='rgba(255,255,255,0.12)';X.fillRect(fx,band,fw,10);X.fillStyle='rgba(255,0,80,0.06)';X.fillRect(fx+3,fy,fw,fh);X.fillStyle='rgba(0,200,255,0.05)';X.fillRect(fx-3,fy,fw,fh);
  X.restore();X.strokeStyle='#fff';X.lineWidth=3;rrect(fx,fy,fw,fh,10);X.stroke();
  const mono='700 ';txt('▶ PLAY  SLOW-MO',fx+14,fy+20,15,'#fff','left','rgba(0,0,0,0.5)',mono);
  if(Math.sin(T*8)>-0.2){circ(fx+fw-64,fy+20,6,'#ff1744');txt('REC',fx+fw-40,fy+21,15,'#fff','center',null,mono)}
  txt('SPLASH CAM',W/2,fy-26,30,'#ffd23f','center','#e53935');
  const sec=Math.floor(t*10)%60;txt('SUMMER  0:0'+(Math.floor(t)%10)+':'+String(sec).padStart(2,'0'),fx+fw-12,fy+fh-18,13,'#fff','right','rgba(0,0,0,0.5)',mono);
  txt('😂 😂 😂',W/2,fy+fh+34,30,'#fff');X.restore()}
function stampDraw(t){const k=t<0.25?1+(1-t/0.25)*2:1;X.save();X.translate(W/2,H*0.5);X.rotate(-0.18);X.scale(k,k);X.globalAlpha=Math.min(1,t*5)*(t>1.5?Math.max(0,(1.8-t)/0.3):1);
  rrect(-170,-58,340,116,14);X.fillStyle='rgba(255,255,255,0.92)';X.fill();X.lineWidth=7;X.strokeStyle='#d32f2f';X.stroke();rrect(-160,-48,320,96,10);X.lineWidth=2.5;X.stroke();
  txt('📼 SENT TO',0,-22,26,'#d32f2f');txt('FUNNIEST HOME VIDEOS!',0,16,25,'#d32f2f');X.restore()}
function drawCard(){const c=card,t=c.t,k=ease(t*2.5),out=t>2.3?ease((t-2.3)*3):0,S=SECTIONS[c.i];X.save();X.globalAlpha=1-out;
  X.fillStyle=`rgba(20,40,80,${0.35*k})`;X.fillRect(0,0,W,H);X.translate(W/2,H*0.42+(1-k)*H*0.6-out*60);X.rotate(-0.03+Math.sin(T*2)*0.012);
  rrect(-160,-150,320,300,36);X.fillStyle='#fffaf0';X.fill();X.lineWidth=8;X.strokeStyle=S.col;X.stroke();
  const pb=1+Math.sin(T*6)*0.05;X.save();X.translate(0,-62);X.scale(pb,pb);circ(0,0,72,S.col);circ(0,0,60,'rgba(255,255,255,0.35)');txt(S.icon,0,4,76,'#000');X.restore();
  for(let i=0;i<5;i++){const a=T*1.5+i*1.26;txt('✦',Math.cos(a)*92,-62+Math.sin(a)*92,16,S.col)}
  txt(S.n,0,38,32,S.col,'center','#fff');
  X.strokeStyle='#ddd';X.lineWidth=5;X.beginPath();X.moveTo(-90,102);X.lineTo(90,102);X.stroke();
  for(let i=0;i<4;i++){const x=-90+i*60,on=i===c.i;circ(x,102,on?18:12,i<=c.i?SECTIONS[i].col:'#ddd');txt(SECTIONS[i].icon,x,103,on?18:11,'#000')}
  txt('⛺',118,102,22,'#000');X.restore()}
// ---------- screens ----------
let titleUI={};
function titleTap(p){if(titleUI.tilt&&inRect(p,titleUI.tilt))return;if(titleUI.go&&inRect(p,titleUI.go)){AUD.SFX.splash(true);startGame();return}
  if(titleUI.mute&&inRect(p,titleUI.mute)){AUD.setMuted(!AUD.muted);return}
  for(const[k,r]of Object.entries(titleUI)){if(k.startsWith('hA')&&inRect(p,r)){hatA=+k.slice(2);localStorage.setItem('wwp_hatA',hatA);AUD.SFX.boing()}if(k.startsWith('hZ')&&inRect(p,r)){hatZ=+k.slice(2);localStorage.setItem('wwp_hatZ',hatZ);AUD.SFX.boing()}}
  if(!titleUI.ahoyed&&AUD.unlocked){titleUI.ahoyed=1;setTimeout(()=>AUD.say('ahoy',2),300)}AUD.setTheme('title')}
function drawTitle(){dist+=40/60;fillDecor();drawWorld();
  const g=X.createLinearGradient(0,0,0,H*0.3);g.addColorStop(0,'rgba(130,210,255,0.95)');g.addColorStop(1,'rgba(130,210,255,0)');X.fillStyle=g;X.fillRect(0,0,W,H*0.3);
  circ(W-60,70,30,'#ffe066');circ(W-60,70,40,'rgba(255,230,100,0.3)');
  const ty=Math.max(60,H*0.1);X.save();X.translate(W/2,ty);X.rotate(-0.04+Math.sin(T*1.5)*0.015);
  txt('The',0,-30,24,'#fff','center','#1d2b4f');txt('WILSON WATER',0,6,44,'#ffd23f','center','#1d2b4f');txt('PIRATES',0,52,58,'#ff5ca8','center','#1d2b4f');X.restore();
  canoe.armA=0;canoe.armZ=0;const cy=H*0.52;drawFamily(W/2,cy,Math.sin(T*1.6)*0.06,{cheer:Math.sin(T*1.2)>0.6?1:0});
  // name tags
  txt('Alex',W/2+92,cy-58,18,'#fff','center','#1d2b4f');txt('Zoe',W/2+86,cy-2,18,'#fff','center','#1d2b4f');txt('Dad',W/2+86,cy+52,18,'#fff','center','#1d2b4f');
  // hat pickers
  const py=H*0.52+120;titleUI={ahoyed:titleUI.ahoyed,tilt:titleUI.tilt};
  [['A',hatA,'alex'],['Z',hatZ,'zoe']].forEach(([w,sel,who],row)=>{const y=py+row*50;drawKid(34,y+10,who,{s:0.75,happy:true,noBalloon:true});
    HATS.forEach((c,i)=>{const x=78+i*44;const r=[x-19,y-19,38,38];titleUI['h'+w+i]=r;circ(x,y,sel===i?19:15,c);if(sel===i){X.lineWidth=4;X.strokeStyle='#fff';X.beginPath();X.arc(x,y,19,0,TAU);X.stroke()}})});
  // GO
  const gy=Math.min(H-100,py+110);const pulse=1+Math.sin(T*5)*0.05;X.save();X.translate(W/2,gy);X.scale(pulse,pulse);rrect(-100,-40,200,80,40);X.fillStyle='#35c46a';X.fill();X.lineWidth=6;X.strokeStyle='#fff';X.stroke();
  txt('GO! ▶',0,3,44,'#fff','center','#1b7a3c');X.restore();titleUI.go=[W/2-110,gy-48,220,96];
  txt('🏆 '+best,W/2,gy+66,22,'#fff','center','#1d2b4f');
  if(canTilt){titleUI.tilt=[8,H-58,50,50];circ(33,H-33,24,tiltOn?'#35c46a':'rgba(255,255,255,0.85)');txt('📱',33,H-32,22,'#000');if(tiltOn)txt('↔',33,H-62,16,'#fff','center','#1b7a3c')}
  titleUI.mute=[W-58,H-58,50,50];circ(W-33,H-33,24,'rgba(255,255,255,0.85)');txt(AUD.muted?'🔇':'🔊',W-33,H-32,24,'#000');
  drawParts()}
function drawEnd(){drawWorld();X.fillStyle='rgba(20,30,70,0.35)';X.fillRect(0,0,W,H);const k=ease(endT*2);X.save();X.translate(W/2,H*0.5);X.scale(k,k);X.translate(-W/2,-H*0.5);
  const pw=W-30,ph=Math.min(H-60,600),px=15,py=(H-ph)/2;rrect(px,py,pw,ph,30);X.fillStyle='rgba(255,252,240,0.97)';X.fill();X.lineWidth=6;X.strokeStyle='#ffd23f';X.stroke();
  let y=py+40;txt('⛺ CAMP! ⛺',W/2,y,36,'#ff5ca8','center','#fff');y+=50;
  const st=stars();for(let i=0;i<3;i++){const on=i<st&&endT>0.6+i*0.35;const s=on?1+Math.max(0,0.3-(endT-0.6-i*0.35))*2:1;X.save();X.translate(W/2+(i-1)*70,y+(i===1?-8:6));X.scale(s,s);txt('★',0,0,64,on?'#ffd23f':'#ddd','center',on?'#e0a000':'#bbb');X.restore()}
  y+=64;const row=(icon,label,val)=>{rrect(px+20,y-22,pw-40,44,22);X.fillStyle='#e8f7ff';X.fill();txt(icon,px+48,y+1,26,'#000');txt(label,px+74,y+1,17,'#1d2b4f','left');txt(String(val),px+pw-40,y+1,26,'#1565c0','right');y+=52};
  row('💦','Splashes',splashes);row('🪙','Treasure',treasure);row('⭐','Score',score);row('🤣',"Dad's Funniest Splashes",dadFalls);
  if(dadFalls>=2){X.save();X.translate(W/2,y+30);X.rotate(Math.sin(T*3)*0.05);txt('🏆',-118,0,44,'#000');txt('Grand Prize:',18,-12,20,'#e53935');txt('$10,000?!',18,14,26,'#e53935','center','#ffd23f');X.restore();y+=72}
  else{txt('📼 Dad is camera-ready!',W/2,y+10,17,'#7e57c2');y+=36}
  if(score>=best&&score>0){txt('NEW BEST! 🏆 '+best,W/2,y,20,'#43a047');}else txt('🏆 Best: '+best,W/2,y,18,'#1d2b4f');
  const by=py+ph-62;ui.again=[W/2-30,by-34,170,68];rrect(W/2-30,by-34,170,68,34);X.fillStyle='#35c46a';X.fill();X.lineWidth=5;X.strokeStyle='#fff';X.stroke();txt('AGAIN ↻',W/2+55,by+2,28,'#fff','center','#1b7a3c');
  ui.home=[W/2-150,by-34,100,68];rrect(W/2-150,by-34,100,68,34);X.fillStyle='#29b6f6';X.fill();X.strokeStyle='#fff';X.stroke();txt('🏠',W/2-100,by+2,30,'#000');
  X.restore();drawParts()}
// ---------------- loop ----------------
let last=performance.now();
function frame(now){const dt=Math.min(0.05,(now-last)/1000);last=now;try{for(let i=0;i<TS;i++)update(dt);render()}catch(e){console.error(e)}requestAnimationFrame(frame)}
function render(){X.setTransform(DPR*SC,0,0,DPR*SC,0,0);X.clearRect(0,0,W,H);
  if(state==='title'){T+=0;drawTitle();return}
  if(state==='end'){drawEnd();return}
  X.save();if(shake>0)X.translate(rr(-1,1)*shake*16,rr(-1,1)*shake*16);
  drawWorld();objs.filter(o=>o.type==='o').forEach(drawObj);objs.filter(o=>o.type!=='o').forEach(drawObj);
  if(state==='dad')drawDadScene();else{const c=canoeGeom();if(canoe.inv>0&&Math.sin(T*30)>0)X.globalAlpha=0.6;drawFamily(c.x,c.y,c.a,{cheer:canoe.cheer});X.globalAlpha=1}
  drawShots();X.restore();drawParts();if(!(state==='dad'&&dadSeq.t>4.2&&dadSeq.t<9.6))drawHUD();drawBanner();if(card)drawCard()}
reset();AUD.setTheme('title');requestAnimationFrame(frame);
if(DEBUG)window.__W={get state(){return state},get score(){return score},get splashes(){return splashes},get treasure(){return treasure},get hearts(){return hearts},get dadFalls(){return dadFalls},get canoe(){return canoe},get shooter(){return shooter},get dad(){return dadSeq&&dadSeq.t},
  audio:AUD,start:startGame,objs:()=>objs,clear(){objs=[]},spawn(k,x,yScreen){return spawnTarget(k,x,dist+(CY()-yScreen))},gold(k,x,yScreen){objs.push({type:'g',k,x,wy:dist+(CY()-yScreen),r:16,ph:0})},
  rock(x,yScreen,k){objs.push({type:'o',k:k||'rock',x,wy:dist+(CY()-yScreen),r:k==='big'?40:22,ph:0,ang:0,len:80})},fire,switchShooter,set runT(v){runT=v},get runT(){return runT},dadGo(){startDad({})},setDad(t){if(dadSeq)dadSeq.t=t},end(){score=Math.max(score,960);splashes=Math.max(splashes,41);treasure=Math.max(treasure,27);dadFalls=Math.max(dadFalls,2);finish()},
  freeze(){speed=0},get distV(){return dist},set TS(v){TS=v},get seen(){return seen},get cards(){return cards},get bumps(){return bumps},get card(){return card},get tiltOn(){return tiltOn},get stars(){return stars()},toggleTilt,toClient:(x,y)=>({x:x*SC,y:y*SC}),CY,setScore(v){score=v}};
})();
