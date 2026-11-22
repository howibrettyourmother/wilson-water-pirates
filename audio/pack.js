/* kids-audio pack player v20261120el2
   Pre-generated ElevenLabs voice + shared SFX.
   KVX.init({base:'audio/', getCtx, musicGain, kid:'alex'|'zoe'})
   KVX.say(key) / KVX.sayAny(keys) / KVX.count(n) / KVX.sfx(name)
   One voice at a time; music ducks to 0.3; SFX polyphony capped; iOS unlock on first tap.
*/
(function(g){
  const KVX={};
  let C=null, out=null, voiceBus=null, sfxBus=null, musicG=null, cfg={}, buf={}, cur=null, last={}, lastAny=null, armed=true;
  const now=()=> (C&&C.currentTime)||0;
  const SFX_ALIAS={click:'ui_click',tap:'ui_tap',chime:'correct',success:'correct',yes:'correct',
    nope:'wrong',miss:'wrong',pickup:'collect',coin:'collect',fanfare:'win',cheer:'win',
    level:'levelup',bump:'thud',tick:'count_tick'};
  function ctx(){
    if(C) return C;
    if(cfg.getCtx){const c=cfg.getCtx(); if(c){C=c; hook(); return C;}}
    const AC=g.AudioContext||g.webkitAudioContext; if(!AC) return null;
    C=new AC(); hook(); return C;
  }
  function hook(){
    if(!C||C._kvx) return; C._kvx=1;
    const dest=C.destination;
    voiceBus=C.createGain(); voiceBus.gain.value=1;
    sfxBus=C.createGain(); sfxBus.gain.value=0.75;
    const master=C.createGain(); master.gain.value=0.95;
    voiceBus.connect(master); sfxBus.connect(master); master.connect(dest);
    if(cfg.musicGain){ musicG=typeof cfg.musicGain==='function'?null:cfg.musicGain; }
    C.addEventListener&&C.addEventListener('statechange',()=>{ if(C.state!=='running'&&!document.hidden) wake(); });
  }
  function getMusic(){
    if(musicG) return musicG;
    if(cfg.musicGain){const m=typeof cfg.musicGain==='function'?cfg.musicGain():cfg.musicGain; if(m) musicG=m; return m||null;}
    return null;
  }
  function wake(){ if(!C) return; if(C.state==='running') return; const p=C.resume&&C.resume(); p&&p.catch&&p.catch(()=>{armed=true}); armed=true; }
  function unlock(){
    const c=ctx(); if(!c) return;
    if(c.state!=='running') c.resume&&c.resume().catch(()=>{});
    try{const s=c.createBufferSource(); s.buffer=c.createBuffer(1,1,22050); s.connect(c.destination); s.start(0);}catch(e){}
    if(armed){ armed=false; preload(cfg.preload||['sfx/ui_click','sfx/correct','sfx/win']); }
  }
  ['touchstart','touchend','pointerdown','mousedown','click','keydown'].forEach(e=>g.addEventListener(e,unlock,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{ if(!C) return; if(document.hidden){C.suspend&&C.suspend().catch(()=>{});} else if(!armed){C.resume&&C.resume().catch(()=>{armed=true});} });

  function urlFor(rel){
    const b=cfg.base||'audio/';
    return b.replace(/\/?$/,'/')+rel.replace(/^\//,'')+'.mp3'+(cfg.v?('?v='+cfg.v):'');
  }
  function load(rel){
    if(buf[rel]&&buf[rel]!=='loading') return Promise.resolve(buf[rel]);
    if(buf[rel]==='loading') return buf['_p_'+rel]||Promise.resolve(null);
    buf[rel]='loading';
    const c=ctx(); if(!c) return Promise.resolve(null);
    const p=fetch(urlFor(rel)).then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(ab=>c.decodeAudioData(ab.slice(0)))
      .then(b=>{buf[rel]=b; return b;}).catch(()=>{buf[rel]=null; return null;});
    buf['_p_'+rel]=p; return p;
  }
  function preload(rels){ rels.forEach(load); }
  function ensureSpkWrap(){
    if(g.__kvxWrap) return; g.__kvxWrap=1;
    const prev=g.__vSpk;
    g.__vSpk=function(){ return !!(g.__kvxSpk || (typeof prev==='function' && prev())); };
  }
  function duck(on){
    g.__kvxSpk=!!on; ensureSpkWrap();
    const m=getMusic(); if(!m||!m.gain||!C) return;
    const t=C.currentTime, g=m.gain;
    try{ g.cancelScheduledValues(t); g.setTargetAtTime(on?0.3:1, t, on?0.04:0.2); }catch(e){}
  }
  function playBuf(b, bus, stopPrev){
    if(!b||!C||!bus) return null;
    if(stopPrev&&cur){ try{cur.stop();}catch(e){} cur=null; duck(false); }
    const s=C.createBufferSource(); s.buffer=b; s.connect(bus); s.start(0);
    return s;
  }

  // SFX polyphony: max 4, retrigger same key
  const sx={playing:{}, n:0};
  KVX.sfx=function(name, opts){
    opts=opts||{};
    const key=SFX_ALIAS[name]||name;
    const rel='sfx/'+key;
    const t=performance.now();
    if(last['s_'+key]&&t-last['s_'+key]<80) return; // debounce spam
    last['s_'+key]=t;
    if(sx.n>=4){
      const k=Object.keys(sx.playing)[0];
      if(k&&sx.playing[k]){ try{sx.playing[k].stop();}catch(e){} delete sx.playing[k]; sx.n--; }
    }
    if(sx.playing[key]){ try{sx.playing[key].stop();}catch(e){} delete sx.playing[key]; sx.n--; }
    load(rel).then(b=>{
      if(!b) return;
      const s=playBuf(b, sfxBus, false); if(!s) return;
      sx.playing[key]=s; sx.n++;
      s.onended=()=>{ if(sx.playing[key]===s){ delete sx.playing[key]; sx.n--; } };
    });
  };

  function voiceRel(key, voice){
    if(key.indexOf('/')>=0) return (key.indexOf('voice/')===0?key:'voice/'+key);
    const kid=voice||cfg.kid||'alex';
    return 'voice/'+kid+'/'+key;
  }
  KVX.say=function(key, opts){
    opts=opts||{};
    const t=performance.now();
    const deb=opts.voice? (opts.voice+'/'+key):key;
    if(!opts.force && last[deb] && t-last[deb]<1500) return;
    last[deb]=t;
    const rel=voiceRel(key, opts.voice);
    load(rel).then(b=>{
      if(!b && !opts.voice){ load('voice/'+key).then(b2=>startVoice(key,b2,opts)); return; }
      startVoice(key,b,opts);
    });
  };
  function startVoice(key,b,opts){
    if(!b||!C) return;
    if(cur){ try{cur.stop();}catch(e){} }
    duck(true);
    const s=playBuf(b, voiceBus, false); if(!s) {duck(false); return;}
    cur=s;
    const prio=opts.prio||1;
    s.onended=()=>{ if(cur===s){ cur=null; duck(false); } };
    // safety unduck
    setTimeout(()=>{ if(cur===s){ cur=null; duck(false);} }, Math.min(8000, (b.duration+0.35)*1000));
  }
  KVX.sayAny=function(keys, opts){
    opts=opts||{};
    let pool=(keys||[]).slice();
    if(opts.avoidLast!==false && lastAny && pool.length>1) pool=pool.filter(k=>k!==lastAny);
    if(!pool.length) pool=keys||[];
    const k=pool[Math.floor(Math.random()*pool.length)];
    lastAny=k; KVX.say(k, opts);
    return k;
  };
  KVX.praise=function(kind){
    const kid=cfg.kid||'alex';
    const z=['pz_yay','pz_didit','pz_great','pz_super','pz_wow','pz_hooray','pz_star','pz_magic'];
    const a=['pa_yes','pa_yay','pa_great','pa_awesome','pa_wow','pa_hero','pa_boom','pa_legend'];
    const zt=['pz_oops','pz_ok','pz_almost','pz_keep'];
    const at=['pa_oops','pa_ok','pa_almost','pa_keep'];
    if(kind==='try') return KVX.sayAny(kid==='zoe'?zt:at);
    return KVX.sayAny(kid==='zoe'?z:a);
  };
  KVX.count=function(n){ KVX.say('n'+n,{force:true,prio:2}); };
  KVX.stop=function(){ if(cur){ try{cur.stop();}catch(e){} cur=null; duck(false);} };
  KVX.load=load; KVX.preload=preload; KVX.unlock=unlock; KVX.wake=wake;
  KVX.init=function(opts){
    cfg=opts||{};
    if(cfg.kid!=='zoe' && cfg.kid!=='alex'){
      try{ const q=new URLSearchParams(location.search); cfg.kid=q.get('kid')||q.get('mode')||cfg.kid||'alex'; }catch(e){}
    }
    if(cfg.kid!=='zoe') cfg.kid='alex';
    hook(); ensureSpkWrap();
  };
  g.KVX=KVX;
})(window);
