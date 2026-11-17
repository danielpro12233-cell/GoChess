/* Gochess client. Created by Daniel M Reyes. */
(function(){
'use strict';
var E=GCE,A=GCA,C=GCCoach,EN=GCEngines,CFG=window.GC_CFG||{mode:'artifact'};
var NS='http://www.w3.org/2000/svg';
var $=function(s){return document.querySelector(s);};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
var FILES='abcdefgh';
var GLY={1:'♟',2:'♞',3:'♝',4:'♜',5:'♛',6:'♚'};
var TCS=[{l:'No clock',b:0,i:0},{l:'1 min',b:60,i:0},{l:'3 min',b:180,i:0},{l:'5 min',b:300,i:0},{l:'10 min',b:600,i:0},{l:'15 | 10',b:900,i:10}];
var CLS_CSS={brilliant:'cb',great:'cg',best:'cbe',excellent:'cex',good:'cgo',inaccuracy:'cin',mistake:'cmi',miss:'cms',blunder:'cbl'};
var CLS_COL={brilliant:'var(--c-brilliant)',great:'var(--c-great)',best:'var(--c-best)',excellent:'var(--c-excellent)',good:'var(--c-good)',inaccuracy:'var(--c-inaccuracy)',mistake:'var(--c-mistake)',miss:'var(--c-miss)',blunder:'var(--c-blunder)'};
var PHRASE={brilliant:'brilliant',great:'a great move',best:'the best move',excellent:'excellent',good:'good',inaccuracy:'an inaccuracy',mistake:'a mistake',miss:'a miss',blunder:'a blunder'};
var BAD={inaccuracy:1,mistake:1,miss:1,blunder:1};
var BOARDS=[{id:'green',n:'Green',x:'#e6ecd9',y:'#6f9a6d'},{id:'ocean',n:'Ocean',x:'#dce6ef',y:'#6b8cae'},{id:'walnut',n:'Walnut',x:'#f0d9b5',y:'#b58863'},{id:'slate',n:'Slate',x:'#d9d9d4',y:'#6e7a86'}];

/* ---------- profile (no account needed) and settings ---------- */
var ME=store.get('gc_me',null);
if(!ME||!ME.id){ME={id:'p'+Math.random().toString(36).slice(2,12),name:'Guest'+Math.floor(1000+Math.random()*9000),elo:1000,games:0,w:0,l:0,d:0,rated:{}};store.set('gc_me',ME);}
function saveMe(){store.set('gc_me',ME);}
function cleanName(s){return String(s||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18);}
var SET=Object.assign({board:'green',sound:true},store.get('gc_set',{}));
function applySettings(){document.documentElement.setAttribute('data-board',SET.board);store.set('gc_set',SET);}
applySettings();

/* ---------- sound (synthesized, no files) ---------- */
var AC=null;
function tone(f1,f2,dur,vol,type,delay){
  try{
    var t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
    o.type=type||'triangle';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+0.02);
  }catch(e){}
}
function snd(kind){
  if(!SET.sound)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    if(kind==='move')tone(340,140,.07,.2);
    else if(kind==='capture'){tone(260,90,.11,.3);tone(520,200,.05,.12);}
    else if(kind==='check'){tone(660,660,.09,.18,'sine');tone(880,880,.12,.18,'sine',.09);}
    else if(kind==='end'){tone(523,523,.18,.2,'sine');tone(659,659,.18,.2,'sine',.16);tone(784,784,.3,.2,'sine',.32);}
  }catch(e){}
}

/* ---------- db (online play) ---------- */
var DB=null,lbRows=[],lobbyRows=[];
async function initDb(){
  try{
    if(CFG.mode==='server'&&window.GCNet)DB=await GCNet.connect();
    else if(window.claude&&window.claude.use)DB=await window.claude.use('db');
  }catch(e){DB=null;}
  $('#online-off').hidden=!!DB;$('#online-on').hidden=!DB;
  if(DB){pushProfile();watchLobby();watchLeaders();}
  else renderLeaders([]);
  renderLobby();
}
function pushProfile(){
  if(!DB)return;
  try{DB.doc('players/'+ME.id).set({name:ME.name,elo:ME.elo,games:ME.games,w:ME.w,l:ME.l,d:ME.d,t:Date.now()}).catch(function(){});}catch(e){}
}
function watchLeaders(){
  try{DB.collection('players').orderBy('elo','desc').limit(25).onSnapshot(function(s){lbRows=s.docs.map(function(d){var x=d.data();x.id=d.id;return x;}).filter(function(x){return x&&x.name&&typeof x.elo==='number';});renderLeaders(lbRows);},function(){renderLeaders([]);});}catch(e){}
}
function watchLobby(){
  try{DB.collection('games').where('status','==','waiting').limit(30).onSnapshot(function(s){lobbyRows=s.docs.map(function(d){return d.data();});renderLobby();},function(){});}catch(e){}
}

/* ---------- toast & modal ---------- */
var toastT=null;
function toast(t){var n=$('#toast');n.textContent=t;n.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){n.hidden=true;},3200);}
function modal(node,dismiss){
  var m=$('#modal');m.innerHTML='';var card=el('div','card');card.appendChild(node);m.appendChild(card);m.hidden=false;m._dismiss=dismiss!==false;
}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML='';}
$('#modal').addEventListener('pointerdown',function(e){if(e.target===this&&this._dismiss)closeModal();});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&!$('#modal').hidden&&$('#modal')._dismiss)closeModal();
  if(view==='review'&&RV&&$('#modal').hidden&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){
    if(e.key==='ArrowLeft'){revGo(RV.ply-1);e.preventDefault();}
    if(e.key==='ArrowRight'){revGo(RV.ply+1);e.preventDefault();}
    if(e.key==='ArrowUp'){revGo(0);e.preventDefault();}
    if(e.key==='ArrowDown'){revGo(RV.src.ucis.length);e.preventDefault();}
  }
});

/* ---------- board component ---------- */
function Board(root,cfg){
  var self=this;this.root=root;this.cfg=cfg;this.flip=false;this.sel=-1;this.targets=[];this.pos=null;this.st={};this.drag=null;this.interactive=false;
  root.classList.add('board');
  this.grid=el('div','bgrid');root.appendChild(this.grid);this.sqs=[];
  for(var i=0;i<64;i++){var s=el('div','sq');s.appendChild(el('span','pc'));this.grid.appendChild(s);this.sqs.push(s);}
  this.svg=document.createElementNS(NS,'svg');this.svg.setAttribute('viewBox','0 0 800 800');this.svg.setAttribute('class','arrows');root.appendChild(this.svg);
  this.badge=el('div','badge');this.badge.hidden=true;root.appendChild(this.badge);
  this.grid.addEventListener('pointerdown',function(e){self.down(e);});
  window.addEventListener('pointermove',function(e){self.move(e);});
  window.addEventListener('pointerup',function(e){self.up(e);});
}
Board.prototype.sqAt=function(i){var dr=i>>3,dc=i&7,r=this.flip?7-dr:dr,f=this.flip?7-dc:dc;return r*16+f;};
Board.prototype.cell=function(sq){var r=sq>>4,f=sq&7;return {dr:this.flip?7-r:r,dc:this.flip?7-f:f};};
Board.prototype.indexOf=function(sq){var c=this.cell(sq);return c.dr*8+c.dc;};
Board.prototype.render=function(pos,st){
  this.pos=pos;this.st=st=st||{};
  for(var i=0;i<64;i++){
    var sq=this.sqAt(i),r=sq>>4,f=sq&7,p=pos.b[sq],s=this.sqs[i],c='sq '+(((r+f)%2===0)?'l':'d');
    if(st.last&&(st.last[0]===sq||st.last[1]===sq))c+=' last';
    if(st.check===sq)c+=' chk';
    if(this.sel===sq)c+=' sel';
    if(this.sel>=0&&this.targets.indexOf(sq)>=0)c+=' tgt'+(p?' cap':'');
    s.className=c;s.dataset.sq=sq;
    s.dataset.rk=(i&7)===0?String(8-r):'';s.dataset.fl=(i>>3)===7?FILES[f]:'';
    var pc=s.firstChild,nc='pc'+(p?(p>>3?' b':' w'):''),nt=p?GLY[p&7]+'︎':'';
    if(pc.className!==nc)pc.className=nc;
    if(pc.textContent!==nt)pc.textContent=nt;
  }
  this.drawArrows(st.arrows||[]);
  if(st.badge){
    var cell=this.cell(st.badge.sq);
    this.badge.hidden=false;this.badge.style.left=((cell.dc+1)*12.5)+'%';this.badge.style.top=(cell.dr*12.5)+'%';
    this.badge.style.background=CLS_COL[st.badge.cls];this.badge.textContent=A.SYM[st.badge.cls];
  }else this.badge.hidden=true;
  var doAnim=st.animate;st.animate=false; /* animate once only: re-renders (selecting a piece) must not replay the last move */
  if(doAnim&&st.last){
    var toI=this.indexOf(st.last[1]),fromI=this.indexOf(st.last[0]),cs=this.grid.clientWidth/8;
    var dx=((fromI&7)-(toI&7))*cs,dy=((fromI>>3)-(toI>>3))*cs,pe=this.sqs[toI].firstChild;
    if(dx||dy){
      pe.style.transition='none';pe.style.transform='translate('+dx+'px,'+dy+'px)';pe.style.zIndex=5;
      void pe.offsetWidth;
      pe.style.transition='transform .16s ease-out';pe.style.transform='';
      setTimeout(function(){pe.style.zIndex='';pe.style.transition='';},220);
    }
  }
};
Board.prototype.drawArrows=function(list){
  var svg=this.svg;while(svg.firstChild)svg.removeChild(svg.firstChild);
  for(var k=0;k<list.length;k++){
    var a=list[k],f=this.cell(a.f),t=this.cell(a.t);
    var x1=f.dc*100+50,y1=f.dr*100+50,x2=t.dc*100+50,y2=t.dr*100+50,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    var hx=x2-ux*34,hy=y2-uy*34;
    var ln=document.createElementNS(NS,'line');
    ln.setAttribute('x1',x1+ux*10);ln.setAttribute('y1',y1+uy*10);ln.setAttribute('x2',hx);ln.setAttribute('y2',hy);
    ln.setAttribute('stroke',a.c||'#4cc26b');ln.setAttribute('stroke-width','16');ln.setAttribute('stroke-linecap','round');ln.setAttribute('opacity','.85');
    var hd=document.createElementNS(NS,'polygon');
    hd.setAttribute('points',[(x2-ux*4)+','+(y2-uy*4),(hx-uy*26)+','+(hy+ux*26),(hx+uy*26)+','+(hy-ux*26)].join(' '));
    hd.setAttribute('fill',a.c||'#4cc26b');hd.setAttribute('opacity','.85');
    svg.appendChild(ln);svg.appendChild(hd);
  }
};
Board.prototype.clear=function(){this.sel=-1;this.targets=[];if(this.pos)this.render(this.pos,this.st);};
Board.prototype.squareAt=function(x,y){
  var rc=this.grid.getBoundingClientRect(),dc=Math.floor((x-rc.left)/rc.width*8),dr=Math.floor((y-rc.top)/rc.height*8);
  if(dc<0||dc>7||dr<0||dr>7)return null;
  var r=this.flip?7-dr:dr,f=this.flip?7-dc:dc;return r*16+f;
};
Board.prototype.down=function(e){
  if(!this.interactive||(e.button&&e.button>0))return;
  var s=e.target.closest('.sq');if(!s)return;var sq=+s.dataset.sq;
  /* Tapping a highlighted target only ARMS the move; it is committed on release (pointerup), so a press alone never plays a move. */
  if(this.sel>=0&&this.targets.indexOf(sq)>=0){this.drag={tap:sq,from:this.sel,moved:false,ghost:null};return;}
  var t=this.cfg.targets(sq);
  if(t&&t.length){
    this.sel=sq;this.targets=t;this.render(this.pos,this.st);
    this.drag={sq:sq,x:e.clientX,y:e.clientY,moved:false,ghost:null};
  }else this.clear();
};
Board.prototype.move=function(e){
  var d=this.drag;if(!d)return;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){
    d.moved=true;var p=this.pos.b[d.sq],g=el('div','ghost '+(p>>3?'b':'w'),GLY[p&7]+'︎');
    g.style.fontSize=(this.grid.clientWidth/8*0.85)+'px';document.body.appendChild(g);d.ghost=g;
    var i=this.indexOf(d.sq);if(i>=0)this.sqs[i].firstChild.classList.add('hide');
  }
  if(d.moved&&d.ghost){d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';}
};
Board.prototype.up=function(e){
  var d=this.drag;if(!d)return;this.drag=null;
  if(d.tap!=null){
    if(!this.interactive||this.sel!==d.from||this.targets.indexOf(d.tap)<0)return;
    var up=this.squareAt(e.clientX,e.clientY);
    if(up===d.tap){this.sel=-1;this.targets=[];this.cfg.onMove(d.from,d.tap);}
    return;
  }
  if(d.ghost)d.ghost.remove();
  var i=this.indexOf(d.sq);if(i>=0)this.sqs[i].firstChild.classList.remove('hide');
  if(d.moved){
    var to=this.squareAt(e.clientX,e.clientY);
    if(to!==null&&to!==d.sq&&this.targets.indexOf(to)>=0){var f=this.sel;this.sel=-1;this.targets=[];this.cfg.onMove(f,to);}
    else this.clear();
  }
};

/* ---------- router ---------- */
var view='home',G=null,GB=null,tickT=null,RV=null,RB=null;
function go(v,noHash){
  if(v==='game'&&!G)v='home';
  view=v;
  document.body.classList.toggle('in-game',v==='game');
  ['home','game','review','leaders'].forEach(function(n){$('#v-'+n).hidden=n!==v;});
  $$('.nav button').forEach(function(b){if(b.dataset.go===v||(v==='game'&&b.dataset.go==='home'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!noHash){try{if(location.hash!=='#'+v)location.hash=v;}catch(e){}}
  if(v==='home')renderHome();
  if(v==='review'){if(!RV){$('#rv-empty').hidden=false;$('#rv-main').hidden=true;renderRecent('#recent2');}else{$('#rv-empty').hidden=true;$('#rv-main').hidden=false;placeCoach();renderReview();}}
  if(v==='leaders')renderLeaders(lbRows);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',function(){var h=(location.hash||'').slice(1);if(['home','game','review','leaders'].indexOf(h)>=0&&h!==view)go(h,true);});
document.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(b)go(b.dataset.go);});

/* ---------- home ---------- */
var UI={level:4,color:'random',tc:0,ocolor:'random',otc:3};
function pills(id,items,key){
  var box=$(id);box.innerHTML='';
  items.forEach(function(it){
    var b=el('button','pill',it.l);b.type='button';b.setAttribute('aria-pressed',String(UI[key]===it.v));
    b.addEventListener('click',function(){UI[key]=it.v;pills(id,items,key);});box.appendChild(b);
  });
}
function renderLevels(){
  var box=$('#p-level');box.innerHTML='';
  E.LEVELS.forEach(function(L,i){
    var b=el('button','lv');b.type='button';b.setAttribute('aria-pressed',String(UI.level===i));
    b.innerHTML='<b>'+esc(L.name)+'</b><span>~'+L.elo+' Elo</span>';
    b.addEventListener('click',function(){UI.level=i;renderLevels();});box.appendChild(b);
  });
  $('#fsays').textContent=C.LEVEL_SAYS[UI.level];
  updateLevelNote();
}
function updateLevelNote(){
  var n=$('#lvnote');if(!n)return;var st=EN.state,t;
  if(UI.level<4)t='Fisher plays human-like mistakes on purpose at this level.';
  else if(st.sf==='ready')t='Powered by Stockfish 10.';
  else if(st.sf==='failed')t='Stockfish could not be loaded, so Fisher uses the built-in engine here (about 2000 at most).';
  else t='Stockfish is still loading. Until it is ready Fisher uses the built-in engine (about 2000 at most).';
  n.textContent=t;
}
EN.onStatus(function(st){
  var e=$('#eng-name');if(e)e.textContent=st.sf==='ready'?'Stockfish 10':(st.sf==='loading'||st.sf==='idle')?'Gochess built-in (loading Stockfish…)':'Gochess built-in';
  updateLevelNote();
});
function renderHome(){
  $('#chip-av').textContent=ME.name.charAt(0).toUpperCase();$('#chip-name').textContent=ME.name;$('#chip-elo').textContent=ME.elo;
  $('#h-elo').textContent=ME.elo;$('#h-w').textContent=ME.w;$('#h-d').textContent=ME.d;$('#h-l').textContent=ME.l;
  $('#home-fisher').innerHTML=C.svg(72);
  renderLevels();
  pills('#p-color',[{l:'White',v:'w'},{l:'Black',v:'b'},{l:'Random',v:'random'}],'color');
  pills('#p-tc',TCS.map(function(t,i){return {l:t.l,v:i};}),'tc');
  pills('#p-ocolor',[{l:'White',v:'w'},{l:'Black',v:'b'},{l:'Random',v:'random'}],'ocolor');
  pills('#p-otc',TCS.map(function(t,i){return {l:t.l,v:i};}),'otc');
  renderRecent('#recent');renderLeaders(lbRows);renderLobby();
}
function renderLobby(){
  var box=$('#lobby');if(!box)return;box.innerHTML='';
  var rows=lobbyRows.filter(function(g){return Date.now()-(g.created||0)<3600000&&!((g.white&&g.white.id===ME.id)||(g.black&&g.black.id===ME.id));});
  if(!rows.length){box.appendChild(el('div','empty','No open games right now.'));return;}
  rows.slice(0,6).forEach(function(g){
    var host=g.white||g.black||{name:'?',elo:0},li=el('div','li');
    var n=el('div','grow');n.textContent=host.name+' ('+host.elo+')';
    var t=el('span','tag',(TCS[g.tc]||TCS[0]).l);
    var b=el('button','btn','Join');b.addEventListener('click',function(){joinRoom(g.code);});
    li.appendChild(n);li.appendChild(t);li.appendChild(b);box.appendChild(li);
  });
}
function renderLeaders(rows){
  [[$('#lb-mini'),6],[$('#lb-full'),25]].forEach(function(p){
    var box=p[0];if(!box)return;box.innerHTML='';
    if(!rows||!rows.length){
      if(!DB){var li=el('div','li me');li.innerHTML='<span class="rk">1</span><span class="grow"></span><b>'+ME.elo+'</b>';li.querySelector('.grow').textContent=ME.name+' (you)';box.appendChild(li);}
      else box.appendChild(el('div','empty','No players yet. Finish a game to appear here.'));
      return;
    }
    rows.slice(0,p[1]).forEach(function(r,i){
      var li=el('div','li'+(r.id===ME.id?' me':''));
      li.appendChild(el('span','rk',String(i+1)));li.appendChild(el('span','grow',r.name+(r.id===ME.id?' (you)':'')));li.appendChild(el('b',null,String(r.elo)));
      box.appendChild(li);
    });
  });
  var note=$('#lb-note');if(note){note.hidden=!!DB;note.textContent='The shared leaderboard is not available right now. Showing your own rating.';}
}
function resultFor(g){
  if(g.my==null)return g.res==='1-0'?'White won':g.res==='0-1'?'Black won':'Draw';
  if(g.res==='1/2-1/2')return 'Draw';return ((g.res==='1-0')===(g.my===0))?'Won':'Lost';
}
function renderRecent(sel){
  var box=$(sel);box.innerHTML='';var list=store.get('gc_games',[]);
  if(!list.length){box.appendChild(el('div','empty','Your finished games will show up here.'));return;}
  list.slice(0,8).forEach(function(g){
    var li=el('div','li'),n=el('div','grow'),r=resultFor(g);
    n.textContent=g.w+' vs '+g.b;
    var tag=el('span','tag',r+(g.d!=null&&g.d!==0?' '+(g.d>0?'+':'')+g.d:''));
    var b=el('button','btn','Review');b.addEventListener('click',function(){reviewFromSaved(g);});
    li.appendChild(n);li.appendChild(tag);li.appendChild(b);box.appendChild(li);
  });
}
$('#chip').addEventListener('click',function(){
  var box=el('div');
  box.innerHTML='<h2 style="margin:0 0 6px;font-family:var(--head)">Profile</h2><p class="muted" style="margin:0 0 6px">No account needed. Friends see your nickname.</p><label class="l" for="i-name">Nickname</label><input id="i-name" type="text" maxlength="18"><label class="l">Board</label><div class="sw" id="sw-board"></div><label class="l">Sound</label><div class="pills" id="sw-sound"></div><div class="row" style="margin-top:16px"><button class="btn pri" id="b-savename">Save</button><button class="btn" id="b-cancel">Cancel</button></div>';
  modal(box);var inp=$('#i-name');inp.value=ME.name;
  var board=SET.board,sound=SET.sound;
  function drawSw(){
    var sb=$('#sw-board');sb.innerHTML='';
    BOARDS.forEach(function(b){var x=el('button');x.type='button';x.title=b.n;x.setAttribute('aria-label',b.n+' board');x.setAttribute('aria-pressed',String(board===b.id));x.style.setProperty('--x',b.x);x.style.setProperty('--y',b.y);x.innerHTML='<i></i><i></i><i></i><i></i>';x.addEventListener('click',function(){board=b.id;document.documentElement.setAttribute('data-board',board);drawSw();});sb.appendChild(x);});
    var ss=$('#sw-sound');ss.innerHTML='';
    [['On',true],['Off',false]].forEach(function(o){var x=el('button','pill',o[0]);x.type='button';x.setAttribute('aria-pressed',String(sound===o[1]));x.addEventListener('click',function(){sound=o[1];drawSw();});ss.appendChild(x);});
  }
  drawSw();
  function save(){var n=cleanName(inp.value);if(n){ME.name=n;saveMe();pushProfile();}SET.board=board;SET.sound=sound;applySettings();closeModal();renderHome();}
  $('#b-savename').addEventListener('click',save);
  $('#b-cancel').addEventListener('click',function(){document.documentElement.setAttribute('data-board',SET.board);closeModal();});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')save();});
});
$('#b-startbot').addEventListener('click',function(){
  var col=UI.color==='random'?(Math.random()<.5?0:1):(UI.color==='w'?0:1);
  newGame({mode:'bot',myColor:col,level:UI.level,tc:UI.tc});
});
$('#b-local').addEventListener('click',function(){newGame({mode:'local',myColor:null,tc:UI.tc});});
$('#b-create').addEventListener('click',function(){createRoom(UI.ocolor,UI.otc);});
$('#b-join').addEventListener('click',function(){joinRoom($('#i-code').value);});
$('#i-code').addEventListener('keydown',function(e){if(e.key==='Enter')joinRoom(this.value);});
$('#b-pgn').addEventListener('click',function(){pgnModal();});
$('#b-pgn2').addEventListener('click',function(){pgnModal();});

/* ---------- game ---------- */
function uid(){return 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function newGame(o){
  teardownGame();
  var tc=TCS[o.tc||0],pos=new E.Pos().setFen(E.START);
  G={gid:uid(),mode:o.mode,myColor:o.myColor,pos:pos,startFen:E.START,moves:[],ucis:[],sans:[],fens:[pos.fen()],keys:[E.key(pos)],last:null,
    status:'active',result:null,reason:null,tc:tc,clockOn:tc.b>0,t:{w:tc.b*1000,b:tc.b*1000,at:Date.now()},flip:o.myColor===1,
    players:{w:null,b:null},thinking:false,drawBy:'',online:null,delta:null,animate:false};
  if(o.mode==='bot'){
    var L=E.LEVELS[o.level];
    G.bot={level:o.level};G.botColor=1-o.myColor;G.botElo=EN.effElo(o.level);
    var me={name:ME.name,elo:ME.elo},bt={name:'Fisher · '+L.name,elo:G.botElo,bot:true};
    G.players=o.myColor===0?{w:me,b:bt}:{w:bt,b:me};
  }else if(o.mode==='local'){G.players={w:{name:'White',elo:null},b:{name:'Black',elo:null}};}
  if(!GB)GB=new Board($('#board'),{targets:gTargets,onMove:gUserMove});
  go('game');renderGame();startTick();
  if(o.mode==='bot')botTurn();
}
function teardownGame(){
  if(G&&G.online&&G.online.unsub){try{G.online.unsub();}catch(e){}}
  clearInterval(tickT);tickT=null;
}
function startTick(){clearInterval(tickT);tickT=setInterval(tick,200);}
function runningSide(){
  if(!G||!G.clockOn||G.status!=='active'||G.ucis.length<2)return null;
  if(G.mode==='online'&&!(G.players.w&&G.players.b))return null;
  return G.pos.side?'b':'w';
}
function remaining(side){var run=runningSide();return Math.max(0,G.t[side]-(run===side?Date.now()-G.t.at:0));}
function fmt(ms){
  if(ms<10000)return (ms/1000).toFixed(1);
  var s=Math.ceil(ms/1000),m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0');
}
function tick(){
  if(!G||view!=='game')return;
  var run=runningSide();
  if(run&&remaining(run)<=0){
    var res=run==='w'?'0-1':'1-0';
    if(G.mode==='online'){if(G.myColor!==null){pushOnline({status:'finished',result:res,reason:'timeout'});finish(res,'timeout');}}
    else finish(res,'timeout');
    return;
  }
  updateClocks();
}
function legalMap(){
  if(G._lm&&G._lmFen===G.fens.length)return G._lm;
  var map={};G.pos.legal(false).forEach(function(m){var f=m&127;(map[f]=map[f]||[]).push(m);});
  G._lm=map;G._lmFen=G.fens.length;return map;
}
function myTurn(){
  if(!G||G.status!=='active'||G.thinking)return false;
  if(G.mode==='local')return true;
  if(G.mode==='online'&&!(G.players.w&&G.players.b))return false;
  return G.myColor!==null&&G.pos.side===G.myColor;
}
function gTargets(sq){
  if(!myTurn())return [];
  var p=G.pos.b[sq];if(!p||(p>>3)!==G.pos.side)return [];
  var ms=legalMap()[sq]||[],seen={},out=[];
  ms.forEach(function(m){var t=(m>>7)&127;if(!seen[t]){seen[t]=1;out.push(t);}});
  return out;
}
function gUserMove(from,to){
  var ms=(legalMap()[from]||[]).filter(function(m){return ((m>>7)&127)===to;});
  if(!ms.length)return;
  if(ms.length>1){
    var side=G.pos.side,box=el('div'),hh=el('h2','','Promote to');hh.style.cssText='margin:0 0 14px;font-family:var(--head);text-align:center';box.appendChild(hh);
    var row=el('div','promo');
    [5,4,3,2].forEach(function(t){var b=el('button',side?'b':'w',GLY[t]+'︎');b.setAttribute('aria-label','Promote to '+['','','knight','bishop','rook','queen'][t]);b.addEventListener('click',function(){closeModal();playerMove(ms.filter(function(x){return ((x>>14)&7)===t;})[0]);});row.appendChild(b);});
    box.appendChild(row);modal(box,false);return;
  }
  playerMove(ms[0]);
}
function playerMove(m){
  if(!myTurn())return;
  commitMove(m,false);
  if(G.mode==='online'){
    var patch={moves:G.ucis.slice(),updated:Date.now(),wt:G.t.w,bt:G.t.b,at:G.t.at,drawBy:''};
    if(G.status==='over'){patch.status='finished';patch.result=G.result;patch.reason=G.reason;}
    pushOnline(patch);
  }
  if(G.mode==='bot')botTurn();
}
function commitMove(m,remote){
  var pos=G.pos,san=E.toSan(pos,m),uci=E.toUci(m),now=Date.now(),cap=!!(m&E.F_CAP);
  if(!remote&&G.clockOn&&G.ucis.length>=2){var mv=pos.side?'b':'w';G.t[mv]=Math.max(0,G.t[mv]-(now-G.t.at))+G.tc.i*1000;}
  pos.make(m);G.moves.push(m);G.ucis.push(uci);G.sans.push(san);G.fens.push(pos.fen());G.keys.push(E.key(pos));
  G.last=[m&127,(m>>7)&127];G.animate=true;
  if(!remote)G.t.at=now;
  var st=E.status(pos,G.keys),chk=pos.inCheck();
  if(!st.over)snd(chk?'check':(cap?'capture':'move'));
  if(st.over&&G.status==='active')finish(st.result,st.reason);else renderGame();
  return st;
}
async function botTurn(){
  var g=G;if(!g||g.status!=='active'||g.mode!=='bot'||g.pos.side!==g.botColor)return;
  if(g.thinking)return; /* never start two searches for the same turn */
  /* lock the board right away: nothing can be selected or moved while Fisher thinks */
  g.thinking=true;GB.interactive=false;GB.sel=-1;GB.targets=[];GB.drag=null;renderStatus();
  var fen=g.pos.fen(),plies=g.ucis.length;
  var t0=Date.now(),r=null;
  try{r=await EN.bot(fen,g.bot.level);}catch(e){r=null;}
  /* human-like pause so the reply doesn't feel instant (about 0.8 to 1.6 s in total) */
  await sleep(Math.max(0,(800+Math.random()*800)-(Date.now()-t0)));
  if(G!==g||g.status!=='active'||g.ucis.length!==plies||g.pos.side!==g.botColor){if(G===g)g.thinking=false;return;}
  g.thinking=false;
  var m=r&&r.uci?E.fromUci(g.pos,r.uci):0;
  if(!m){var l=g.pos.legal(false);m=l[Math.floor(Math.random()*l.length)];}
  commitMove(m,false);
}
function resign(){
  if(!G||G.status!=='active')return;
  var loser=G.mode==='local'?G.pos.side:G.myColor;if(loser===null)return;
  var res=loser===0?'0-1':'1-0';
  if(G.mode==='online')pushOnline({status:'finished',result:res,reason:'resignation'});
  finish(res,'resignation');
}
function offerDraw(){
  if(!G||G.status!=='active'||G.mode!=='online'||G.myColor===null)return;
  pushOnline({drawBy:G.myColor===0?'w':'b'});toast('Draw offer sent');
}
function answerDraw(ok){
  if(ok){pushOnline({status:'finished',result:'1/2-1/2',reason:'draw agreed'});finish('1/2-1/2','draw agreed');}
  else pushOnline({drawBy:''});
}

/* ---------- rating ---------- */
function rate(gid,score,oppElo){
  if(ME.rated[gid])return null;
  var old=ME.elo,K=ME.games<20?40:24,exp=1/(1+Math.pow(10,(oppElo-old)/400));
  ME.elo=Math.max(100,Math.round(old+K*(score-exp)));ME.games++;
  if(score===1)ME.w++;else if(score===0)ME.l++;else ME.d++;
  ME.rated[gid]=1;var keys=Object.keys(ME.rated);if(keys.length>60)delete ME.rated[keys[0]];
  saveMe();pushProfile();
  $('#chip-elo').textContent=ME.elo;
  return {delta:ME.elo-old,elo:ME.elo,old:old};
}
function finish(result,reason){
  if(!G||G.status==='over')return;
  G.status='over';G.result=result;G.reason=reason;G.thinking=false;
  var info=null;
  if(G.myColor!==null&&G.ucis.length>=2&&(G.mode==='bot'||G.mode==='online')){
    var score=result==='1/2-1/2'?0.5:(((result==='1-0')===(G.myColor===0))?1:0);
    var opp=G.mode==='bot'?G.botElo:((G.myColor===0?G.players.b:G.players.w)||{elo:1000}).elo;
    info=rate(G.gid,score,opp);G.delta=info?info.delta:null;
  }
  var wn=(G.players.w||{}).name||'White',bn=(G.players.b||{}).name||'Black';
  var list=store.get('gc_games',[]);
  list.unshift({id:G.gid,t:Date.now(),w:wn,b:bn,res:result,reason:reason,fen:G.startFen,u:G.ucis.slice(),my:G.myColor,d:G.delta});
  store.set('gc_games',list.slice(0,15));
  snd('end');renderGame();showResult(info);
}
function showResult(info){
  var box=el('div'),my=G.myColor,r=G.result,title,kind;
  if(my===null){title=r==='1-0'?'White wins':r==='0-1'?'Black wins':'Draw';kind='draw';}
  else if(r==='1/2-1/2'){title='Draw';kind='draw';}
  else{var won=((r==='1-0')===(my===0));title=won?'You won':'You lost';kind=won?'win':'loss';}
  box.appendChild(el('h2','res-title',title));
  box.appendChild(el('div','muted',G.reason.charAt(0).toUpperCase()+G.reason.slice(1)));
  if(info)box.appendChild(el('div','delta '+(info.delta>=0?'pos':'neg'),info.old+' → '+info.elo+'  ('+(info.delta>=0?'+':'')+info.delta+')'));
  else if(G.mode!=='local')box.appendChild(el('p','muted','Games under 2 moves are not rated.'));
  if(G.mode==='bot'){
    var f=el('div','resf'),av=el('div');av.style.width='64px';av.innerHTML=C.svg(64);f.appendChild(av);f.appendChild(el('div','fsays',C.RESULT[kind]));box.appendChild(f);
  }
  var row=el('div','row');row.style.marginTop='16px';
  var b1=el('button','btn pri','Review with Fisher');b1.addEventListener('click',function(){closeModal();reviewFromGame();});
  var b2=el('button','btn',G.mode==='bot'||G.mode==='local'?'Rematch':'Back to lobby');
  b2.addEventListener('click',function(){closeModal();
    if(G.mode==='bot')newGame({mode:'bot',myColor:1-G.myColor,level:G.bot.level,tc:TCS.indexOf(G.tc)});
    else if(G.mode==='local')newGame({mode:'local',myColor:null,tc:TCS.indexOf(G.tc)});else go('home');});
  var b3=el('button','btn','Close');b3.addEventListener('click',closeModal);
  row.appendChild(b1);row.appendChild(b2);row.appendChild(b3);box.appendChild(row);modal(box);
}

/* ---------- game rendering ---------- */
function capturedOf(pos){
  var start=[0,8,2,2,2,1,1],cnt=[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]],sq,p;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}p=pos.b[sq];if(p)cnt[p>>3][p&7]++;}
  var res={w:[],b:[]},mat=[0,0];
  for(var t=5;t>=1;t--){
    for(var k=0;k<start[t]-cnt[1][t];k++)res.w.push(GLY[t]);
    for(k=0;k<start[t]-cnt[0][t];k++)res.b.push(GLY[t]);
    mat[0]+=cnt[0][t]*E.VAL[t];mat[1]+=cnt[1][t]*E.VAL[t];
  }
  return {w:res.w.join(''),b:res.b.join(''),diff:Math.round((mat[0]-mat[1])/100)};
}
function barHtml(side,pos,players,showClock){
  var pl=players[side]||null,nm=pl?pl.name:'Waiting…',elo=pl&&pl.elo!=null?pl.elo:'';
  var cap=capturedOf(pos),diff=side==='w'?cap.diff:-cap.diff;
  var av=(pl&&pl.bot)?'<span class="av bot">'+C.svg(30)+'</span>':'<span class="av">'+esc(nm.charAt(0).toUpperCase())+'</span>';
  return av+'<div class="grow"><div class="nm">'+esc(nm)+(elo!==''?'<small>'+esc(elo)+'</small>':'')+'</div><div class="cap">'+esc(side==='w'?cap.w:cap.b)+(diff>0?' <span style="font-family:var(--body);font-size:12px">+'+diff+'</span>':'')+'</div></div>'+(showClock?'<div class="clock" data-side="'+side+'">--</div>':'');
}
function renderGame(){
  if(!G)return;
  var bottom=G.flip?'b':'w',top=G.flip?'w':'b';
  $('#pb-top').innerHTML=barHtml(top,G.pos,G.players,G.clockOn);
  $('#pb-bot').innerHTML=barHtml(bottom,G.pos,G.players,G.clockOn);
  GB.flip=G.flip;GB.interactive=myTurn();
  var chk=G.status==='active'&&G.pos.inCheck()?G.pos.ksq[G.pos.side]:-1;
  if(!GB.interactive){GB.sel=-1;GB.targets=[];}
  GB.render(G.pos,{last:G.last,check:chk,animate:G.animate});G.animate=false;
  renderMoves();renderStatus();renderCtrl();updateClocks();
}
function updateClocks(){
  if(!G||!G.clockOn)return;
  var run=runningSide();
  $$('#v-game .clock').forEach(function(c){var s=c.dataset.side,ms=remaining(s);c.textContent=fmt(ms);c.className='clock'+(run===s?' on':'')+(ms<20000?' low':'');});
}
function renderMoves(){
  var box=$('#g-moves'),h='';
  for(var i=0;i<G.sans.length;i+=2)h+='<div class="mv"><span class="n">'+(i/2+1)+'.</span><span class="m">'+esc(G.sans[i])+'</span><span class="m">'+esc(G.sans[i+1]||'')+'</span></div>';
  box.innerHTML=h||'<div class="empty">No moves yet.</div>';box.scrollTop=box.scrollHeight;
}
function renderStatus(){
  var b=$('#g-status'),h='';
  if(G.mode==='online'&&G.status==='active'&&!(G.players.w&&G.players.b)){
    h='<div class="muted" style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:600">Room code</div><div class="code">'+esc(G.online.code)+'</div><div class="status"><small>Share this code. Your friend opens Gochess and joins with it.</small></div><div class="row" style="margin-top:10px"><button class="btn" id="b-copy">Copy code</button></div>';
  }else if(G.status==='over'){
    var r=G.result,t=r==='1-0'?'White wins':r==='0-1'?'Black wins':'Draw';
    h='<div class="status">'+t+'<small>'+esc(G.reason)+'</small></div>';
  }else{
    var side=G.pos.side===0?'White':'Black',txt;
    if(G.thinking)txt='Fisher is thinking…';
    else if(G.mode==='local'||G.myColor===null)txt=side+' to move';
    else txt=G.pos.side===G.myColor?'Your move':'Waiting for '+(G.mode==='bot'?'Fisher':'opponent')+'…';
    h='<div class="status">'+txt+(G.pos.inCheck()?'<small>Check</small>':'')+'</div>';
    if(G.drawBy&&G.myColor!==null&&G.drawBy!==(G.myColor===0?'w':'b'))h+='<div class="row" style="margin-top:10px"><span>Opponent offers a draw</span><button class="btn pri" id="b-acc">Accept</button><button class="btn" id="b-dec">Decline</button></div>';
  }
  b.innerHTML=h;
  var c=$('#b-copy');if(c)c.addEventListener('click',function(){var code=G.online.code;try{navigator.clipboard.writeText(code).then(function(){toast('Code copied');},function(){toast(code);});}catch(e){toast(code);}});
  var a=$('#b-acc');if(a)a.addEventListener('click',function(){answerDraw(true);});
  var d=$('#b-dec');if(d)d.addEventListener('click',function(){answerDraw(false);});
}
function renderCtrl(){
  var box=$('#g-ctrl');box.innerHTML='';
  function add(label,cls,fn,dis){var b=el('button','btn '+(cls||''),label);if(dis)b.disabled=true;b.addEventListener('click',fn);box.appendChild(b);return b;}
  add('Flip board','',function(){G.flip=!G.flip;renderGame();});
  if(G.status==='over'){add('Review with Fisher','pri',reviewFromGame);add('Back to lobby','',function(){go('home');});return;}
  if(G.mode==='online'&&!(G.players.w&&G.players.b)){add('Cancel room','warn',leaveRoom);return;}
  if(G.mode==='online')add('Offer draw','',offerDraw,G.myColor===null||G.ucis.length<2);
  var rb=add('Resign','warn',function(){
    if(rb.dataset.arm==='1'){resign();return;}
    rb.dataset.arm='1';rb.textContent='Confirm resign';setTimeout(function(){if(rb.isConnected){rb.dataset.arm='';rb.textContent='Resign';}},3000);
  },G.myColor===null&&G.mode!=='local');
  if(G.mode==='local'||G.mode==='bot')add('Leave','',function(){go('home');});
}
async function leaveRoom(){
  if(G&&G.online&&DB){try{await DB.doc('games/'+G.online.code).delete();}catch(e){}}
  teardownGame();G=null;go('home');
}

/* ---------- online ---------- */
function makeCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(var i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
async function pushOnline(patch){
  if(!G||!G.online||!DB)return;
  try{await DB.doc('games/'+G.online.code).update(patch);}catch(e){toast('Connection problem. Your move may not have reached your opponent.');}
}
async function createRoom(color,tcIdx){
  if(!DB){toast('Online rooms are not available right now.');return;}
  var code=makeCode(),col=color==='random'?(Math.random()<.5?'w':'b'):color,me={id:ME.id,name:ME.name,elo:ME.elo},tc=TCS[tcIdx];
  var doc={code:code,status:'waiting',white:col==='w'?me:null,black:col==='b'?me:null,tc:tcIdx,moves:[],created:Date.now(),updated:Date.now(),drawBy:'',result:'',reason:'',wt:tc.b*1000,bt:tc.b*1000,at:Date.now()};
  try{await DB.doc('games/'+code).set(doc);}catch(e){toast('Could not create the room. Try again.');return;}
  enterOnline(code);
}
async function joinRoom(code){
  code=String(code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{4,8}$/.test(code)){toast('Enter a valid room code.');return;}
  if(!DB){toast('Online rooms are not available right now.');return;}
  var ref=DB.doc('games/'+code),snap;
  try{snap=await ref.get();}catch(e){toast('Could not reach the server.');return;}
  if(!snap.exists){toast('Room not found.');return;}
  var d=snap.data(),mine=(d.white&&d.white.id===ME.id)||(d.black&&d.black.id===ME.id);
  if(!mine&&d.status==='waiting'){
    try{
      var lease=await ref.acquire({holder:ME.id,ttlMs:4000});
      if(!lease.acquired){toast('Someone else is joining. Try again in a moment.');return;}
      d=(await ref.get()).data();
      if(!d||d.status!=='waiting'||(d.white&&d.black)){toast('That room is no longer open.');return;}
      var me={id:ME.id,name:ME.name,elo:ME.elo},patch={status:'active',updated:Date.now(),at:Date.now()};
      if(!d.white)patch.white=me;else patch.black=me;
      await ref.update(patch);
    }catch(e){toast('Could not join the room.');return;}
  }
  enterOnline(code);
}
function enterOnline(code){
  teardownGame();
  var pos=new E.Pos().setFen(E.START);
  G={gid:'o'+code,mode:'online',myColor:null,pos:pos,startFen:E.START,moves:[],ucis:[],sans:[],fens:[pos.fen()],keys:[E.key(pos)],last:null,
    status:'active',result:null,reason:null,tc:TCS[0],clockOn:false,t:{w:0,b:0,at:Date.now()},flip:false,players:{w:null,b:null},thinking:false,drawBy:'',delta:null,animate:false,online:{code:code}};
  if(!GB)GB=new Board($('#board'),{targets:gTargets,onMove:gUserMove});
  G.online.unsub=DB.doc('games/'+code).onSnapshot(onRemote,function(){toast('Lost connection to the room.');});
  go('game');renderGame();startTick();
}
function onRemote(snap){
  if(!G||!G.online)return;
  if(!snap.exists){if(G.status!=='over'){toast('The room was closed.');teardownGame();G=null;go('home');}return;}
  var d=snap.data();
  var meW=d.white&&d.white.id===ME.id,meB=d.black&&d.black.id===ME.id;
  G.myColor=meW?0:(meB?1:null);
  if(!G.synced){G.flip=G.myColor===1;G.synced=true;}
  G.players={w:d.white||null,b:d.black||null};
  G.tc=TCS[d.tc]||TCS[0];G.clockOn=G.tc.b>0;G.gid='o'+d.code+'_'+d.created;
  var us=d.moves||[];
  while(G.ucis.length<us.length){var m=E.fromUci(G.pos,us[G.ucis.length]);if(!m)break;commitMove(m,true);}
  if(d.at&&us.length>=G.ucis.length)G.t={w:d.wt,b:d.bt,at:d.at};
  G.drawBy=d.drawBy||'';
  if(d.status==='finished'&&G.status!=='over'){finish(d.result,d.reason||'game over');return;}
  renderGame();
}

/* ---------- review with Fisher ---------- */
function fensFrom(startFen,ucis){
  var pos=new E.Pos().setFen(startFen),fens=[pos.fen()];
  for(var i=0;i<ucis.length;i++){var m=E.fromUci(pos,ucis[i]);if(!m)return null;pos.make(m);fens.push(pos.fen());}
  return fens;
}
function reviewFromGame(){
  if(!G)return;
  openReview({fens:G.fens.slice(),ucis:G.ucis.slice(),white:(G.players.w||{}).name||'White',black:(G.players.b||{}).name||'Black',result:G.result||'*',my:G.myColor});
}
function reviewFromSaved(g){
  var fens=fensFrom(g.fen,g.u);if(!fens){toast('That game could not be loaded.');return;}
  openReview({fens:fens,ucis:g.u.slice(),white:g.w,black:g.b,result:g.res,my:g.my});
}
var coachNode=null;
function ensureCoach(){
  if(coachNode)return;
  coachNode=el('div','coach');coachNode.id='coach';
  coachNode.innerHTML='<div class="cav">'+C.svg(64)+'</div><div class="bubble" id="bubble"></div>';
}
function placeCoach(){
  ensureCoach();
  var mobile=window.matchMedia('(max-width:980px)').matches;
  var slot=$(mobile?'#coach-slot-m':'#coach-slot-d');
  if(slot&&coachNode.parentNode!==slot)slot.appendChild(coachNode);
  var pb=$('#coach-slot-m');if(pb)pb.style.marginBottom=mobile?'12px':'0';
}
window.addEventListener('resize',function(){if(RV&&view==='review')placeCoach();});
function openReview(src){
  if(!src.ucis.length){toast('No moves to review yet.');return;}
  RV={src:src,ply:src.ucis.length,res:null,progress:0,flip:src.my===1,showBest:false,prev:src.ucis.length};
  $('#rv-empty').hidden=true;$('#rv-main').hidden=false;
  if(!RB)RB=new Board($('#rboard'),{targets:function(){return [];},onMove:function(){}});
  go('review');
  var rv=RV;
  A.analyze(Object.assign({},src),EN,function(a,b){
    if(rv!==RV)return;rv.progress=a/b;
    var p=$('#prog');if(p)p.style.width=(rv.progress*100)+'%';
    var t=$('#progtxt');if(t)t.textContent='Reading position '+a+' of '+b+'…';
  },{ms:160,cancel:function(){return rv!==RV;}})
  .then(function(res){if(rv!==RV||!res)return;rv.res=res;renderReview();})
  .catch(function(){toast('Analysis failed. Try again.');});
}
function revGo(p){if(!RV)return;var n=RV.src.ucis.length;RV.prev=RV.ply;RV.ply=Math.max(0,Math.min(n,p));RV.showBest=false;renderReview();}
$$('[data-nav]').forEach(function(b){b.addEventListener('click',function(){
  if(!RV)return;var n=RV.src.ucis.length,a=b.dataset.nav;
  if(a==='start')revGo(0);else if(a==='prev')revGo(RV.ply-1);else if(a==='next')revGo(RV.ply+1);else if(a==='end')revGo(n);else if(a==='flip'){RV.flip=!RV.flip;renderReview();}
});});
$('#b-best').addEventListener('click',function(){if(!RV)return;RV.showBest=!RV.showBest;renderReview();});
function dotHtml(cls,big){return '<span class="dot '+CLS_CSS[cls]+'" title="'+esc(A.LABEL[cls])+'">'+esc(A.SYM[cls])+'</span>';}
function renderCoach(o,ply){
  var rv=RV,res=rv.res,b=$('#bubble');if(!b)return;
  var h='<div class="who">Fisher &middot; Coach</div>';
  if(!res){
    h+='<div class="bh"><b>Studying the tides…</b></div><div class="prog"><i id="prog" style="width:'+(rv.progress*100)+'%"></i></div><p class="note" id="progtxt">Reading the game…</p>';
  }else if(ply===0){
    h+='<div class="bh"><b>Starting position</b><span class="evchip">'+esc(A.evalText(res.evalPos[0]))+'</span></div><p class="poem">'+esc(C.INTRO.poem)+'</p><p class="note">'+esc(C.INTRO.note)+'</p>';
  }else{
    h+='<div class="bh">'+dotHtml(o.cls)+'<b>'+esc(o.san)+' is '+esc(PHRASE[o.cls])+'</b><span class="evchip">'+esc(A.evalText(res.evalPos[ply]))+'</span></div><p class="poem">'+esc(o.poem)+'</p><p class="note">'+esc(o.note)+'</p>';
  }
  b.innerHTML=h;
}
function renderReview(){
  if(!RV)return;
  var rv=RV,src=rv.src,n=src.ucis.length,ply=rv.ply,res=rv.res;
  var pos=new E.Pos().setFen(src.fens[ply]);
  var mvObj=ply>0?E.fromUci(new E.Pos().setFen(src.fens[ply-1]),src.ucis[ply-1]):0;
  var o=(res&&ply>0)?res.out[ply-1]:null,arrows=[];
  var differs=!!(o&&o.bestUci&&o.bestUci!==o.uci);
  if(differs&&(rv.showBest||BAD[o.cls]))arrows.push({f:E.nameSq(o.bestUci.substr(0,2)),t:E.nameSq(o.bestUci.substr(2,2)),c:'#4cc26b'});
  RB.flip=rv.flip;RB.interactive=false;
  RB.render(pos,{last:mvObj?[mvObj&127,(mvObj>>7)&127]:null,check:pos.inCheck()?pos.ksq[pos.side]:-1,arrows:arrows,badge:o?{sq:(mvObj>>7)&127,cls:o.cls}:null,animate:ply===rv.prev+1});
  var top=rv.flip?'w':'b',bot=rv.flip?'b':'w',names={w:src.white,b:src.black};
  var isBot=function(nm){return /^Fisher/.test(nm);};
  function bar(s){return (isBot(names[s])?'<span class="av bot">'+C.svg(30)+'</span>':'<span class="av">'+esc(names[s].charAt(0).toUpperCase())+'</span>')+'<div class="grow nm">'+esc(names[s])+'</div>';}
  $('#rb-top').innerHTML=bar(top);$('#rb-bot').innerHTML=bar(bot);
  var wpct=res?res.win[ply]:50,fill=$('#evalfill');
  fill.style.height=wpct+'%';fill.style.top=rv.flip?'0':'auto';fill.style.bottom=rv.flip?'auto':'0';
  var bb=$('#b-best');bb.disabled=!differs;bb.textContent=rv.showBest?'Hide best move':'Show best move'+(differs?' ('+o.bestSan+')':'');
  placeCoach();renderCoach(o,ply);
  var h='<div class="card"><div class="row" style="justify-content:space-between"><b>'+esc(src.white)+' vs '+esc(src.black)+'</b><span class="tag">'+esc(src.result)+'</span></div>';
  if(!res)h+='<p class="muted" style="margin:10px 0 0">Accuracy and the move table appear when Fisher finishes reading the game.</p></div>';
  else{
    h+='<div class="acc" style="margin-top:12px"><div><small>'+esc(src.white)+'</small><b>'+(res.acc[0]==null?'-':res.acc[0].toFixed(1))+'</b><small>accuracy</small></div><div><small>'+esc(src.black)+'</small><b>'+(res.acc[1]==null?'-':res.acc[1].toFixed(1))+'</b><small>accuracy</small></div></div>';
    h+='<div class="engtag" style="margin-top:10px">Engine: '+esc(res.engine||'built-in')+(res.depth?' · depth '+res.depth:'')+'</div></div>';
    h+='<div class="card"><svg class="graph" id="graph" viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="Evaluation graph. Click to jump to a move."></svg></div>';
    var cw=res.counts[0],cb=res.counts[1];
    h+='<div class="card"><table class="cnt"><tbody>';
    A.ORDER.forEach(function(k){h+='<tr><td><span class="k">'+dotHtml(k)+esc(A.LABEL[k])+'</span></td><td>'+(cw[k]||0)+'</td><td>'+(cb[k]||0)+'</td></tr>';});
    h+='</tbody></table></div>';
  }
  h+='<div class="moves" id="rv-moves">';
  for(var i=0;i<n;i+=2){
    h+='<div class="mv"><span class="n">'+(i/2+1)+'.</span>';
    for(var j=i;j<i+2;j++){
      if(j<n){var oj=res?res.out[j]:null,pj=new E.Pos().setFen(src.fens[j]),san=oj?oj.san:E.toSan(pj,E.fromUci(pj,src.ucis[j]));
        h+='<button class="m'+(ply===j+1?' act':'')+'" data-p="'+(j+1)+'">'+(oj?dotHtml(oj.cls):'')+esc(san)+'</button>';}
      else h+='<span></span>';
    }
    h+='</div>';
  }
  h+='</div><div class="row"><button class="btn" id="b-pgnc">Copy PGN</button><button class="btn" id="b-newrev">Analyze another game</button></div>';
  $('#rv-rest').innerHTML='<div class="side">'+h+'</div>';
  $$('#rv-moves .m').forEach(function(b){b.addEventListener('click',function(){revGo(+b.dataset.p);});});
  var act=$('#rv-moves .act');if(act){var box=$('#rv-moves');box.scrollTop=Math.max(0,act.offsetTop-box.offsetTop-70);}
  $('#b-pgnc').addEventListener('click',function(){copyPgn(rv);});
  $('#b-newrev').addEventListener('click',function(){RV=null;go('review');});
  if(res)drawGraph(res,ply,n);
}
function drawGraph(res,ply,n){
  var g=$('#graph');if(!g)return;var W=300,H=90,pts=[],i;
  for(i=0;i<=n;i++)pts.push([(n?i/n:0)*W,H-res.win[i]/100*H]);
  var d='M0,'+H+' '+pts.map(function(p){return 'L'+p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+' L'+W+','+H+' Z';
  var x=(n?ply/n:0)*W;
  g.innerHTML='<path d="'+d+'" fill="#f3f4ee" opacity=".92"/><line x1="0" y1="'+H/2+'" x2="'+W+'" y2="'+H/2+'" stroke="#888" stroke-width=".6" stroke-dasharray="3 3"/><line x1="'+x+'" y1="0" x2="'+x+'" y2="'+H+'" stroke="#6fd98a" stroke-width="2"/>';
  g.onclick=function(e){var rc=g.getBoundingClientRect();revGo(Math.round((e.clientX-rc.left)/rc.width*n));};
}
function pgnText(src){
  var res=src.result||'*',h='[Event "Gochess game"]\n[Site "Gochess"]\n[White "'+src.white.replace(/"/g,"'")+'"]\n[Black "'+src.black.replace(/"/g,"'")+'"]\n[Result "'+res+'"]\n\n',s='';
  for(var i=0;i<src.ucis.length;i++){var p=new E.Pos().setFen(src.fens[i]);if(i%2===0)s+=(i/2+1)+'. ';s+=E.toSan(p,E.fromUci(p,src.ucis[i]))+' ';}
  return h+s+res;
}
function copyPgn(rv){var t=pgnText(rv.src);try{navigator.clipboard.writeText(t).then(function(){toast('PGN copied');},function(){pgnModal(t);});}catch(e){pgnModal(t);}}

/* ---------- PGN import ---------- */
function parsePgn(text){
  var tags={},m,re=/\[(\w+)\s+"([^"]*)"\]/g;
  while((m=re.exec(text)))tags[m[1]]=m[2];
  var body=text.replace(/\[[^\]]*\]/g,' ').replace(/\{[^}]*\}/g,' ').replace(/;[^\n]*/g,' ');
  var prev;do{prev=body;body=body.replace(/\([^()]*\)/g,' ');}while(body!==prev);
  body=body.replace(/\$\d+/g,' ').replace(/\d+\.(\.\.)?/g,' ');
  var toks=body.split(/\s+/).filter(function(t){return t&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t);});
  var start=tags.FEN||E.START,pos=new E.Pos().setFen(start),fens=[pos.fen()],ucis=[];
  for(var i=0;i<toks.length;i++){
    var mv=E.fromSan(pos,toks[i]);
    if(!mv)return {err:'Could not read move "'+toks[i]+'" (move '+(Math.floor(i/2)+1)+').'};
    ucis.push(E.toUci(mv));pos.make(mv);fens.push(pos.fen());
  }
  if(!ucis.length)return {err:'No moves found.'};
  return {fens:fens,ucis:ucis,white:cleanName(tags.White)||'White',black:cleanName(tags.Black)||'Black',result:tags.Result||'*',my:null};
}
function pgnModal(prefill){
  var box=el('div');box.innerHTML='<h2 style="margin:0 0 6px;font-family:var(--head)">Analyze a PGN</h2><p class="muted" style="margin:0 0 10px">Paste a game from anywhere. Moves in standard notation work too.</p><textarea id="i-pgn" placeholder="1. e4 e5 2. Nf3 Nc6 ..." aria-label="PGN"></textarea><div id="pgn-err" class="neg" style="margin-top:8px"></div><div class="row" style="margin-top:12px"><button class="btn pri" id="b-run">Analyze</button><button class="btn" id="b-x">Close</button></div>';
  modal(box);if(typeof prefill==='string')$('#i-pgn').value=prefill;
  $('#b-x').addEventListener('click',closeModal);
  $('#b-run').addEventListener('click',function(){
    var r=parsePgn($('#i-pgn').value);
    if(r.err){$('#pgn-err').textContent=r.err;return;}
    closeModal();openReview(r);
  });
}

/* ---------- init ---------- */
EN.init();
renderHome();
initDb();
var h0=(location.hash||'').slice(1);
if(h0==='leaders'||h0==='review')go(h0,true);else go('home',true);
})();
