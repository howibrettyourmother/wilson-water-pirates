const AUD=(()=>{
  let C=null,master,musicBus,musicDuck,sfxBus,voiceBus,noiseBuf,unlocked=false,silentEl=null,clips={},loading=false;
  let muted=localStorage.getItem('wwp_muted')==='1';
  const R=Math.random,rr=(a,b)=>a+R()*(b-a),pick=a=>a[(R()*a.length)|0];
  const now=()=>C?C.currentTime:0;const stats={voice:0,last:'',dropped:0,sfx:0};
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  function build(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;C=new AC();
    master=C.createGain();master.gain.value=muted?0:0.9;const comp=C.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;
    master.connect(comp);comp.connect(C.destination);
    const bus=v=>{const g=C.createGain();g.gain.value=v;g.connect(master);return g};
    musicBus=bus(0.38);musicDuck=C.createGain();musicDuck.connect(musicBus);sfxBus=bus(0.7);voiceBus=bus(1.15);
    const sr=C.sampleRate;noiseBuf=C.createBuffer(1,sr*2,sr);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=R()*2-1;
    setInterval(schedule,25);}
  function unlock(){try{if(!C)build();if(!C)return;try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
      if(C.state!=='running')C.resume().catch(()=>{});
      const s=C.createBufferSource();s.buffer=C.createBuffer(1,1,22050);s.connect(C.destination);s.start(0);
      // looping near-silent <audio> => 'playback' session so sound works with the iPhone ringer/silent switch on
      if(!silentEl){silentEl=document.createElement('audio');silentEl.setAttribute('playsinline','');silentEl.setAttribute('webkit-playsinline','');silentEl.setAttribute('x-webkit-airplay','deny');silentEl.preload='auto';silentEl.loop=true;silentEl.src=SILENT_MP3;silentEl.volume=0.01}
      if(silentEl.paused&&!document.hidden){const p=silentEl.play();p&&p.catch&&p.catch(()=>{})}
      if(!unlocked){unlocked=true;loadClips()}}catch(e){console.warn('unlock',e)}}
  ['touchstart','touchend','pointerdown','mousedown','click','keydown'].forEach(ev=>window.addEventListener(ev,unlock,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!C)return;if(document.hidden){C.suspend&&C.suspend().catch(()=>{});silentEl&&silentEl.pause()}
    else if(unlocked){C.resume().catch(()=>{});if(silentEl){const p=silentEl.play();p&&p.catch&&p.catch(()=>{})}}});
  function loadClips(){if(loading)return;loading=true;for(const k in CLIPS){try{const b=atob(CLIPS[k]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
    const p=C.decodeAudioData(u.buffer,x=>{clips[k]=x},()=>{});p&&p.catch&&p.catch(()=>{})}catch(e){}}}
  const safe=fn=>function(){try{if(!C||muted||C.state!=='running')return;stats.sfx++;return fn.apply(null,arguments)}catch(e){}};
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
  };
  // ---------- one voice at a time, with ducking ----------
  let cur=null,curEnd=0,curPrio=0,queued=null;
  function say(k,prio){prio=prio||1;if(!C||muted||C.state!=='running')return false;const b=clips[k];if(!b)return false;const t=now();
    if(t<curEnd){if(prio>curPrio&&prio>=3){queued={k,prio};return true}if(prio>=2&&(!queued||queued.prio<prio)){queued={k,prio};return true}stats.dropped++;return false}
    const s=C.createBufferSource();s.buffer=b;s.connect(voiceBus);s.start(t+0.02);curEnd=t+0.02+b.duration+0.25;curPrio=prio;stats.voice++;stats.last=k;
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
  function schedule(){if(!C||theme==='off')return;if(nextT<now())nextT=now()+0.05;
    while(nextT<now()+0.15){const t=nextT,i=step%96,bar=(i/6)|0,e=i%6,ch=PROG[bar],soft=theme==='sunset'||theme==='end'?0.6:1;
      if(e===0||e===3){CH[ch].forEach((m,j)=>uke(m,t+j*0.012,0.05*soft))}else if(e===2||e===5){CH[ch].slice(1).forEach((m,j)=>uke(m,t+j*0.008,0.025*soft))}
      if(e===0)bass(BASS[ch],t,0.2*soft);if(e===3)bass(BASS[ch]+7,t,0.14*soft);
      if(theme!=='sunset'){shaker(t,e%3===0?0.04:0.02);if(e===0)boom(t,0.22);if(e===3)wood(t,0.05)}else if(e===0)shaker(t,0.02);
      const m=MEL[i];const kz=theme==='play'&&((step/96|0)%2===1);
      if(m>0){if(kz){let d=1;while(i+d<96&&MEL[i+d]===-1&&d<3)d++;kazoo(m-12,t,eighth*d*0.9,0.07)}else glock(m,t,0.07*soft)}
      step++;nextT+=eighth}}
  function setMuted(m){muted=m;localStorage.setItem('wwp_muted',m?'1':'0');if(C)master.gain.setTargetAtTime(m?0:0.9,now(),0.03)}
  return{unlock,SFX,say,setTheme,setMuted,get muted(){return muted},get unlocked(){return unlocked&&!!C},get running(){return !!C&&C.state==='running'},get clipCount(){return Object.keys(clips).length},get theme(){return theme},stats,get speaking(){return C&&now()<curEnd}};
})();
