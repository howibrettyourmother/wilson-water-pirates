/* bgm.js - original looping background music. ES2018, Safari-safe.
   BGM.init({id, base, tracks:{name:[L,pad]}, map:{area:name|''}, poll:fn->{area,speaking,muted}, pos:'css', sync:[names], vol}) */
(function(){
'use strict';
var W=window,D=document;
var BGM={on:true,ready:false};W.BGM=BGM;W.BGM_ON=true;
var cfg,ctx=null,master,duck,cur=null,curName='',cache={},order=[],loading={},want='',unlocked=false,btn,hidden=false,muted=false,spk=false,lastArea=null;
var LS='bgm_';
function now(){return ctx?ctx.currentTime:0}
function lsGet(){try{return localStorage.getItem(LS+cfg.id)}catch(e){return null}}
function lsSet(v){try{localStorage.setItem(LS+cfg.id,v)}catch(e){}}
function mkCtx(){
  if(ctx)return;
  var AC=W.AudioContext||W.webkitAudioContext;if(!AC)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  ctx=new AC();master=ctx.createGain();duck=ctx.createGain();
  master.gain.value=0;duck.gain.value=1;duck.connect(master);master.connect(ctx.destination);
}
function unlock(){
  mkCtx();if(!ctx)return;
  unlocked=true;
  if(ctx.state!=='running'&&!hidden){try{var p=ctx.resume();if(p&&p.catch)p.catch(function(){})}catch(e){}}
  // iOS: play a silent buffer inside the gesture
  try{var b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}catch(e){}
  apply();
}
function load(name,cb){
  if(cache[name]){touch(name);cb(cache[name]);return}
  if(loading[name]){loading[name].push(cb);return}
  loading[name]=[cb];
  var x=new XMLHttpRequest();x.open('GET',cfg.base+name+'.m4a'+(cfg.v?'?v='+cfg.v:''),true);x.responseType='arraybuffer';
  x.onload=function(){
    if(x.status&&x.status!==200&&x.status!==0){fail();return}
    try{ctx.decodeAudioData(x.response,function(buf){prep(name,buf);cache[name]=buf;touch(name);var q=loading[name];delete loading[name];q.forEach(function(f){f(buf)})},fail)}catch(e){fail()}
  };
  x.onerror=fail;x.send();
  function fail(){delete loading[name]}
}
function touch(name){var i=order.indexOf(name);if(i>=0)order.splice(i,1);order.push(name);
  while(order.length>3){var k=order.shift();if(k!==curName&&k!==want)delete cache[k];else{order.push(k);if(order.length<=3)break;}}}
function prep(name,buf){
  // micro-crossfade the loop end into the audio just before loopStart so the wrap is sample-continuous after AAC decode
  var t=cfg.tracks[name];if(!t)return;var sr=buf.sampleRate,s=Math.round(t[1]*sr),e=Math.round((t[1]+t[0])*sr),K=Math.round(0.02*sr);
  if(e>buf.length||s<K)return;
  for(var c=0;c<buf.numberOfChannels;c++){var d=buf.getChannelData(c);
    for(var i=0;i<K;i++){var w=i/K;d[e-K+i]=d[e-K+i]*(1-w)+d[s-K+i]*w}}
}
function stopVoice(v,fade){
  if(!v)return;var t=now();
  try{v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+fade);v.src.stop(t+fade+0.05)}catch(e){try{v.src.stop()}catch(e2){}}
}
function startTrack(name){
  want=name;
  if(name===curName&&cur)return;
  if(!name){stopVoice(cur,1.2);cur=null;curName='';return}
  if(!ctx)return;
  load(name,function(buf){
    if(want!==name||(curName===name&&cur))return;
    var t=cfg.tracks[name],src=ctx.createBufferSource(),g=ctx.createGain();
    src.buffer=buf;src.loop=true;src.loopStart=t[1];src.loopEnd=t[1]+t[0];
    var off=t[1];
    // phase-synced crossfade inside a sync group (same tempo/length), e.g. boss phases
    if(cur&&cfg.sync&&cfg.sync.indexOf(name)>=0&&cfg.sync.indexOf(curName)>=0&&cur.L===t[0]){
      var el=(now()-cur.t0)%t[0];off=t[1]+el;
    }
    src.connect(g);g.connect(duck);
    var tn=now(),fade=cur?1.2:0.6;
    g.gain.setValueAtTime(0,tn);g.gain.linearRampToValueAtTime(1,tn+fade);
    src.start(tn,off);
    stopVoice(cur,1.2);
    cur={src:src,g:g,t0:tn-(off-t[1]),L:t[0]};curName=name;
  });
}
function apply(){
  if(!ctx)return;
  var audible=BGM.on&&!muted&&!hidden&&unlocked;
  var t=now(),tg=audible?(cfg.vol||1):0;
  master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(tg,t+0.4);
  if(hidden||!BGM.on||muted){
    // free CPU when not audible
    clearTimeout(apply.sus);apply.sus=setTimeout(function(){if(ctx&&ctx.state==='running'&&(hidden||!BGM.on||muted))try{ctx.suspend()}catch(e){}},500);
  }else if(ctx.state!=='running'){try{var p=ctx.resume();if(p&&p.catch)p.catch(function(){})}catch(e){}}
  W.BGM_ON=BGM.on;
}
function tick(){
  var st;try{st=cfg.poll()||{}}catch(e){st={}}
  var area=st.area==null?'':String(st.area);
  var m=!!st.muted;if(m!==muted){muted=m;apply()}
  var s=!!st.speaking;
  if(s!==spk&&ctx){spk=s;var t=now();duck.gain.cancelScheduledValues(t);duck.gain.setValueAtTime(duck.gain.value,t);duck.gain.linearRampToValueAtTime(s?0.5:1,t+(s?0.15:0.6))}
  BGM.area=area;
  var name=cfg.map.hasOwnProperty(area)?cfg.map[area]:(cfg.tracks[area]?area:(cfg.dflt==null?'':cfg.dflt));
  if(st.oneshot&&cfg.oneshot)playOne(st.oneshot);
  if(!BGM.on||muted||!unlocked){want=name;if(cur&&!BGM.on){stopVoice(cur,0.5);cur=null;curName=''}return}
  if(name!==curName||!cur)startTrack(name);
}
var lastOne='';
function playOne(id){
  if(id===lastOne)return;lastOne=id;
  var name=cfg.oneshot;if(!ctx||!BGM.on||muted||!unlocked)return;
  load(name,function(buf){var s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;g.gain.value=1;s.connect(g);g.connect(duck);s.start(now())});
}
BGM.oneshot=function(id){playOne(id)};
function setOn(v){BGM.on=v;lsSet(v?'1':'0');paint();if(v){unlock();tick()}apply()}
function paint(){if(!btn)return;btn.setAttribute('aria-pressed',BGM.on?'true':'false');btn.title=BGM.on?'Music on':'Music off';btn.className='bgm-btn'+(BGM.on?'':' off')}
function mkBtn(){
  var st=D.createElement('style');
  st.textContent='.bgm-btn{position:fixed;'+(cfg.pos||'right:10px;bottom:10px')+';z-index:'+(cfg.z||9990)+';width:34px;height:34px;padding:0;margin:0;border:2px solid rgba(255,255,255,.75);border-radius:50%;background:rgba(20,20,40,.45);color:#fff;font:18px/30px sans-serif;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;touch-action:manipulation;opacity:.8}'+
  '.bgm-btn.off{opacity:.5}.bgm-btn.off:after{content:"";position:absolute;left:5px;top:15px;width:20px;height:2px;background:#fff;-webkit-transform:rotate(-45deg);transform:rotate(-45deg)}'+(cfg.css||'');
  D.head.appendChild(st);
  btn=D.createElement('button');btn.type='button';btn.setAttribute('aria-label','Music on/off');btn.textContent='\u266B';
  btn.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();setOn(!BGM.on)});
  ['pointerdown','touchstart','mousedown','touchend'].forEach(function(ev){btn.addEventListener(ev,function(e){e.stopPropagation()},false)});
  D.body.appendChild(btn);paint();
  if(cfg.showIf){setInterval(function(){var v=true;try{v=cfg.showIf()}catch(e){}btn.style.display=v?'':'none'},300)}
}
function vis(){hidden=D.hidden||D.visibilityState==='hidden';apply();if(!hidden&&unlocked)unlock()}
BGM.init=function(c){
  cfg=c;cfg.base=cfg.base||'music/';
  var v=lsGet();BGM.on=v!=='0';W.BGM_ON=BGM.on;
  ['pointerdown','touchend','click','keydown'].forEach(function(ev){W.addEventListener(ev,unlock,true)});
  D.addEventListener('visibilitychange',vis);W.addEventListener('pagehide',function(){hidden=true;apply()});W.addEventListener('pageshow',vis);
  W.addEventListener('blur',function(){if(cfg.pauseOnBlur){hidden=true;apply()}});
  if(D.body)mkBtn();else D.addEventListener('DOMContentLoaded',mkBtn);
  setInterval(tick,cfg.every||60);BGM.ready=true;
};
BGM.state=function(){return{on:BGM.on,cur:curName,want:want,ctx:ctx?ctx.state:'none',duck:duck?duck.gain.value:1,master:master?master.gain.value:0,unlocked:unlocked,muted:muted,hidden:hidden,cached:Object.keys(cache),loop:cur?[cur.src.loop,cur.src.loopStart,cur.src.loopEnd,cur.L]:null,pos:cur?(now()-cur.t0)%cur.L:0,t:now()}};
})();
if(window.BGM_CFG&&window.BGM&&!window.BGM.ready){try{window.BGM.init(window.BGM_CFG)}catch(e){}}
