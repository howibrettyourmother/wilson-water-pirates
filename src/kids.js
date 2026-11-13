/* vendored from howibrettyourmother/kids-lib @35c0d0c — edit the lib, then re-vendor */
/* kids.js — shared helpers for the Wilson kids' iPad games (Alex 7, Zoe 4). v1.0.0
   Source of truth: https://github.com/howibrettyourmother/kids-lib  (vendor a copy into each game; no runtime cross-repo loads)
   Plain ES2017, no modules, Safari/iPad safe. Exposes window.KIDS.

   KIDS.kid({default})            'alex' | 'zoe' from ?kid=, else the last kid on this iPad, else default ('alex')
   KIDS.profile(kid)              {id,name,age,little,color,emoji}; little=true for Zoe (easy defaults)
   KIDS.store(game,{kid,migrate,to})
                                  per-kid saves: localStorage '<game>_<kid>_<key>'. migrate:[keys] copies the old per-device
                                  '<game>_<key>' saves to `to` (default 'alex') once (marker '<game>_mig_kid'); old keys are kept.
                                  → {kid,key(k),get(k,d),set(k,v),json(k,d),setJSON(k,v),del(k)}
   KIDS.sound(game)               one shared WebAudio context with the iPad audio guard:
                                  {ctx(),out(),unlock(),muted,setMuted(m),paused,setPaused(p),load(name,url),play(nameOrBuffer,{vol,rate}),
                                   tone(freq,dur,{type,vol,to}),onchange}
                                  mute is remembered per game ('<game>_muted'); pause and mute both silence the master bus.
   KIDS.guard()                   installs the audio guard (suspends WebAudio, pauses <audio>/<video>, cancels speech and blocks new
                                  sounds while the iPad is locked / the tab is hidden; resumes on return, incl. iOS 'interrupted').
                                  Idempotent and compatible with the hub-injected audio-guard v1 (window.__AG).
*/
(function(W){'use strict';
if(W.KIDS&&W.KIDS.version)return;
var D=W.document,LS=(function(){try{var t='__k';W.localStorage.setItem(t,'1');W.localStorage.removeItem(t);return W.localStorage}catch(e){return null}})();
function lget(k,d){if(!LS)return d;try{var v=LS.getItem(k);return v==null?d:v}catch(e){return d}}
function lset(k,v){if(!LS)return;try{LS.setItem(k,String(v))}catch(e){}}
var KIDS={version:'1.0.0'};
var PROFILES={alex:{id:'alex',name:'Alex',age:7,little:false,color:'#1e88e5',emoji:'🦖'},zoe:{id:'zoe',name:'Zoe',age:4,little:true,color:'#ff5ca8',emoji:'🦄'}};
KIDS.profiles=PROFILES;
KIDS.kid=function(o){o=o||{};var k=null;try{k=new URLSearchParams(W.location.search).get('kid')}catch(e){}
  if(PROFILES[k]){lset('kids_last_kid',k);return k}k=lget('kids_last_kid',null);return PROFILES[k]?k:(o['default']||'alex')};
KIDS.profile=function(k){return PROFILES[k||KIDS.kid()]||PROFILES.alex};
KIDS.store=function(game,o){o=o||{};var kid=o.kid||KIDS.kid(),to=o.to||'alex',pre=game+'_';
  if(o.migrate&&o.migrate.length&&!lget(pre+'mig_kid',null)){o.migrate.forEach(function(k){var v=lget(pre+k,null);if(v!=null&&lget(pre+to+'_'+k,null)==null)lset(pre+to+'_'+k,v)});lset(pre+'mig_kid','1')}
  var key=function(k){return pre+kid+'_'+k};
  return{kid:kid,key:key,get:function(k,d){return lget(key(k),d)},set:function(k,v){lset(key(k),v)},
    json:function(k,d){try{var v=lget(key(k),null);return v==null?d:JSON.parse(v)}catch(e){return d}},setJSON:function(k,v){lset(key(k),JSON.stringify(v))},
    del:function(k){if(LS)try{LS.removeItem(key(k))}catch(e){}}}};
// ---------- audio guard (same behaviour as kids-hubs audio-guard v1) ----------
KIDS.guard=function(){if(W.__AG)return W.__AG;var ctxs=[],els=[],hid=false,was=[],wasEl=[],pend=false,iv=W.setInterval;
  var AG=W.__AG={hidden:function(){return hid},ctxs:ctxs,els:els,blocked:0,lib:true};
  function reg(c){if(c&&ctxs.indexOf(c)<0){ctxs.push(c);if(c.state==='running')c.__agWant=true;try{c.addEventListener('statechange',function(){if(c.state==='running')c.__agWant=true;if(!hid&&c.__agWant&&(c.state==='interrupted'||c.state==='suspended'))pend=true})}catch(e){}}}
  AG.reg=reg;
  ['AudioContext','webkitAudioContext'].forEach(function(n){var B=W[n];if(!B)return;try{var P=B.prototype,r=P.resume;
    W[n]=function(a){var c=arguments.length?new B(a):new B();reg(c);return c};W[n].prototype=P;try{Object.setPrototypeOf(W[n],B)}catch(e){}
    P.resume=function(){reg(this);if(hid){this.__agWant=true;return Promise.resolve()}return r.apply(this,arguments)}}catch(e){}});
  [W.AudioScheduledSourceNode&&W.AudioScheduledSourceNode.prototype,W.AudioBufferSourceNode&&W.AudioBufferSourceNode.prototype,W.OscillatorNode&&W.OscillatorNode.prototype].forEach(function(p){if(!p||!p.hasOwnProperty('start'))return;var st=p.start;
    p.start=function(){reg(this.context);if(hid){AG.blocked++;return}return st.apply(this,arguments)}});
  var M=W.HTMLMediaElement&&W.HTMLMediaElement.prototype;if(M){var pl=M.play;M.play=function(){if(els.indexOf(this)<0)els.push(this);if(hid){AG.blocked++;return Promise.resolve()}return pl.apply(this,arguments)}}
  var ss=W.speechSynthesis;if(ss&&ss.speak){var sp=ss.speak.bind(ss);try{ss.speak=function(u){if(hid){AG.blocked++;return}return sp(u)}}catch(e){}}
  function allEls(){D.querySelectorAll('audio,video').forEach(function(e){if(els.indexOf(e)<0)els.push(e)});return els}
  function hide(){if(hid)return;hid=true;was=[];wasEl=[];
    ctxs.forEach(function(c){try{if(c.state==='running'||c.state==='interrupted'||c.__agWant){was.push(c);c.__agWant=true}if(c.state!=='closed')c.suspend()}catch(e){}});
    allEls().forEach(function(e){try{if(!e.paused){wasEl.push(e);e.pause()}}catch(e2){}});try{ss&&ss.cancel()}catch(e){}}
  function show(){if(!hid||D.visibilityState==='hidden')return;hid=false;
    was.forEach(function(c){try{c.__agWant=true;if(c.state!=='closed')c.resume().catch(function(){pend=true})}catch(e){pend=true}});
    wasEl.forEach(function(e){try{if(e.paused){var p=e.play();p&&p.catch&&p.catch(function(){pend=true})}}catch(e2){}});
    setTimeout(function(){was.forEach(function(c){if(c.state!=='running'&&c.state!=='closed')pend=true})},300)}
  function kick(){if(!pend||hid)return;pend=false;ctxs.forEach(function(c){try{if(c.__agWant&&c.state!=='running'&&c.state!=='closed')c.resume()}catch(e){}});
    wasEl.forEach(function(e){try{if(e.paused)e.play().catch(function(){})}catch(x){}});wasEl=[]}
  ['touchstart','touchend','pointerdown','mousedown','keydown'].forEach(function(t){W.addEventListener(t,kick,{capture:true,passive:true})});
  D.addEventListener('visibilitychange',function(){D.visibilityState==='hidden'?hide():show()});
  W.addEventListener('pagehide',hide);D.addEventListener('freeze',hide);W.addEventListener('blur',function(){if(D.visibilityState==='hidden')hide()});
  W.addEventListener('pageshow',show);W.addEventListener('focus',show);D.addEventListener('resume',show);
  iv.call(W,function(){if(!hid)ctxs.forEach(function(c){if(c.__agWant&&c.state==='interrupted')pend=true})},2000);
  AG.hide=hide;AG.show=show;return AG};
// ---------- sound ----------
var SND={};
KIDS.sound=function(game){game=game||'kids';if(SND[game])return SND[game];KIDS.guard();
  var C=null,master=null,bufs={},loading={},muted=lget(game+'_muted','0')==='1',paused=false;
  function vol(){return (muted||paused)?0:1}
  function ctx(){if(C)return C;var A=W.AudioContext||W.webkitAudioContext;if(!A)return null;try{C=new A()}catch(e){return null}
    master=C.createGain();master.gain.value=vol();master.connect(C.destination);if(W.__AG&&W.__AG.reg)W.__AG.reg(C);
    try{C.addEventListener('statechange',function(){if(C.state==='interrupted'&&!D.hidden)setTimeout(unlock,300)})}catch(e){}return C}
  function unlock(){var c=ctx();if(!c)return;if(c.state!=='running'&&c.state!=='closed'&&!(W.__AG&&W.__AG.hidden())){try{var p=c.resume();p&&p.catch&&p.catch(function(){})}catch(e){}}
    try{var s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)}catch(e){}}
  ['touchstart','touchend','pointerdown','click','keydown'].forEach(function(t){W.addEventListener(t,unlock,{capture:true,passive:true})});
  function apply(){if(master&&C)master.gain.setTargetAtTime(vol(),C.currentTime,0.03);if(S.onchange)try{S.onchange(S)}catch(e){}}
  function live(){return C&&C.state==='running'&&!muted&&!paused}
  var S={ctx:ctx,out:function(){ctx();return master},unlock:unlock,
    get muted(){return muted},setMuted:function(m){muted=!!m;lset(game+'_muted',muted?'1':'0');apply()},toggleMute:function(){S.setMuted(!muted);return muted},
    get paused(){return paused},setPaused:function(p){paused=!!p;apply()},
    load:function(name,url){if(bufs[name])return Promise.resolve(bufs[name]);if(loading[name])return loading[name];var c=ctx();if(!c)return Promise.resolve(null);
      loading[name]=fetch(url).then(function(r){return r.arrayBuffer()}).then(function(a){return new Promise(function(res){c.decodeAudioData(a,res,function(){res(null)})})}).then(function(b){bufs[name]=b;delete loading[name];return b}).catch(function(){delete loading[name];return null});return loading[name]},
    play:function(nb,o){o=o||{};if(!live())return null;var b=typeof nb==='string'?bufs[nb]:nb;if(!b)return null;var s=C.createBufferSource(),g=C.createGain();g.gain.value=o.vol==null?1:o.vol;s.buffer=b;if(o.rate)s.playbackRate.value=o.rate;s.connect(g);g.connect(master);s.start(C.currentTime+(o.at||0));return s},
    tone:function(f,d,o){o=o||{};if(!live())return;var t=C.currentTime+(o.at||0),os=C.createOscillator(),g=C.createGain();os.type=o.type||'triangle';os.frequency.setValueAtTime(f,t);if(o.to)os.frequency.exponentialRampToValueAtTime(Math.max(20,o.to),t+d);
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||0.15,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);os.connect(g);g.connect(master);os.start(t);os.stop(t+d+0.05)},
    onchange:null};
  SND[game]=S;return S};
W.KIDS=KIDS;
})(window);
