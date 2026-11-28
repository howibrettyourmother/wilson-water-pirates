/*KFX-BEGIN*/
/* kfx.js v1 - recorded sound effects for the Wilson kids' games.
   One AAC sprite (audio/fx/fx.m4a + fx.json) of CC0 recordings (Kenney, OpenGameArt, Freesound CC0; see CREDITS-AUDIO.md).
   KFX.init({ctx:()=>AudioContext, out:()=>node, base:'audio/fx/', v:'ver', muted:()=>bool, duck:(depth,ms)=>{}})
   KFX.play('coin',{vol,rate})   KFX.bind(SFX,{gameName:'bankName'|['bankName',{opts}]|fn(args)->spec},{ok:fn})
   Keeps polyphony low (global + per-sound caps), gaps repeated triggers, varies pitch a little and never repeats the same take twice. */
(function(W){'use strict';
var K=W.KFX={stats:{play:0,drop:0,steal:0,decoded:0,err:0},ready:false};
var cfg={max:6},C=null,bus=null,ab=null,buf=null,idx=null,idxP=null,fetching=false,decoding=false,live=[],tlast={},lastI={},unlockedOnce=false;
var TONAL={chime:1,bell:1,star:1,correct:1,sparkle:1,magic:1,gem:1,coin:1,coins:1,pickup:1,power:1,shield:1,drip:1};
var JING={win:1,fanfare:1,levelup:1,sting:1,sad:1,fail:1,cheer:1,wow:1,airhorn:1,boom:1,roar:1,firework:1,rumble:1,stomp:1};
function prof(n){
  if(JING[n])return{gap:350,conc:1,jit:n==='boom'||n==='roar'||n==='stomp'?0.04:0,duck:n==='boom'||n==='stomp'||n==='rumble'?0.55:0.45,pri:3};
  if(TONAL[n])return{gap:70,conc:n==='coin'?3:2,jit:0.025,pri:2};
  if(n==='click'||n==='tap'||n==='tick'||n==='back'||n==='toggle'||n==='swipe'||n==='pop'||n==='squeak'||n==='pat'||n==='rustle')return{gap:55,conc:2,jit:0.06,pri:1};
  return{gap:80,conc:2,jit:0.05,pri:2};
}
function getC(){var c=null;try{c=cfg.ctx&&cfg.ctx()}catch(e){}if(c!==C){C=c;bus=null}return C}
function mkBus(){
  if(bus||!C)return bus;
  try{
    bus=C.createGain();bus.gain.value=cfg.gain==null?0.9:cfg.gain;
    var comp=C.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=8;comp.ratio.value=6;comp.attack.value=0.003;comp.release.value=0.14;
    bus.connect(comp);var o=typeof cfg.out==='function'?cfg.out():cfg.out;comp.connect(o||C.destination);
  }catch(e){bus=null}
  return bus;
}
function fetchSprite(){
  if(fetching||!cfg.base)return;fetching=true;var q=cfg.v?('?v='+cfg.v):'';
  try{
    fetch(cfg.base+'fx.json'+q).then(function(r){return r.json()}).then(function(j){idx=j}).catch(function(){K.stats.err++});
    fetch(cfg.base+'fx.m4a'+q).then(function(r){return r.arrayBuffer()}).then(function(a){ab=a;K.warm()}).catch(function(){K.stats.err++});
  }catch(e){K.stats.err++}
}
K.warm=function(){
  getC();if(!C||buf||decoding||!ab)return;decoding=true;
  var done=function(b){decoding=false;if(b){buf=b;K.ready=true;K.stats.decoded=1}else K.stats.err++};
  try{var p=C.decodeAudioData(ab.slice(0),done,function(){done(null)});if(p&&p.catch)p.catch(function(){})}catch(e){decoding=false}
};
K.init=function(o){
  for(var k in o)cfg[k]=o[k];
  fetchSprite();
  if(!unlockedOnce){unlockedOnce=true;
    ['pointerdown','touchend','click','keydown'].forEach(function(ev){W.addEventListener(ev,K.kick,{capture:true,passive:true})});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(K.kick,60)});
    W.addEventListener('pageshow',function(){setTimeout(K.kick,60)});
  }
};
/* gesture/visibility: make sure the context is running and the sprite is decoded (iOS needs resume() inside a tap) */
K.kick=function(){getC();if(!C)return;try{if(C.state!=='running'&&!document.hidden){var p=C.resume();p&&p.catch&&p.catch(function(){})}}catch(e){}K.warm()};
function pick(n,len){
  if(len<2)return 0;var i,t=0;do{i=(Math.random()*len)|0}while(i===lastI[n]&&++t<6);lastI[n]=i;return i}
K.play=function(name,o){
  o=o||{};getC();
  if(!C||C.state!=='running'||document.hidden)return false;
  if(cfg.muted&&cfg.muted())return false;
  if(!buf||!idx){K.warm();return false}
  var v=idx[name];if(!v||!v.length){K.stats.miss=(K.stats.miss||0)+1;return false}
  mkBus();if(!bus)return false;
  var P=prof(name),t=C.currentTime;
  if(t-(tlast[name]||-9)<P.gap/1000){K.stats.drop++;return false}
  live=live.filter(function(x){return x.end>t});
  var same=live.filter(function(x){return x.name===name});
  if(same.length>=P.conc)steal(same[0],t);
  if(live.length>=(cfg.max||6)){var lo=live[0];for(var i=1;i<live.length;i++)if(live[i].pri<lo.pri||(live[i].pri===lo.pri&&live[i].t0<lo.t0))lo=live[i];
    if(lo.pri>P.pri){K.stats.drop++;return false}steal(lo,t)}
  var seg=v[pick(name,v.length)],rate=(o.rate||1)*(1+(Math.random()*2-1)*(o.jit==null?P.jit:o.jit));
  var s=C.createBufferSource(),g=C.createGain();s.buffer=buf;s.playbackRate.value=rate;
  g.gain.value=(o.vol==null?1:o.vol);s.connect(g);g.connect(bus);
  try{s.start(t,seg[0],seg[1])}catch(e){return false}
  var rec={name:name,s:s,g:g,t0:t,end:t+seg[1]/rate+0.03,pri:P.pri};live.push(rec);
  s.onended=function(){try{g.disconnect()}catch(e){}};
  tlast[name]=t;K.stats.play++;
  if(P.duck&&cfg.duck&&!o.noduck){try{cfg.duck(P.duck,seg[1]/rate*1000)}catch(e){}}
  return true;
};
function steal(x,t){try{x.g.gain.cancelScheduledValues(t);x.g.gain.setTargetAtTime(0,t,0.008);x.s.stop(t+0.05)}catch(e){}x.end=t;K.stats.steal++}
/* bind(SFX, MAP, {ok}) - replace the game's synth effects with recordings; unmapped names keep their old behavior */
K.bind=function(SFX,MAP,opt){
  opt=opt||{};var bound=[];
  Object.keys(MAP).forEach(function(k){
    if(!(k in SFX))return;var m=MAP[k];
    SFX[k]=function(){
      try{
        if(opt.ok&&!opt.ok())return;
        var spec=typeof m==='function'?m.apply(null,arguments):m;if(!spec)return;
        if(typeof spec==='string')K.play(spec);
        else if(spec instanceof Array)K.play(spec[0],spec[1]);
        else if(spec.n)K.play(spec.n,spec);
      }catch(e){}
    };bound.push(k);
  });
  K.bound=(K.bound||[]).concat(bound);return bound;
};
})(window);

/*KFX-END*/
const AUD=(()=>{
  let C=null,master,musicBus,musicDuck,sfxBus,voiceBus,noiseBuf,unlocked=false,silentEl=null,clips={},loading=false;
  let muted=localStorage.getItem('wwp_muted')==='1';
  const R=Math.random,rr=(a,b)=>a+R()*(b-a),pick=a=>a[(R()*a.length)|0];
  const now=()=>C?C.currentTime:0;const stats={voice:0,last:'',dropped:0,sfx:0};
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  function build(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;C=new AC();try{C.addEventListener('statechange',()=>{if(C.state==='interrupted')setTimeout(wake,300)})}catch(e){}
    master=C.createGain();master.gain.value=muted?0:0.9;const comp=C.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;
    master.connect(comp);comp.connect(C.destination);
    const bus=v=>{const g=C.createGain();g.gain.value=v;g.connect(master);return g};
    musicBus=bus(0.38);musicDuck=C.createGain();musicDuck.connect(musicBus);sfxBus=bus(0.7);voiceBus=bus(1.15);
    const sr=C.sampleRate;noiseBuf=C.createBuffer(1,sr*2,sr);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=R()*2-1;
    /* synth disabled */0;}
  function unlock(){try{if(!C)build();if(!C)return;try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
      if(C.state!=='running')C.resume().catch(()=>{});
      const s=C.createBufferSource();s.buffer=C.createBuffer(1,1,22050);s.connect(C.destination);s.start(0);
      // looping near-silent <audio> => 'playback' session so sound works with the iPhone ringer/silent switch on
      if(!silentEl){silentEl=document.createElement('audio');silentEl.setAttribute('playsinline','');silentEl.setAttribute('webkit-playsinline','');silentEl.setAttribute('x-webkit-airplay','deny');silentEl.preload='auto';silentEl.loop=true;silentEl.src=SILENT_MP3;silentEl.volume=0.01}
      if(silentEl.paused&&!document.hidden){const p=silentEl.play();p&&p.catch&&p.catch(()=>{})}
      if(!unlocked){unlocked=true;loadClips()}}catch(e){console.warn('unlock',e)}}
  ['touchstart','touchend','pointerdown','mousedown','click','keydown'].forEach(ev=>window.addEventListener(ev,unlock,{capture:true,passive:true}));
  // iOS: wake from an 'interrupted' state (call, Siri, background) when the page comes back
  function wake(){if(C&&unlocked&&!document.hidden&&C.state!=='running'&&C.state!=='closed')C.resume().catch(()=>{})}
  ['pageshow','focus'].forEach(e=>addEventListener(e,wake));
  document.addEventListener('visibilitychange',()=>{if(!C)return;if(document.hidden){C.suspend&&C.suspend().catch(()=>{});silentEl&&silentEl.pause()}
    else if(unlocked){C.resume().catch(()=>{});if(silentEl){const p=silentEl.play();p&&p.catch&&p.catch(()=>{})}}});
  function loadClips(){if(loading)return;loading=true;for(const k in CLIPS){try{const b=atob(CLIPS[k]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
    const p=C.decodeAudioData(u.buffer,x=>{clips[k]=x},()=>{});p&&p.catch&&p.catch(()=>{})}catch(e){}}}
  const safe=fn=>function(){try{if(!sfxOK())return;if(!C||muted||C.state!=='running')return;stats.sfx++;return fn.apply(null,arguments)}catch(e){}};
  function g(v,out){const x=C.createGain();x.gain.value=v;x.connect(out);return x}
  function env(x,t,a,h,r,v){x.gain.setValueAtTime(0.0001,t);x.gain.linearRampToValueAtTime(v,t+a);x.gain.setValueAtTime(v,t+a+h);x.gain.exponentialRampToValueAtTime(0.0001,t+a+h+r)}
  function o(type,f,t,d,out){const x=C.createOscillator();x.type=type;x.frequency.setValueAtTime(f,t);x.connect(out);x.start(t);x.stop(t+d+0.05);return x}
  function f(type,fr,q,out){const x=C.createBiquadFilter();x.type=type;x.frequency.value=fr;x.Q.value=q||0.7;x.connect(out);return x}
  function n(t,d,out){const s=C.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.connect(out);s.start(t,R());s.stop(t+d+0.05);return s}
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  // ---------- SFX ----------
  const SFX={
    squirt:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.01,0.08,0.12,0.12);const F=f('bandpass',2600,1.2,G);n(t,0.25,F);F.frequency.exponentialRampToValueAtTime(1200,t+0.22)}),
    toss:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.01,0.1,0.15,0.06);const x=o('sine',300,t,0.3,G);x.frequency.exponentialRampToValueAtTime(900,t+0.28)}),
    splash:safe((big)=>{const t=now(),G=g(0,sfxBus);env(G,t,0.005,0.05,big?0.6:0.35,big?0.35:0.22);const F=f('lowpass',big?2400:3400,0.8,G);n(t,0.8,F);F.frequency.exponentialRampToValueAtTime(300,t+(big?0.7:0.4));
      for(let i=0;i<5;i++){const s=t+rr(0.02,0.25),B=g(0,sfxBus);env(B,s,0.002,0.01,0.05,0.05);const x=o('sine',rr(700,1500),s,0.08,B);x.frequency.exponentialRampToValueAtTime(rr(1800,2600),s+0.06)}}),
    pop:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.001,0.01,0.08,0.3);n(t,0.1,f('highpass',900,0.7,G))}),
    quack:safe(()=>{const t=now();for(let k=0;k<2;k++){const s=t+k*0.17,G=g(0,sfxBus);env(G,s,0.01,0.06,0.07,0.16);const F=f('bandpass',1100,3,G);const x=o('sawtooth',420,s,0.15,F);x.frequency.linearRampToValueAtTime(300,s+0.14)}}),
    ribbit:safe(()=>{const t=now();for(let k=0;k<2;k++){const s=t+k*0.16,G=g(0,sfxBus);const F=f('bandpass',700,4,G);const x=o('square',140,s,0.12,F);for(let j=0;j<6;j++){G.gain.setValueAtTime(0.0001,s+j*0.02);G.gain.linearRampToValueAtTime(0.2,s+j*0.02+0.008)}G.gain.exponentialRampToValueAtTime(0.0001,s+0.13)}}),
    giggle:safe((hi)=>{const t=now(),base=hi?900:650;for(let k=0;k<5;k++){const s=t+k*0.09,G=g(0,sfxBus);env(G,s,0.01,0.02,0.05,0.07);const F=f('bandpass',base*2,2,G);const x=o('triangle',base*(1.15-k*0.04),s,0.08,F);x.frequency.exponentialRampToValueAtTime(base*0.85,s+0.07)}}),
    laughMan:safe(()=>{const t=now();for(let k=0;k<4;k++){const s=t+k*0.14,G=g(0,sfxBus);env(G,s,0.01,0.04,0.06,0.09);const F=f('bandpass',700,2,G);const x=o('sawtooth',200-k*8,s,0.12,F);x.frequency.exponentialRampToValueAtTime(150,s+0.1)}}),
    coin:safe(()=>{const t=now();[[1319,0],[1760,0.07]].forEach(([fr,d])=>{const G=g(0,sfxBus);env(G,t+d,0.003,0.05,0.25,0.12);o('square',fr,t+d,0.3,f('lowpass',4000,0.7,G))})}),
    bump:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.005,0.05,0.25,0.4);const x=o('sine',140,t,0.3,G);x.frequency.exponentialRampToValueAtTime(60,t+0.25);const W=g(0,sfxBus);env(W,t+0.1,0.02,0.2,0.2,0.06);const y=o('triangle',500,t+0.1,0.45,W);y.frequency.linearRampToValueAtTime(300,t+0.5)}),
    boing:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.005,0.2,0.3,0.15);const x=o('sine',200,t,0.5,G);const L=C.createOscillator(),LG=C.createGain();L.frequency.value=14;LG.gain.value=60;L.connect(LG);LG.connect(x.frequency);L.start(t);L.stop(t+0.55);x.frequency.exponentialRampToValueAtTime(500,t+0.45)}),
    whoosh:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.15,0.1,0.3,0.15);const F=f('bandpass',400,1.5,G);n(t,0.6,F);F.frequency.exponentialRampToValueAtTime(3000,t+0.5)}),
    stamp:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.002,0.03,0.2,0.5);const x=o('sine',90,t,0.25,G);x.frequency.exponentialRampToValueAtTime(40,t+0.2);const H=g(0,sfxBus);env(H,t,0.001,0.01,0.08,0.3);n(t,0.1,f('lowpass',1500,0.7,H))}),
    rewind:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.02,0.5,0.1,0.06);const x=o('sawtooth',300,t,0.6,f('lowpass',2000,1,G));x.frequency.exponentialRampToValueAtTime(1800,t+0.6)}),
    beep:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.003,0.08,0.05,0.08);o('square',1500,t,0.15,G)}),
    cheer:safe(()=>{const t=now();for(let k=0;k<10;k++){const s=t+rr(0,0.5),G=g(0,sfxBus),d=rr(0.4,0.8);env(G,s,0.06,d*0.5,d*0.5,0.035);const F=f('bandpass',rr(900,1500),2,G);const x=o('sawtooth',rr(330,520),s,d,F);x.frequency.linearRampToValueAtTime(rr(450,700),s+d*0.6)}
      const N=g(0,sfxBus);env(N,t,0.2,0.6,0.6,0.08);n(t,1.5,f('bandpass',1800,0.6,N));for(let i=0;i<24;i++){const s=t+rr(0.05,1.4),G=g(0,sfxBus);env(G,s,0.001,0.005,0.03,rr(0.06,0.14));n(s,0.05,f('bandpass',rr(1000,2400),1.2,G))}}),
    laughTrack:safe(()=>{const t=now();// canned studio audience: many voices "ha-ha-ha" through 'ah' formants + applause
      const out=g(0.11,sfxBus);const inp=C.createGain();[[760,5,1],[1250,6,0.6],[2600,8,0.2]].forEach(([fr,q,a])=>{inp.connect(f('bandpass',fr,q,g(a*3,out)))});
      for(let i=0;i<14;i++){const fr=rr(150,360),st=t+rr(0,0.5),k=(rr(6,11))|0,per=rr(0.13,0.19),G=C.createGain();G.gain.value=0;G.connect(inp);const x=o('sawtooth',fr,st,k*per+0.2,G);
        for(let j=0;j<k;j++){const s=st+j*per,v=rr(0.5,1)*(1-j/k*0.6);G.gain.setValueAtTime(0.0001,s);G.gain.linearRampToValueAtTime(v,s+0.025);G.gain.exponentialRampToValueAtTime(0.0001,s+per*0.85);x.frequency.setValueAtTime(fr*(1.2-j*0.03),s);x.frequency.exponentialRampToValueAtTime(fr*(1-j*0.03),s+per*0.8)}}
      for(let i=0;i<50;i++){const s=t+rr(0.8,2.6),G=g(0,sfxBus);env(G,s,0.001,0.005,0.03,rr(0.04,0.1));n(s,0.05,f('bandpass',rr(900,2200),1.2,G))}}),
    fanfare:safe(()=>{const t=now();[[72,0],[76,0.15],[79,0.3],[84,0.45],[84,0.75]].forEach(([m,d],i)=>{const G=g(0,sfxBus);env(G,t+d,0.01,i==4?0.5:0.1,0.3,0.1);o('square',mtof(m),t+d,0.9,f('lowpass',3000,0.7,G));const G2=g(0,sfxBus);env(G2,t+d,0.005,0.02,0.8,0.08);o('sine',mtof(m+12),t+d,0.9,G2)})})
,
    // --- v2 upgrade: streak notes, super soak, toot cannon, boss, Doodle ---
    streak:safe((lv)=>{const t=now(),sc=[0,2,4,7,9,12,14,16,19,21,24],m=72+sc[Math.min(sc.length-1,Math.max(0,lv|0))];[[0,0],[0.07,7]].forEach(([d,add],i)=>{const G=g(0,sfxBus);env(G,t+d,0.004,0.05,0.22,0.16);o('triangle',mtof(m+add),t+d,0.3,f('lowpass',4200,0.7,G));const G2=g(0,sfxBus);env(G2,t+d,0.003,0.02,0.12,0.06);o('sine',mtof(m+add+12),t+d,0.2,G2)})}),
    superOn:safe(()=>{const t=now();const G=g(0,sfxBus);env(G,t,0.02,0.45,0.35,0.22);const x=o('sawtooth',200,t,0.9,f('lowpass',2600,1.2,G));x.frequency.exponentialRampToValueAtTime(1600,t+0.55);
      [[72,0.3],[76,0.42],[79,0.54],[84,0.66],[88,0.78]].forEach(([m,d],i)=>{const H=g(0,sfxBus);env(H,t+d,0.005,0.08,0.25,0.14);o('square',mtof(m),t+d,0.5,f('lowpass',3600,0.8,H))});
      const N=g(0,sfxBus);env(N,t,0.1,0.3,0.4,0.18);n(t,0.9,f('bandpass',1600,0.7,N))}),
    superOff:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.01,0.05,0.35,0.14);const x=o('triangle',900,t,0.5,G);x.frequency.exponentialRampToValueAtTime(220,t+0.4)}),
    toot:safe((big)=>{const t=now(),d=big?0.55:0.32,G=g(0,sfxBus);env(G,t,0.02,d*0.5,d*0.5,0.3);const F=f('bandpass',big?170:240,4,G);const x=o('sawtooth',big?95:130,t,d,F);x.frequency.linearRampToValueAtTime(big?70:100,t+d);
      const L=C.createOscillator(),LG=C.createGain();L.type='square';L.frequency.value=big?28:36;LG.gain.value=big?30:40;L.connect(LG);LG.connect(x.frequency);L.start(t);L.stop(t+d+0.05);
      const N=g(0,sfxBus);env(N,t,0.01,d*0.4,d*0.5,0.12);n(t,d,f('lowpass',900,0.8,N))}),
    cloudPop:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.002,0.02,0.2,0.22);const x=o('sine',700,t,0.25,G);x.frequency.exponentialRampToValueAtTime(220,t+0.2);const H=g(0,sfxBus);env(H,t,0.001,0.01,0.1,0.12);n(t,0.1,f('highpass',1500,0.7,H))}),
    bossHit:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.003,0.03,0.3,0.4);const x=o('sine',180,t,0.35,G);x.frequency.exponentialRampToValueAtTime(70,t+0.28);const W=g(0,sfxBus);env(W,t+0.02,0.01,0.1,0.2,0.1);const y=o('triangle',380,t+0.02,0.35,W);y.frequency.linearRampToValueAtTime(220,t+0.3);
      const N=g(0,sfxBus);env(N,t,0.002,0.02,0.18,0.25);n(t,0.25,f('lowpass',2600,0.7,N))}),
    horn:safe(()=>{const t=now();[0,0.28].forEach((d,i)=>{const G=g(0,sfxBus);env(G,t+d,0.03,0.18,0.22,0.22);const x=o('sawtooth',i?196:147,t+d,0.5,f('lowpass',1100,1,G));x.frequency.linearRampToValueAtTime(i?180:140,t+d+0.45)})}),
    bossDown:safe(()=>{const t=now();const G=g(0,sfxBus);env(G,t,0.01,0.1,0.9,0.22);const x=o('sine',1400,t,1.1,G);x.frequency.exponentialRampToValueAtTime(110,t+1.0);
      const N=g(0,sfxBus);env(N,t+0.9,0.02,0.2,0.7,0.35);n(t+0.9,1,f('lowpass',2200,0.8,N));[[72,1.5],[76,1.65],[79,1.8],[84,1.95]].forEach(([m,d])=>{const H=g(0,sfxBus);env(H,t+d,0.005,0.1,0.4,0.16);o('square',mtof(m),t+d,0.6,f('lowpass',3400,0.8,H))})}),
    meow:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.06,0.18,0.22,0.22);const F=f('bandpass',1500,3,G);const x=o('sawtooth',520,t,0.5,F);x.frequency.linearRampToValueAtTime(900,t+0.2);x.frequency.linearRampToValueAtTime(560,t+0.46);
      const F2=f('bandpass',2600,4,G);const y=o('sawtooth',520,t,0.5,F2);y.frequency.linearRampToValueAtTime(900,t+0.2);y.frequency.linearRampToValueAtTime(560,t+0.46)}),
    hose:safe(()=>{const t=now(),G=g(0,sfxBus);env(G,t,0.01,0.05,0.12,0.1);const F=f('bandpass',3200,1.5,G);n(t,0.2,F);F.frequency.exponentialRampToValueAtTime(1800,t+0.17)}),
    parade:safe(()=>{const t=now();[0,4,7,12,16,19].forEach((s,i)=>{const G=g(0,sfxBus);env(G,t+i*0.07,0.004,0.04,0.2,0.12);o('square',mtof(76+s),t+i*0.07,0.3,f('lowpass',3800,0.7,G))})})
  };
  /*KFX-BIND*/try{KFX.init({ctx:()=>C,out:()=>sfxBus,muted:()=>muted,base:'audio/fx/',v:'20261128audio',gain:1.3,duck:(d,ms)=>{try{if(window.BGM&&BGM.duck)BGM.duck(d,ms)}catch(e){}}});
  KFX.bind(SFX,{
 /* ---- shared across Fry / Bee / Doodle / Adventure ---- */
 shoot:['bloop',{vol:.7}], pop:'pop', zap:'zap', honey:function(b){return b?'gem':'coin'}, power:'power', shield:'shield', shieldPop:['pop',{rate:.72}],
 hurt:'hurt', heart:'chime', check:'correct', bossHit:'thud', bossDown:'boom', warn:'bell', whoosh:'whoosh', squawk:['quack',{rate:1.3}], puff:'swipe', beep:'tick',
 roar:'roar', boing:'boing', firework:'firework', cheer:'cheer', fanfare:'fanfare', splat:'splat', plop:'plop', munch:'yum', whistle:'whistle', honk:'honk',
 fart:'fart', wet:'squish', mega:'boom', charge:'power', click:'click', star:'star', win:'win', tap:'tap', collect:'coin', thud:'thud', back:'back', open:'open', close:'close',
 /* ---- Doodle & Zoe / Alex & Doodle ---- */
 meow:'meow', purr:'purr', chime:'chime', treat:'coin', hop:['jump',{vol:.8}], hop2:['jump',{vol:.8,rate:1.12}], land:'land', knock:'knock', quack:'quack', squeak:'squeak', pat:'pat',
 rustle:'rustle', sticker:'star', shutter:'shutter', hoot:['bloop',{rate:.62,jit:.02}], crackle:'rustle', plane:'whoosh',
 note:function(m){return {n:'bellnote',rate:Math.pow(2,(((m-60)%24+24)%24-12)/12),jit:0,vol:.9}},
 /* ---- Lava ---- */
 jump:'jump', rocket:'rocket', coin:'coin', gem:'gem', stomp:'stomp', bump:'thud', appear:'sparkle', bubble:'bubble', hot:['rumble',{vol:.7}], blorp:'bloop', rumble:'rumble',
 grumble:'grumble', spit:'splat',
 /* ---- River Run ---- */
 paddle:['splash',{vol:.38,rate:1.3}], brake:['whoosh',{vol:.5,rate:.8}], splash:'splash', sputter:'bloop', bonk:'bonk', acorn:'gem', wave:'chime', burp:'burp', scoop:'pickup',
 drop:'coins', snap:['bonk',{rate:1.3}], sneeze:'sneeze', fish:['splash',{vol:.6,rate:1.35}], yum:'yum',
 /* ---- Unicorn ---- */
 sparkle:'sparkle', boop:'bloop', magic:'magic', drip:'drip', oops:'oops', giggle:'giggle', neigh:'whistle', flap:'swipe', clap:['pat',{rate:1.5}],
 /* ---- Pirates ---- */
 squirt:['splash',{vol:.5,rate:1.4}], toss:'whoosh', ribbit:'ribbit', laughMan:['giggle',{rate:.8}], stamp:'stomp', rewind:'scratch', laughTrack:'giggle',
 streak:function(lv){return {n:'chime',rate:Math.pow(2,Math.min(12,Math.max(0,lv|0))/12),jit:0}}, superOn:'power', superOff:['power',{rate:.72}], toot:function(b){return b?'fart':'toot'},
 cloudPop:['pop',{rate:.8}], horn:'honk', hose:['drip',{vol:.5}], parade:'levelup'
},{ok:()=>C&&!muted&&C.state==='running'&&sfxOK()})}catch(e){console.warn('kfx',e)}
  // ---------- one voice at a time, with ducking ----------
  let cur=null,curEnd=0,curPrio=0,queued=null;
  /*vguard*/let _vk='',_vt=0,_sx=[];function sfxOK(){const n=Date.now();_sx=_sx.filter(x=>n-x<350);if(_sx.length>=3)return false;_sx.push(n);return true}
  function say(k,prio,fromQ){const n=Date.now();if(k===_vk&&n-_vt<4000)return false;if((prio||1)<3&&C&&now()<curEnd-0.05)return false;const r=say0(k,prio);queued=null;if(r){_vk=k;_vt=n}return r}
  // counting (Zoe mode): a number always plays right away; it cuts whatever line is playing so no number is ever dropped
  let curSrc=null;function num(n){if(!C||muted||C.state!=='running')return false;const k='n'+Math.max(1,Math.min(n,100));if(!clips[k])return false;try{if(curSrc&&now()<curEnd)curSrc.stop()}catch(e){}queued=null;curEnd=0;stats.num=(stats.num||0)+1;return say0(k,3)}
  function say0(k,prio){prio=prio||1;if(!C||muted||C.state!=='running')return false;const b=clips[k];if(!b)return false;const t=now();
    if(t<curEnd){if(prio>curPrio&&prio>=3){queued={k,prio};return true}if(prio>=2&&(!queued||queued.prio<prio)){queued={k,prio};return true}stats.dropped++;return false}
    const s=C.createBufferSource();s.buffer=b;s.connect(voiceBus);s.start(t+0.02);curSrc=s;curEnd=t+0.02+b.duration+0.25;curPrio=prio;stats.voice++;stats.last=k;
    musicDuck.gain.cancelScheduledValues(t);musicDuck.gain.setTargetAtTime(0.3,t,0.04);musicDuck.gain.setTargetAtTime(1,curEnd,0.2);
    sfxBus.gain.cancelScheduledValues(t);sfxBus.gain.setTargetAtTime(0.42,t,0.04);sfxBus.gain.setTargetAtTime(0.7,curEnd,0.2);return true}
  setInterval(()=>{if(queued&&C&&now()>=curEnd){const q=queued;queued=null;say(q.k,q.prio)}},60);
  // ---------- music: cheerful pirate jig (6/8), ukulele + glockenspiel + kazoo + bass ----------
  const CH={C:[60,64,67,72],F:[60,65,69,72],G:[59,62,67,71],Am:[57,60,64,69],Dm:[57,62,65,69]};
  const PROG=['C','C','F','G','C','Am','G','C','F','C','Dm','G','C','Am','G','C'];
  const BASS={C:48,F:41,G:43,Am:45,Dm:50};
  const MEL=[72,-1,76,79,-1,76, 72,74,76,77,76,74, 77,-1,81,79,77,76, 74,-1,79,74,71,67, 72,-1,76,79,-1,84, 81,79,76,72,-1,76, 77,76,74,71,74,79, 72,-1,-1,72,-1,-1,
             77,-1,77,81,-1,77, 76,-1,76,79,-1,76, 74,76,77,81,79,77, 79,-1,74,71,-1,67, 76,77,79,84,-1,79, 81,-1,77,76,-1,72, 74,-1,79,77,76,74, 72,-1,79,72,-1,-1];
  let theme='off',step=0,nextT=0,eighth=0.2;
  function setTheme(th){if(th===theme)return;theme=th;step=0;if(C)nextT=now()+0.1;eighth=th==='sunset'?0.25:th==='title'?0.21:0.19}
  function uke(m,t,v){const G=g(0,musicDuck);env(G,t,0.003,0.02,0.35,v);const F=f('lowpass',2200,1,G);o('triangle',mtof(m),t,0.4,F);const G2=g(0,musicDuck);env(G2,t,0.002,0.01,0.12,v*0.5);o('square',mtof(m),t,0.15,f('lowpass',1800,0.7,G2))}
  function glock(m,t,v){const G=g(0,musicDuck);env(G,t,0.002,0.01,0.6,v);o('sine',mtof(m+12),t,0.7,G);const G2=g(0,musicDuck);env(G2,t,0.002,0.005,0.2,v*0.35);o('sine',mtof(m+12)*2.76,t,0.25,G2)}
  function kazoo(m,t,d,v){const G=g(0,musicDuck);env(G,t,0.03,d*0.6,0.08,v);const F=f('bandpass',1100,2.5,G);const F2=f('bandpass',2600,3,g(0.5,G));const x=o('sawtooth',mtof(m),t,d+0.1,F);x.connect(F2);
    const L=C.createOscillator(),LG=C.createGain();L.frequency.value=6;LG.gain.value=mtof(m)*0.02;L.connect(LG);LG.connect(x.frequency);L.start(t);L.stop(t+d+0.1);
    const B=g(0,G);env(B,t,0.01,d*0.6,0.08,0.3);n(t,d,f('bandpass',mtof(m)*3,6,B))}
  function bass(m,t,v){const G=g(0,musicDuck);env(G,t,0.005,0.1,0.25,v);o('triangle',mtof(m),t,0.4,G)}
  function shaker(t,v){const G=g(0,musicDuck);env(G,t,0.005,0.01,0.05,v);n(t,0.07,f('highpass',6000,0.7,G))}
  function wood(t,v){const G=g(0,musicDuck);env(G,t,0.001,0.005,0.06,v);o('sine',1200,t,0.08,G)}
  function boom(t,v){const G=g(0,musicDuck);env(G,t,0.003,0.03,0.2,v);const x=o('sine',110,t,0.25,G);x.frequency.exponentialRampToValueAtTime(50,t+0.2)}
  function schedule(){return;if(!C||theme==='off')return;if(nextT<now())nextT=now()+0.05;
    while(nextT<now()+0.15){const t=nextT,i=step%96,bar=(i/6)|0,e=i%6,ch=PROG[bar],soft=theme==='sunset'||theme==='end'?0.6:1;
      if(e===0||e===3){CH[ch].forEach((m,j)=>uke(m,t+j*0.012,0.05*soft))}else if(e===2||e===5){CH[ch].slice(1).forEach((m,j)=>uke(m,t+j*0.008,0.025*soft))}
      if(e===0)bass(BASS[ch],t,0.2*soft);if(e===3)bass(BASS[ch]+7,t,0.14*soft);
      if(theme!=='sunset'){shaker(t,e%3===0?0.04:0.02);if(e===0)boom(t,0.22);if(e===3)wood(t,0.05)}else if(e===0)shaker(t,0.02);
      const m=MEL[i];const kz=theme==='play'&&((step/96|0)%2===1);
      if(m>0){if(kz){let d=1;while(i+d<96&&MEL[i+d]===-1&&d<3)d++;kazoo(m-12,t,eighth*d*0.9,0.07)}else glock(m,t,0.07*soft)}
      step++;nextT+=eighth}}
  function setMuted(m){muted=m;localStorage.setItem('wwp_muted',m?'1':'0');if(C)master.gain.setTargetAtTime(m?0:0.9,now(),0.03)}
  return{unlock,SFX,say,num,setTheme,setMuted,get muted(){return muted},get unlocked(){return unlocked&&!!C},get running(){return !!C&&C.state==='running'},get clipCount(){return Object.keys(clips).length},get theme(){return theme},stats,get speaking(){return C&&now()<curEnd}};
})();
