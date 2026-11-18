/* Engine manager: Stockfish (strongest available build, loaded in a worker) with the built-in Gochess engine as fallback. */
var GCEngines=(function(E){
'use strict';
var CFG=window.GC_CFG||{};
var CDN10='https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
/* Candidate builds, strongest first. direct = same-origin file started as a worker (WASM); mt = needs SharedArrayBuffer (cross-origin isolation). */
var BUILDS=CFG.sfBuilds||[{url:CFG.sfUrl||CDN10,name:'Stockfish 10'}];
var state={sf:'idle',name:'Gochess built-in',build:null};
var subs=[];
function emit(){subs.forEach(function(f){try{f(state);}catch(e){}});}
function setSf(s){state.sf=s;state.name=s==='ready'&&state.build?state.build.name+(state.build.mt?' (multi-thread)':''):'Gochess built-in';emit();}

/* ---- built-in engine worker ---- */
var bw=null,bpend=new Map(),bid=0;
function mainRun(msg){
  return new Promise(function(res){setTimeout(function(){
    var r;try{r=msg.kind==='bot'?E.botUci(msg.fen,msg.level):E.analyze(msg.fen,msg.ms,msg.multipv);}catch(x){r={err:String(x)};}
    res(r);},0);});
}
function startBuiltin(){
  try{
    var w;
    if(CFG.workerUrl){w=new Worker(CFG.workerUrl);}
    else{
      var a=document.getElementById('engine-src'),h=document.getElementById('worker-handler');
      if(!a||!h)throw new Error('no source');
      w=new Worker(URL.createObjectURL(new Blob([a.textContent+'\n'+h.textContent],{type:'text/javascript'})));
    }
    w.onmessage=function(e){var r=e.data,p=bpend.get(r.id);if(p){bpend.delete(r.id);p.res(r);}};
    w.onerror=function(){
      bw=null;try{w.terminate();}catch(_){}
      var items=Array.from(bpend.values());bpend.clear();
      items.forEach(function(p){mainRun(p.msg).then(p.res);});
    };
    bw=w;
  }catch(e){bw=null;}
}
function builtin(msg){
  if(!bw)return mainRun(msg);
  return new Promise(function(res){var id=++bid;bpend.set(id,{res:res,msg:msg});bw.postMessage(Object.assign({},msg,{id:id}));});
}

/* ---- Stockfish (UCI over a worker) ---- */
var sw=null,sq=[],cur=null;
function fail(){
  if(state.sf==='failed')return;
  try{if(sw)sw.terminate();}catch(e){}
  sw=null;setSf('failed');
  var c=cur;cur=null;
  if(c){clearTimeout(c.timer);c.rej(new Error('engine failed'));}
  var q=sq;sq=[];q.forEach(function(j){j.rej(new Error('engine failed'));});
}
function canUse(b){
  if(b.mt&&!(self.crossOriginIsolated&&typeof SharedArrayBuffer==='function'))return Promise.resolve(false);
  if(!b.direct)return Promise.resolve(true);
  var w=b.url.replace(/\.js$/,'.wasm');
  function ok(u){return fetch(u,{method:'HEAD'}).then(function(r){return r.ok;}).catch(function(){return false;});}
  return Promise.all([ok(b.url),ok(w)]).then(function(r){return r[0]&&r[1];});
}
var bi=-1;
function startSF(){
  if(state.sf!=='idle')return;
  setSf('loading');nextBuild();
}
function nextBuild(){
  bi++;
  if(bi>=BUILDS.length){setSf('failed');return;}
  var b=BUILDS[bi];
  canUse(b).then(function(ok){if(ok)bootBuild(b);else nextBuild();});
}
function bootBuild(b){
  var stage='uci',boot=null,w=null,dead=false;
  function bad(){
    if(dead)return;dead=true;clearTimeout(boot);
    try{if(w)w.terminate();}catch(e){}
    if(sw===w)sw=null;
    nextBuild();
  }
  try{
    if(b.direct)w=new Worker(b.url);
    else w=new Worker(URL.createObjectURL(new Blob(["importScripts('"+b.url+"');"],{type:'text/javascript'})));
  }catch(e){bad();return;}
  sw=w;
  boot=setTimeout(bad,b.direct?90000:25000);
  w.onerror=function(){if(stage==='run')fail();else bad();};
  w.onmessage=function(e){
    var line=typeof e.data==='string'?e.data:'';
    if(stage==='uci'){
      if(line==='uciok'){
        stage='ready';
        var hc=(navigator.hardwareConcurrency||2);
        w.postMessage('setoption name Hash value '+(b.direct?64:16));
        if(b.mt)w.postMessage('setoption name Threads value '+Math.max(1,Math.min(4,hc-1)));
        w.postMessage('isready');
      }
    }else if(stage==='ready'){
      if(line==='readyok'){stage='run';clearTimeout(boot);state.build=b;setSf('ready');pump();}
    }else onLine(line);
  };
  w.postMessage('uci');
}
function sfRun(msg){return new Promise(function(res,rej){sq.push({msg:msg,res:res,rej:rej});pump();});}
function pump(){
  if(cur||state.sf!=='ready'||!sq.length)return;
  cur=sq.shift();var m=cur.msg;cur.info={};
  cur.timer=setTimeout(fail,(m.ms||1000)+8000);
  sw.postMessage('setoption name Skill Level value '+(m.skill==null?20:m.skill));
  sw.postMessage('setoption name MultiPV value '+(m.multipv||1));
  sw.postMessage('position fen '+m.fen);
  sw.postMessage('go movetime '+Math.round(m.ms||1000));
}
function onLine(line){
  if(!cur)return;
  if(line.indexOf('info ')===0&&line.indexOf(' pv ')>0&&line.indexOf('bound')<0){
    var d=/ depth (\d+)/.exec(line),mp=/ multipv (\d+)/.exec(line),sc=/ score (cp|mate) (-?\d+)/.exec(line),pv=/ pv (\S+)/.exec(line);
    if(sc&&pv){
      var v=+sc[2],score=sc[1]==='cp'?v:(v>0?E.MATE-(2*v-1):-E.MATE-2*v);
      cur.info[mp?+mp[1]:1]={uci:pv[1],score:score,depth:d?+d[1]:0};
    }
  }else if(line.indexOf('bestmove')===0){
    var c=cur;cur=null;clearTimeout(c.timer);
    var bm=line.split(' ')[1];
    var lines=Object.keys(c.info).map(Number).sort(function(a,b){return a-b;}).map(function(k){return c.info[k];});
    c.res({uci:(bm&&bm!=='(none)')?bm:(lines[0]?lines[0].uci:null),score:lines[0]?lines[0].score:0,depth:lines[0]?lines[0].depth:0,lines:lines,engine:state.name});
    pump();
  }
}

/* ---- public API ---- */
function init(){
  startBuiltin();
  if(CFG.stockfish!==false)setTimeout(startSF,900);
  else setSf('failed');
}
function analyze(fen,ms,mpv){
  var pos=new E.Pos().setFen(fen);
  if(!pos.legal(false).length)return Promise.resolve({uci:null,score:pos.inCheck()?-E.MATE:0,lines:[],depth:0,engine:state.name});
  if(state.sf==='ready'){
    return sfRun({fen:fen,ms:ms*2.4,multipv:mpv||1,skill:20}).then(function(r){
      if(!r.uci)throw new Error('empty');return r;
    }).catch(function(){return builtin({kind:'analyze',fen:fen,ms:ms,multipv:mpv||1});});
  }
  return builtin({kind:'analyze',fen:fen,ms:ms,multipv:mpv||1});
}
function bot(fen,level){
  var L=E.LEVELS[level];
  if(level>=4&&state.sf==='ready'){
    return sfRun({fen:fen,ms:L.sfMs,multipv:1,skill:L.skill}).then(function(r){
      if(!r.uci)throw new Error('empty');return {uci:r.uci};
    }).catch(function(){return builtin({kind:'bot',fen:fen,level:level});});
  }
  return builtin({kind:'bot',fen:fen,level:level});
}
function effElo(level){
  var L=E.LEVELS[level];
  return (level>=4&&state.sf!=='ready')?Math.min(L.elo,2000):L.elo;
}
function onStatus(fn){subs.push(fn);fn(state);}
return {init:init,analyze:analyze,bot:bot,effElo:effElo,onStatus:onStatus,state:state};
})(GCE);
