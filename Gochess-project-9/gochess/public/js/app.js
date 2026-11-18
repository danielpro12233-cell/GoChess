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
var CLS_CSS={brilliant:'cb',great:'cg',best:'cbe',excellent:'cex',good:'cgo',book:'cbk',inaccuracy:'cin',mistake:'cmi',miss:'cms',blunder:'cbl'};
var CLS_COL={brilliant:'var(--c-brilliant)',great:'var(--c-great)',best:'var(--c-best)',excellent:'var(--c-excellent)',good:'var(--c-good)',book:'var(--c-book)',inaccuracy:'var(--c-inaccuracy)',mistake:'var(--c-mistake)',miss:'var(--c-miss)',blunder:'var(--c-blunder)'};
var PHRASE={brilliant:'brilliant',great:'a great move',best:'the best move',excellent:'excellent',good:'good',book:'a book move',inaccuracy:'an inaccuracy',mistake:'a mistake',miss:'a miss',blunder:'a blunder'};
var BAD={inaccuracy:1,mistake:1,miss:1,blunder:1};
var BOARDS=[{id:'green',n:'Green',x:'#e6ecd9',y:'#6f9a6d'},{id:'ocean',n:'Ocean',x:'#dce6ef',y:'#6b8cae'},{id:'walnut',n:'Walnut',x:'#f0d9b5',y:'#b58863'},{id:'slate',n:'Slate',x:'#d9d9d4',y:'#6e7a86'}];

/* ---------- profile (no account needed) and settings ---------- */
var ME=store.get('gc_me',null);
if(!ME||!ME.id){ME={id:'p'+Math.random().toString(36).slice(2,12),name:'Guest'+Math.floor(1000+Math.random()*9000),elo:1000,games:0,w:0,l:0,d:0,rated:{}};store.set('gc_me',ME);}
function saveMe(){store.set('gc_me',ME);}
function cleanName(s){return String(s||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18);}
var SET=Object.assign({board:'green',sound:true,coach:true,lang:'en'},store.get('gc_set',{}));
if(SET.lang!=='tl')SET.lang='en';
function applySettings(){if(SET.lang!=='tl')SET.lang='en';C.setLang(SET.lang);document.documentElement.setAttribute('data-board',SET.board);store.set('gc_set',SET);}
applySettings();
/* Fisher's language (English or Tagalog). L() picks a string; loc() picks the right text of a rated move. */
function L(en,tl){return SET.lang==='tl'?tl:en;}
function lbl(k){return SET.lang==='tl'?A.LABEL_TL[k]:A.LABEL[k];}
function moveHead(san,cls){return SET.lang==='tl'?'Ang '+san+' ay '+A.PHRASE_TL[cls]:san+' is '+PHRASE[cls];}
function loc(o){return (o&&o.loc&&o.loc[SET.lang])||o||{};}
function langSwitchHtml(){return '<span class="lt" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="'+(SET.lang==='en')+'">EN</button><button type="button" data-lang="tl" aria-pressed="'+(SET.lang==='tl')+'">TL</button></span>';}
function bindLang(root){if(!root)return;var bs=root.querySelectorAll('.lt button');for(var i=0;i<bs.length;i++)bs[i].addEventListener('click',function(){setLang(this.dataset.lang);});}
function setLang(l){
  l=l==='tl'?'tl':'en';if(SET.lang===l)return;
  SET.lang=l;applySettings();
  if(G&&G.mode==='bot'&&G.sayKind)G.say=C.say(G.sayKind,G.bot.level,l);
  if(view==='home')renderHome();
  if(G&&view==='game')renderGame();
  if(RV&&view==='review')renderReview();
}
function setSay(kind){if(!G||G.mode!=='bot')return;G.sayKind=kind;G.say=C.say(kind,G.bot.level,SET.lang);}

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
var DB=null,lbRows=[],acctRows=[],lobbyRows=[];
async function initDb(){
  try{
    if(CFG.mode==='server'&&window.GCNet)DB=await GCNet.connect();
    else if(window.claude&&window.claude.use)DB=await window.claude.use('db');
  }catch(e){DB=null;}
  $('#online-off').hidden=!!DB;$('#online-on').hidden=!DB;
  await initAuth();
  if(DB){pushProfile();watchLobby();watchLeaders();}
  else renderLeaders();
  renderLobby();
}
function pushProfile(){
  if(ACCT){
    api('/api/account/save',{name:ME.name,elo:ME.elo,games:ME.games,w:ME.w,l:ME.l,d:ME.d},ACCT.token).then(function(r){
      if(r&&r.profile&&r.profile.games>=ME.games){ME.elo=r.profile.elo;saveMe();var ce=$('#chip-elo');if(ce)ce.textContent=ME.elo;}
    }).catch(function(e){if(e&&e.status===401){dropAcct();toast('Please sign in again to keep saving your rating.');renderHome();}});
    return;
  }
  if(!DB)return;
  try{DB.doc('players/'+ME.id).set({name:ME.name,elo:ME.elo,games:ME.games,w:ME.w,l:ME.l,d:ME.d,t:Date.now()}).catch(function(){});}catch(e){}
}
function validRow(x){return x&&x.name&&typeof x.elo==='number';}
function watchLeaders(){
  try{DB.collection('players').orderBy('elo','desc').limit(25).onSnapshot(function(s){lbRows=s.docs.map(function(d){var x=d.data();x.id=d.id;return x;}).filter(validRow);renderLeaders();},function(){renderLeaders();});}catch(e){}
  try{DB.collection('lb').orderBy('elo','desc').limit(25).onSnapshot(function(s){acctRows=s.docs.map(function(d){var x=d.data();x.id=d.id;return x;}).filter(validRow);renderLeaders();},function(){});}catch(e){}
}
function watchLobby(){
  try{DB.collection('games').where('status','==','waiting').limit(30).onSnapshot(function(s){lobbyRows=s.docs.map(function(d){return d.data();});renderLobby();},function(){});}catch(e){}
}

/* ---------- account (Sign in with Google) ---------- */
var ACCT=store.get('gc_acct',null),GCFG={googleClientId:null};
if(ACCT&&!ACCT.token)ACCT=null;
function api(path,body,token){
  var h={'Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;
  return fetch(path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
    return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw {status:r.status,code:j.code,message:j.message};return j;});
  });
}
function applyProfile(p){ME.name=p.name||ME.name;ME.elo=p.elo;ME.games=p.games;ME.w=p.w;ME.l=p.l;ME.d=p.d;ME.sub=p.sub;saveMe();}
function dropAcct(){ACCT=null;store.set('gc_acct',null);ME.sub=null;saveMe();}
async function initAuth(){
  if(CFG.mode!=='server')return;
  try{GCFG=await api('/api/config');}catch(e){GCFG={googleClientId:null};}
  if(ACCT){
    try{
      var r=await api('/api/auth/me',null,ACCT.token),p=r.profile;
      /* games finished while offline are pushed first, so nothing is lost */
      if(ME.sub===p.sub&&ME.games>p.games){
        try{r=await api('/api/account/save',{name:ME.name,elo:ME.elo,games:ME.games,w:ME.w,l:ME.l,d:ME.d},ACCT.token);p=r.profile;}catch(e2){}
      }
      ACCT.name=p.name;ACCT.picture=p.picture;ACCT.sub=p.sub;ACCT.email=p.email;store.set('gc_acct',ACCT);applyProfile(p);
    }catch(e){if(e&&e.status===401)dropAcct();}
  }
  renderHome();
}
function loadGis(){
  return new Promise(function(res,rej){
    if(window.google&&google.accounts&&google.accounts.id)return res();
    var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=function(){res();};s.onerror=function(){rej();};document.head.appendChild(s);
  });
}
async function onGoogle(resp){
  try{
    var r=await api('/api/auth/google',{credential:resp.credential,local:{name:ME.name,elo:ME.elo,games:ME.games,w:ME.w,l:ME.l,d:ME.d}});
    ACCT={token:r.token,sub:r.profile.sub,name:r.profile.name,picture:r.profile.picture,email:r.profile.email};store.set('gc_acct',ACCT);
    applyProfile(r.profile);closeModal();renderHome();
    toast(r.created?'Account created. Welcome, '+r.profile.name+'!':'Welcome back, '+r.profile.name+'. Your rating: '+r.profile.elo);
  }catch(e){toast(e&&e.message?e.message:'Sign-in failed. Please try again.');}
}
function renderGoogleButton(node){
  loadGis().then(function(){
    google.accounts.id.initialize({client_id:GCFG.googleClientId,callback:onGoogle});
    google.accounts.id.renderButton(node,{theme:'outline',size:'large',text:'signin_with',shape:'pill',width:260});
  }).catch(function(){node.textContent='Could not load Google sign-in. Check your connection and try again.';});
}
function safePic(u){return /^https:\/\/[a-z0-9.\-]*googleusercontent\.com\//i.test(u||'')?u:'';}
function signOut(){
  var t=ACCT&&ACCT.token;if(t)api('/api/auth/logout',{},t).catch(function(){});
  dropAcct();closeModal();renderHome();toast('Signed out. Your rating stays on this device.');
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
  if(e.key==='Escape'&&$('#modal').hidden&&view==='game'&&G&&G.pm&&G.pm.length){clearPremoves();return;}
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
  for(var i=0;i<64;i++){var s=el('div','sq');s.appendChild(el('span','pc'));s.appendChild(el('span','pmn'));this.grid.appendChild(s);this.sqs.push(s);}
  this.svg=document.createElementNS(NS,'svg');this.svg.setAttribute('viewBox','0 0 800 800');this.svg.setAttribute('class','arrows');root.appendChild(this.svg);
  this.badge=el('div','badge');this.badge.hidden=true;root.appendChild(this.badge);
  this.grid.addEventListener('pointerdown',function(e){self.down(e);});
  window.addEventListener('pointermove',function(e){self.move(e);});
  window.addEventListener('pointerup',function(e){self.up(e);});
  /* a cancelled touch, a lost window or a hidden tab must never leave a dragged piece stuck on screen */
  window.addEventListener('pointercancel',function(){self.endDrag();});
  window.addEventListener('blur',function(){self.endDrag();});
  document.addEventListener('visibilitychange',function(){if(document.hidden)self.endDrag();});
}
Board.prototype.endDrag=function(){
  var d=this.drag;this.drag=null;
  if(d&&d.ghost)d.ghost.remove();
  var gs=document.querySelectorAll('.ghost');for(var i=0;i<gs.length;i++)gs[i].remove();
  for(var k=0;k<64;k++){var pc=this.sqs[k].firstChild;if(pc.classList.contains('hide'))pc.classList.remove('hide');}
  if(d&&d.moved&&this.pos){this.sel=-1;this.targets=[];this.render(this.pos,this.st);}
};
Board.prototype.sqAt=function(i){var dr=i>>3,dc=i&7,r=this.flip?7-dr:dr,f=this.flip?7-dc:dc;return r*16+f;};
Board.prototype.cell=function(sq){var r=sq>>4,f=sq&7;return {dr:this.flip?7-r:r,dc:this.flip?7-f:f};};
Board.prototype.indexOf=function(sq){var c=this.cell(sq);return c.dr*8+c.dc;};
Board.prototype.render=function(pos,st){
  this.pos=pos;this.st=st=st||{};
  if(!this.drag){var stale=document.querySelectorAll('.ghost');for(var g=0;g<stale.length;g++)stale[g].remove();}
  var pmn={},pmi;
  if(st.pm)for(pmi=0;pmi<st.pm.length;pmi++){pmn[st.pm[pmi].f]=pmn[st.pm[pmi].f]||0;pmn[st.pm[pmi].t]=pmi+1;}
  for(var i=0;i<64;i++){
    var sq=this.sqAt(i),r=sq>>4,f=sq&7,p=pos.b[sq],s=this.sqs[i],c='sq '+(((r+f)%2===0)?'l':'d');
    if(st.last&&(st.last[0]===sq||st.last[1]===sq))c+=' last';
    if(pmn[sq]!==undefined)c+=' pm';
    var pn=s.children[1],pt=pmn[sq]?String(pmn[sq]):'';if(pn.textContent!==pt)pn.textContent=pt;
    if(st.check===sq)c+=' chk';
    if(this.sel===sq)c+=' sel';
    if(this.sel>=0&&this.targets.indexOf(sq)>=0)c+=' tgt'+(p?' cap':'');
    s.className=c;s.dataset.sq=sq;
    s.dataset.rk=(i&7)===0?String(8-r):'';s.dataset.fl=(i>>3)===7?FILES[f]:'';
    var pc=s.firstChild,nc='pc'+(p?(p>>3?' b':' w'):''),nt=p?GLY[p&7]+'︎':'';
    if(pc.className!==nc)pc.className=nc;
    if(pc.textContent!==nt)pc.textContent=nt;
    if(pc.style.transform&&!pc._anim){pc.style.transform='';pc.style.transition='';pc.style.zIndex='';}
  }
  this.drawArrows(st.arrows||[]);
  if(st.badge){
    var cell=this.cell(st.badge.sq);
    this.badge.hidden=false;this.badge.style.left=((cell.dc+1)*12.5)+'%';this.badge.style.top=(cell.dr*12.5)+'%';
    this.badge.style.background=CLS_COL[st.badge.cls];this.badge.textContent=A.SYM[st.badge.cls];
  }else this.badge.hidden=true;
  if(st.glide){var gl=st.glide;st.glide=null;this.glide(gl);}
  else if(st.animate&&st.last){
    st.animate=false; /* play the move animation once only; later re-renders (clicks, selection) must not replay it */
    /* a piece the player dragged is already at its target: sliding it again from the old square looks like a duplicate */
    if(!this.skipAnim){
      var toI=this.indexOf(st.last[1]),fromI=this.indexOf(st.last[0]),cs=this.grid.clientWidth/8;
      var dx=((fromI&7)-(toI&7))*cs,dy=((fromI>>3)-(toI>>3))*cs,pe=this.sqs[toI].firstChild;
      if(dx||dy){
        pe._anim=true;
        pe.style.transition='none';pe.style.transform='translate('+dx+'px,'+dy+'px)';pe.style.zIndex=5;
        void pe.offsetWidth;
        pe.style.transition='transform .16s ease-out';pe.style.transform='';
        setTimeout(function(){pe._anim=false;pe.style.zIndex='';pe.style.transition='';pe.style.transform='';},230);
      }
    }
  }
};
/* Pieces glide from the layout in `from` to the layout now on the board (used when the review jumps back to the start). */
Board.prototype.glide=function(from){
  var self=this,cs=this.grid.clientWidth/8,pos=this.pos;if(!pos||!from||!cs)return;
  var src={},tgt={},sq,key;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}
    if(pos.b[sq]){key=pos.b[sq];(tgt[key]=tgt[key]||[]).push(sq);}
    if(from.b[sq]){key=from.b[sq];(src[key]=src[key]||[]).push(sq);}}
  var moves=[],delay=0;
  Object.keys(tgt).forEach(function(k){
    var T=tgt[k].slice(),S=(src[k]||[]).slice(),i,j;
    for(i=T.length-1;i>=0;i--){j=S.indexOf(T[i]);if(j>=0){T.splice(i,1);S.splice(j,1);}} /* already home: stays */
    while(T.length){
      var bi=-1,bj=-1,bd=1e9;
      for(i=0;i<T.length;i++)for(j=0;j<S.length;j++){var d=Math.hypot((T[i]&7)-(S[j]&7),(T[i]>>4)-(S[j]>>4));if(d<bd){bd=d;bi=i;bj=j;}}
      if(bi<0){moves.push({to:T.shift(),from:-1});continue;} /* a captured piece coming back */
      moves.push({to:T[bi],from:S[bj]});T.splice(bi,1);S.splice(bj,1);
    }
  });
  moves.forEach(function(m,n){
    var pe=self.sqs[self.indexOf(m.to)].firstChild,dl=(n%8)*35;
    pe._anim=true;pe.style.transition='none';pe.style.zIndex=5;
    if(m.from<0){pe.style.opacity='0';pe.style.transform='scale(.4)';}
    else{var a=self.indexOf(m.from),b=self.indexOf(m.to);pe.style.transform='translate('+(((a&7)-(b&7))*cs)+'px,'+(((a>>3)-(b>>3))*cs)+'px)';}
    void pe.offsetWidth;
    pe.style.transition='transform .75s cubic-bezier(.22,.8,.25,1) '+(220+dl)+'ms,opacity .5s ease '+(220+dl)+'ms';
    pe.style.transform='';pe.style.opacity='';
    setTimeout(function(){pe._anim=false;pe.style.zIndex='';pe.style.transition='';pe.style.transform='';pe.style.opacity='';},1300+dl);
  });
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
  if(this.drag)this.endDrag(); /* a second finger or a missed release: drop the old drag first */
  var s=e.target.closest('.sq');if(!s)return;var sq=+s.dataset.sq;
  if(this.sel>=0&&this.targets.indexOf(sq)>=0){var f=this.sel;this.sel=-1;this.targets=[];this.cfg.onMove(f,sq);return;}
  var t=this.cfg.targets(sq);
  if(t&&t.length){
    this.sel=sq;this.targets=t;this.render(this.pos,this.st);
    this.drag={sq:sq,x:e.clientX,y:e.clientY,moved:false,ghost:null,pid:e.pointerId};
  }else this.clear();
};
Board.prototype.move=function(e){
  var d=this.drag;if(!d)return;
  if(d.pid!=null&&e.pointerId!==d.pid)return;
  if(e.pointerType==='mouse'&&e.buttons===0){this.up(e);return;} /* the button was released outside the window */
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){
    d.moved=true;var p=this.pos.b[d.sq],g=el('div','ghost '+(p>>3?'b':'w'),GLY[p&7]+'︎');
    g.style.fontSize=(this.grid.clientWidth/8*0.85)+'px';document.body.appendChild(g);d.ghost=g;
    var i=this.indexOf(d.sq);if(i>=0)this.sqs[i].firstChild.classList.add('hide');
  }
  if(d.moved&&d.ghost){d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';}
};
Board.prototype.up=function(e){
  var d=this.drag;if(!d)return;
  if(d.pid!=null&&e.pointerId!==d.pid)return;
  this.drag=null;
  if(d.ghost)d.ghost.remove();
  var i=this.indexOf(d.sq);if(i>=0)this.sqs[i].firstChild.classList.remove('hide');
  if(d.moved){
    var to=this.squareAt(e.clientX,e.clientY);
    if(to!==null&&to!==d.sq&&this.targets.indexOf(to)>=0){var f=this.sel;this.sel=-1;this.targets=[];this.skipAnim=true;try{this.cfg.onMove(f,to);}finally{this.skipAnim=false;}}
    else this.clear();
  }
};

$('#board').addEventListener('contextmenu',function(e){if(G&&G.pm&&G.pm.length){e.preventDefault();clearPremoves();}else if(canPremove())e.preventDefault();});

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
  if(v==='leaders')renderLeaders();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',function(){var h=(location.hash||'').slice(1);if(['home','game','review','leaders'].indexOf(h)>=0&&h!==view)go(h,true);});
document.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(b)go(b.dataset.go);});

/* ---------- home ---------- */
var UI={level:4,color:'random',tc:0,ocolor:'random',otc:3,lbTab:'acct',coach:SET.coach!==false};
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
  $('#fsays').textContent=C.levelSays(UI.level,SET.lang);
  updateLevelNote();
}
function updateLevelNote(){
  var n=$('#lvnote');if(!n)return;var st=EN.state,t;
  if(UI.level<4)t=L('Fisher plays human-like mistakes on purpose at this level.','Sadyang nagkakamali si Fisher na parang tao sa antas na ito.');
  else if(st.sf==='ready')t='';
  else if(st.sf==='failed')t=L('Fisher is in light mode here (about 2000 at most).','Nasa light mode si Fisher dito (hanggang mga 2000 lang).');
  else t=L('Fisher is warming up. Until he is ready he plays in light mode (about 2000 at most).','Nag-i-init pa si Fisher. Hangga’t hindi pa siya handa, naglalaro siya sa light mode (hanggang mga 2000 lang).');
  n.textContent=t;
}
EN.onStatus(function(st){
  var e=$('#eng-name');if(e)e.textContent=st.sf==='ready'?st.name:(st.sf==='loading'||st.sf==='idle')?'starting…':'built-in';
  updateLevelNote();
});
function renderHome(){
  $('#chip-av').textContent=ME.name.charAt(0).toUpperCase();$('#chip-name').textContent=ME.name;$('#chip-elo').textContent=ME.elo;
  $('#h-elo').textContent=ME.elo;$('#h-w').textContent=ME.w;$('#h-d').textContent=ME.d;$('#h-l').textContent=ME.l;
  $('#home-fisher').innerHTML=C.svg(72);
  renderLevels();
  pills('#p-color',[{l:'White',v:'w'},{l:'Black',v:'b'},{l:'Random',v:'random'}],'color');
  pills('#p-tc',TCS.map(function(t,i){return {l:t.l,v:i};}),'tc');
  pills('#p-coach',[{l:L('Explain my moves','Ipaliwanag ang galaw ko'),v:true},{l:L('No explanations','Walang paliwanag'),v:false}],'coach');
  langPills('#p-lang');
  pills('#p-ocolor',[{l:'White',v:'w'},{l:'Black',v:'b'},{l:'Random',v:'random'}],'ocolor');
  pills('#p-otc',TCS.map(function(t,i){return {l:t.l,v:i};}),'otc');
  renderRecent('#recent');renderLeaders();renderLobby();
}
function langPills(id){
  var box=$(id);if(!box)return;box.innerHTML='';
  [['English','en'],['Tagalog','tl']].forEach(function(o){
    var b=el('button','pill',o[0]);b.type='button';b.setAttribute('aria-pressed',String(SET.lang===o[1]));
    b.addEventListener('click',function(){setLang(o[1]);});box.appendChild(b);
  });
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
function renderLbTabs(){
  ['#lb-tabs','#lb-tabs2'].forEach(function(id){
    var box=$(id);if(!box)return;box.innerHTML='';
    [['acct','Google accounts'],['guest','Guests']].forEach(function(t){
      var b=el('button','pill',t[1]);b.type='button';b.setAttribute('aria-pressed',String(UI.lbTab===t[0]));
      b.addEventListener('click',function(){UI.lbTab=t[0];renderLeaders();});box.appendChild(b);
    });
  });
  ['#lb-cta','#lb-cta2'].forEach(function(id){
    var c=$(id);if(!c)return;c.innerHTML='';
    if(UI.lbTab==='acct'&&!ACCT&&GCFG.googleClientId){
      var b=el('button','btn pri','Sign in with Google');b.addEventListener('click',openProfile);
      var t=el('div','muted','Sign in to keep your rating on every device and appear on this board.');t.style.cssText='font-size:13px;margin:10px 0 8px';
      c.appendChild(t);c.appendChild(b);
    }
  });
}
function renderLeaders(){
  renderLbTabs();
  var acctTab=UI.lbTab==='acct',rows=acctTab?acctRows:lbRows;
  [[$('#lb-mini'),6],[$('#lb-full'),25]].forEach(function(p){
    var box=p[0];if(!box)return;box.innerHTML='';
    if(!rows||!rows.length){
      if(!DB&&((acctTab&&ACCT)||(!acctTab&&!ACCT))){var li=el('div','li me');li.innerHTML='<span class="rk">1</span><span class="grow"></span><b>'+ME.elo+'</b>';li.querySelector('.grow').textContent=ME.name+' (you)';box.appendChild(li);}
      else box.appendChild(el('div','empty',acctTab?'No Google accounts on the board yet. Be the first.':'No guests yet. Finish a game to appear here.'));
      return;
    }
    rows.slice(0,p[1]).forEach(function(r,i){
      var mine=acctTab?(ACCT&&r.id===ACCT.sub):(!ACCT&&r.id===ME.id);
      var li=el('div','li'+(mine?' me':''));
      li.appendChild(el('span','rk',String(i+1)));
      var g=el('span','grow');
      var pic=acctTab?safePic(r.picture):'';
      if(pic){var im=document.createElement('img');im.src=pic;im.alt='';im.width=22;im.height=22;im.referrerPolicy='no-referrer';im.style.cssText='border-radius:50%;vertical-align:middle;margin-right:8px';g.appendChild(im);}
      g.appendChild(document.createTextNode(r.name+(mine?' (you)':'')));
      li.appendChild(g);li.appendChild(el('b',null,String(r.elo)));
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
function openProfile(){
  var box=el('div');
  box.innerHTML='<h2 style="margin:0 0 6px;font-family:var(--head)">Profile</h2><div id="acct-box" style="margin:0 0 12px"></div><p class="muted" style="margin:0 0 6px">'+(ACCT?'Your name appears on the leaderboard.':'No account needed to play. Friends see your nickname.')+'</p><label class="l" for="i-name">Nickname</label><input id="i-name" type="text" maxlength="18"><label class="l">Board</label><div class="sw" id="sw-board"></div><label class="l">Sound</label><div class="pills" id="sw-sound"></div><label class="l">Fisher’s language / Wika ni Fisher</label><div class="pills" id="sw-lang"></div><div class="row" style="margin-top:16px"><button class="btn pri" id="b-savename">Save</button><button class="btn" id="b-cancel">Cancel</button></div>';
  modal(box);var inp=$('#i-name');inp.value=ME.name;
  var ab=$('#acct-box');
  if(ACCT){
    var row=el('div','row');row.style.cssText='align-items:center;gap:10px;flex-wrap:nowrap';
    var pic=safePic(ACCT.picture),av;
    if(pic){av=document.createElement('img');av.src=pic;av.alt='';av.width=36;av.height=36;av.referrerPolicy='no-referrer';av.style.borderRadius='50%';}
    else{av=el('span','av',(ACCT.name||'?').charAt(0).toUpperCase());}
    var who=el('div','grow');who.innerHTML='<b></b><div class="muted" style="font-size:12px">Signed in with Google</div>';who.querySelector('b').textContent=ACCT.name||'Player';
    var so=el('button','btn','Sign out');so.addEventListener('click',signOut);
    row.appendChild(av);row.appendChild(who);row.appendChild(so);ab.appendChild(row);
  }else if(GCFG.googleClientId){
    var gb=el('div');gb.style.minHeight='44px';ab.appendChild(gb);
    var hint=el('div','muted','Sign in with Google to keep your rating on every device and join the Google accounts leaderboard.');hint.style.cssText='font-size:12px;margin-top:6px';ab.appendChild(hint);
    renderGoogleButton(gb);
  }else if(CFG.mode==='server'){
    var nn=el('div','notice','Google sign-in is not set up on this server yet.');ab.appendChild(nn);
  }
  var board=SET.board,sound=SET.sound,lang=SET.lang;
  function drawSw(){
    var sb=$('#sw-board');sb.innerHTML='';
    BOARDS.forEach(function(b){var x=el('button');x.type='button';x.title=b.n;x.setAttribute('aria-label',b.n+' board');x.setAttribute('aria-pressed',String(board===b.id));x.style.setProperty('--x',b.x);x.style.setProperty('--y',b.y);x.innerHTML='<i></i><i></i><i></i><i></i>';x.addEventListener('click',function(){board=b.id;document.documentElement.setAttribute('data-board',board);drawSw();});sb.appendChild(x);});
    var sl=$('#sw-lang');sl.innerHTML='';
    [['English','en'],['Tagalog','tl']].forEach(function(o){var x=el('button','pill',o[0]);x.type='button';x.setAttribute('aria-pressed',String(lang===o[1]));x.addEventListener('click',function(){lang=o[1];drawSw();});sl.appendChild(x);});
    var ss=$('#sw-sound');ss.innerHTML='';
    [['On',true],['Off',false]].forEach(function(o){var x=el('button','pill',o[0]);x.type='button';x.setAttribute('aria-pressed',String(sound===o[1]));x.addEventListener('click',function(){sound=o[1];drawSw();});ss.appendChild(x);});
  }
  drawSw();
  function save(){var n=cleanName(inp.value);if(n){ME.name=n;saveMe();pushProfile();}SET.board=board;SET.sound=sound;var lc=SET.lang!==lang;SET.lang=lang;applySettings();closeModal();if(lc&&G&&G.mode==='bot'&&G.sayKind)G.say=C.say(G.sayKind,G.bot.level,lang);renderHome();if(G&&view==='game')renderGame();if(RV&&view==='review')renderReview();}
  $('#b-savename').addEventListener('click',save);
  $('#b-cancel').addEventListener('click',function(){document.documentElement.setAttribute('data-board',SET.board);closeModal();});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')save();});
}
$('#chip').addEventListener('click',openProfile);
$('#b-startbot').addEventListener('click',function(){
  var col=UI.color==='random'?(Math.random()<.5?0:1):(UI.color==='w'?0:1);
  SET.coach=UI.coach;applySettings();
  newGame({mode:'bot',myColor:col,level:UI.level,tc:UI.tc,coach:UI.coach});
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
    players:{w:null,b:null},thinking:false,drawBy:'',online:null,delta:null,animate:false,pm:[]};
  if(o.mode==='bot'){
    var L=E.LEVELS[o.level];
    G.bot={level:o.level};G.botColor=1-o.myColor;G.botElo=EN.effElo(o.level);G.coach=o.coach!==false;G.coachNote=null;setSay('start');
    var me={name:ME.name,elo:ME.elo},bt={name:'Fisher · '+L.name,elo:G.botElo,bot:true};
    G.players=o.myColor===0?{w:me,b:bt}:{w:bt,b:me};
  }else if(o.mode==='local'){G.players={w:{name:'White',elo:null},b:{name:'Black',elo:null}};}
  if(!GB)GB=new Board($('#board'),{targets:gTargets,onMove:gUserMove});
  go('game');renderGame();startTick();
  if(o.mode==='bot')botTurn();
}
function teardownGame(){
  if(G&&G._pmT){clearTimeout(G._pmT);G._pmT=0;}
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
  if(!myTurn())return canPremove()?pmTargets(sq):[];
  var p=G.pos.b[sq];if(!p||(p>>3)!==G.pos.side)return [];
  var ms=legalMap()[sq]||[],seen={},out=[];
  ms.forEach(function(m){var t=(m>>7)&127;if(!seen[t]){seen[t]=1;out.push(t);}});
  return out;
}
function gUserMove(from,to){
  if(!myTurn()){if(canPremove())addPremove(from,to);return;}
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

/* ---------- premoves ----------
   While the other side is thinking you can queue several moves in a row. Each one is picked on a "projected" board where
   the earlier ones have already been played, so a second premove starts from where the first piece will be. When it is your
   turn the first premove is played if it is legal; if it is not (the position changed), the whole queue is dropped. */
var KNO=[-33,-31,-18,-14,14,18,31,33],KGO=[-17,-16,-15,-1,1,15,16,17],BDO=[-17,-15,15,17],RDO=[-16,-1,1,16];
function canPremove(){
  if(!G||G.status!=='active'||G.myColor===null||G.myColor===undefined)return false;
  if(G.mode!=='bot'&&G.mode!=='online')return false;
  if(G.mode==='online'&&!(G.players.w&&G.players.b))return false;
  return G.pos.side!==G.myColor;
}
function pmApply(p,pm){
  var b=p.b,pc=b[pm.f];if(!pc)return false;
  var t=pc&7,col=pc>>3,f=pm.f,to=pm.t;
  if(t===6&&Math.abs((to&7)-(f&7))===2){
    var rk=f&0x70;
    if(to>f){b[rk+5]=b[rk+7];b[rk+7]=0;}else{b[rk+3]=b[rk+0];b[rk+0]=0;}
  }
  if(t===1&&(f&7)!==(to&7)&&!b[to]&&to===p.ep)b[col?to-16:to+16]=0;
  b[to]=pm.promo?(pm.promo|(col<<3)):pc;b[f]=0;p.ep=-1;
  if(t===6)p.cast&=col?~12:~3;
  [[0,8],[7,4],[112,2],[119,1],[4,12],[116,3]].forEach(function(c){if(c[0]===f||c[0]===to)p.cast&=~c[1];});
  return true;
}
function projPos(){
  var p=new E.Pos().setFen(G.pos.fen());
  p.side=G.myColor;
  for(var i=0;i<G.pm.length;i++)pmApply(p,G.pm[i]);
  return p;
}
function pmTargets(sq){
  var p=projPos(),b=p.b,pc=b[sq],me=G.myColor;
  if(!pc||(pc>>3)!==me)return [];
  var t=pc&7,out=[],i,d,s;
  function free(x){return !(x&0x88)&&(!b[x]||(b[x]>>3)!==me);}
  function none(x){return !(x&0x88)&&!(b[x]&&(b[x]>>3)===me);}
  if(t===1){
    var dir=me?16:-16,home=me?1:6;
    s=sq+dir;if(none(s)){out.push(s);if((sq>>4)===home&&none(s+dir))out.push(s+dir);}
    [-1,1].forEach(function(o){var x=sq+dir+o;if(free(x))out.push(x);});
  }else if(t===2){for(i=0;i<8;i++){s=sq+KNO[i];if(free(s))out.push(s);}}
  else if(t===6){
    for(i=0;i<8;i++){s=sq+KGO[i];if(free(s))out.push(s);}
    var hm=me?4:116,rk=me?0:112;
    if(sq===hm){
      if((p.cast&(me?4:1))&&b[rk+7]===(4|(me<<3))&&none(rk+5)&&none(rk+6))out.push(rk+6);
      if((p.cast&(me?8:2))&&b[rk]===(4|(me<<3))&&none(rk+1)&&none(rk+2)&&none(rk+3))out.push(rk+2);
    }
  }else{
    var dirs=t===3?BDO:(t===4?RDO:BDO.concat(RDO));
    for(i=0;i<dirs.length;i++){
      d=dirs[i];s=sq+d;
      /* own pieces block the way; the other side's pieces may still move, so they do not */
      while(!(s&0x88)){if(b[s]&&(b[s]>>3)===me)break;out.push(s);s+=d;}
    }
  }
  return out;
}
function pmLabel(){
  /* short text for each queued premove, built on the projected board */
  var p=new E.Pos().setFen(G.pos.fen()),out=[];
  p.side=G.myColor;
  G.pm.forEach(function(m){
    var pc=p.b[m.f],t=pc&7,cap=!!p.b[m.t]||(t===1&&(m.f&7)!==(m.t&7));
    var s;
    if(t===6&&Math.abs((m.t&7)-(m.f&7))===2)s=m.t>m.f?'O-O':'O-O-O';
    else s=(t===1?(cap?FILES[m.f&7]:''):['','','N','B','R','Q','K'][t])+(cap?'x':'')+E.sqName(m.t)+(m.promo?'='+['','','N','B','R','Q'][m.promo]:'');
    out.push(s);pmApply(p,m);
  });
  return out;
}
function addPremove(from,to){
  if(!canPremove())return;
  if(pmTargets(from).indexOf(to)<0)return;
  if(G.pm.length>=8){toast(L('That is enough premoves for now.','Sapat na ang mga premove sa ngayon.'));renderGame();return;}
  var p=projPos(),pc=p.b[from],lastRow=G.myColor?7:0;
  function push(promo){if(!canPremove())return;G.pm.push({f:from,t:to,promo:promo||0});snd('move');renderGame();}
  if((pc&7)===1&&(to>>4)===lastRow){
    var box=el('div'),hh=el('h2','',L('Promote to','I-promote bilang'));hh.style.cssText='margin:0 0 14px;font-family:var(--head);text-align:center';box.appendChild(hh);
    var row=el('div','promo');
    [5,4,3,2].forEach(function(t){var b=el('button',G.myColor?'b':'w',GLY[t]+'︎');b.setAttribute('aria-label',L('Promote to ','I-promote bilang ')+['','','knight','bishop','rook','queen'][t]);b.addEventListener('click',function(){closeModal();push(t);});row.appendChild(b);});
    box.appendChild(row);modal(box,false);return;
  }
  push(0);
}
function clearPremoves(quiet){
  if(!G||!G.pm||!G.pm.length)return;
  G.pm=[];if(GB){GB.sel=-1;GB.targets=[];}
  renderGame();if(!quiet)toast(L('Premoves cleared','Nabura ang mga premove'));
}
function runPremove(){
  if(!G||!G.pm.length||!myTurn())return;
  var pm=G.pm[0],ms=(legalMap()[pm.f]||[]).filter(function(m){return ((m>>7)&127)===pm.t&&(!pm.promo||((m>>14)&7)===pm.promo);});
  if(!ms.length){G.pm=[];toast(L('Premove cancelled: it is no longer legal.','Nakansela ang premove: hindi na ito legal.'));renderGame();return;}
  G.pm.shift();
  if(GB)GB.skipAnim=true; /* the piece was already shown on its square */
  try{playerMove(ms[0]);}finally{if(GB)GB.skipAnim=false;}
}
function schedulePremove(){
  if(!G||!G.pm.length||G._pmT||!myTurn())return;
  var g=G;g._pmT=setTimeout(function(){g._pmT=0;if(G===g)runPremove();},70);
}
function playerMove(m){
  if(!myTurn())return;
  var fenBefore=G.pos.fen(),ucisBefore=G.ucis.length;
  commitMove(m,false);
  if(G.mode==='online'){
    var patch={moves:G.ucis.slice(),updated:Date.now(),wt:G.t.w,bt:G.t.b,at:G.t.at,drawBy:''};
    if(G.status==='over'){patch.status='finished';patch.result=G.result;patch.reason=G.reason;}
    pushOnline(patch);
  }
  if(G.mode==='bot'){
    if(G.coach&&G.status==='active')coachMove(fenBefore,ucisBefore).then(botTurn);
    else{if(G.coach)coachMove(fenBefore,ucisBefore);botTurn();}
  }
}
function commitMove(m,remote){
  var pos=G.pos,san=E.toSan(pos,m),uci=E.toUci(m),now=Date.now(),cap=!!(m&E.F_CAP);
  if(!remote&&G.clockOn&&G.ucis.length>=2){var mv=pos.side?'b':'w';G.t[mv]=Math.max(0,G.t[mv]-(now-G.t.at))+G.tc.i*1000;}
  var mover=pos.side;pos.make(m);G.moves.push(m);G.ucis.push(uci);G.sans.push(san);G.fens.push(pos.fen());G.keys.push(E.key(pos));
  G.last=[m&127,(m>>7)&127];G.animate=true;
  if(!remote)G.t.at=now;
  var st=E.status(pos,G.keys),chk=pos.inCheck();
  if(!st.over)snd(chk?'check':(cap?'capture':'move'));
  if(G.mode==='bot'&&!st.over)tableTalk(mover===G.botColor,cap,chk);
  if(st.over&&G.status==='active')finish(st.result,st.reason);else renderGame();
  return st;
}
/* Fisher's table talk: a short line now and then, in a tone that fits the level */
function tableTalk(byBot,cap,chk){
  var lv=G.bot.level,kind=null;
  if(byBot){if(chk)kind='botCheck';else if(cap&&Math.random()<.75)kind='botCapture';}
  else{if(cap&&Math.random()<.8)kind='playerCapture';else if(chk&&Math.random()<.6)kind='playerCheck';}
  if(!kind&&byBot&&G.ucis.length%10===0&&Math.random()<.6)kind='idle';
  if(kind)setSay(kind);
}
/* the coach explains the player's own move while the game is on (the player can switch it on or off) */
async function coachMove(fenBefore,plyBase){
  var g=G;if(!g||!g.coach||g.mode!=='bot')return;
  var uci=g.ucis[g.ucis.length-1],fenAfter=g.pos.fen();
  g.coachNote={busy:true};renderCoachBox();
  try{
    var res=await A.analyze({fens:[fenBefore,fenAfter],ucis:[uci],my:g.myColor},EN,null,{ms:260,plyBase:plyBase});
    if(G!==g||!g.coach)return;
    var o=res&&res.out&&res.out[0];
    g.coachNote=o?{o:o,opening:res.opening&&res.opening[1]}:null;
  }catch(e){if(G===g)g.coachNote=null;}
  if(G===g)renderCoachBox();
}
function renderSay(){
  var box=$('#g-say');if(!box)return;
  if(!G||G.mode!=='bot'||!G.say){box.hidden=true;return;}
  box.hidden=false;
  box.innerHTML='<div class="fav">'+C.svg(46)+'</div><div class="fbub"><div class="who">'+esc(L('Fisher says','Sabi ni Fisher'))+'</div><div class="txt">'+esc(G.say)+'</div></div>';
}
function renderCoachBox(){
  var box=$('#g-coach');if(!box)return;
  if(!G||G.mode!=='bot'||!G.coach){box.hidden=true;return;}
  box.hidden=false;
  var n=G.coachNote,h='<div class="who whorow"><span>'+esc(L('Fisher · Coach','Fisher · Coach'))+'</span>'+langSwitchHtml()+'</div>';
  if(!n)h+='<p class="note" style="margin:0">'+esc(L('Make a move and I’ll tell you how it was.','Gumalaw ka at sasabihin ko kung kumusta ang galaw mo.'))+'</p>';
  else if(n.busy)h+='<p class="note" style="margin:0">'+esc(L('Looking at your move…','Sinusuri ang galaw mo…'))+'</p>';
  else{
    var o=n.o,x=loc(o);
    h+='<div class="bh">'+dotHtml(o.cls)+'<b>'+esc(moveHead(o.san,o.cls))+'</b></div>';
    if(n.opening)h+='<div class="opn">📖 '+esc(n.opening)+'</div>';
    h+='<p class="note">'+esc(x.note)+'</p>'+(x.tip?'<p class="tip">💡 '+esc(x.tip)+'</p>':'');
  }
  box.innerHTML=h;bindLang(box);
}
async function botTurn(){
  var g=G;if(!g||g.status!=='active'||g.mode!=='bot'||g.pos.side!==g.botColor)return;
  g.thinking=true;renderStatus();
  var t0=Date.now(),r=await EN.bot(g.pos.fen(),g.bot.level);
  await sleep(Math.max(0,500-(Date.now()-t0)));
  if(G!==g||g.status!=='active')return;
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
  G.status='over';G.result=result;G.reason=reason;G.thinking=false;G.pm=[];
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
  if(G.mode==='bot'&&G.myColor!==null){var bw=result!=='1/2-1/2'&&((result==='1-0')===(G.botColor===0));setSay(result==='1/2-1/2'?'draw':(bw?'win':'lose'));}
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
    var f=el('div','resf'),av=el('div');av.style.width='64px';av.innerHTML=C.svg(64);f.appendChild(av);f.appendChild(el('div','fsays',C.result(kind,SET.lang)));box.appendChild(f);
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
  var pmOn=canPremove(),hasPm=pmOn&&G.pm.length>0;
  if(G.status!=='active'&&G.pm.length)G.pm=[];
  GB.flip=G.flip;GB.interactive=myTurn()||pmOn;
  var chk=G.status==='active'&&!hasPm&&G.pos.inCheck()?G.pos.ksq[G.pos.side]:-1;
  if(!GB.interactive||GB._fl!==G.gid+':'+G.fens.length){GB.sel=-1;GB.targets=[];}
  GB._fl=G.gid+':'+G.fens.length;
  GB.render(hasPm?projPos():G.pos,{last:G.last,check:chk,animate:G.animate&&!hasPm,pm:hasPm?G.pm:null});G.animate=false;
  renderMoves();renderStatus();renderSay();renderCoachBox();renderCtrl();updateClocks();
  schedulePremove();
}
function updateClocks(){
  if(!G||!G.clockOn)return;
  var run=runningSide();
  $$('#v-game .clock').forEach(function(c){var s=c.dataset.side,ms=remaining(s);c.textContent=fmt(ms);c.className='clock'+(run===s?' on':'')+(ms<20000?' low':'');});
}
function bookRun(){
  /* plies that are still inside a known opening (an unbroken run from the start position) */
  var names=[],ok=true;
  for(var i=0;i<G.sans.length;i++){
    var nm=ok&&window.GCO?GCO.lookup(G.fens[i+1]):null;
    if(!nm)ok=false;names.push(nm);
  }
  return names;
}
function renderMoves(){
  var box=$('#g-moves'),h='',bk=bookRun();
  function mv(i){
    if(i>=G.sans.length)return '<span class="m"></span>';
    return '<span class="m">'+esc(G.sans[i])+(bk[i]?'<span class="bk" title="Book move: '+esc(bk[i])+'">📖</span>':'')+'</span>';
  }
  for(var i=0;i<G.sans.length;i+=2)h+='<div class="mv"><span class="n">'+(i/2+1)+'.</span>'+mv(i)+mv(i+1)+'</div>';
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
    if(G.thinking)txt=L('Fisher is thinking…','Nag-iisip si Fisher…');
    else if(G.mode==='local'||G.myColor===null)txt=side+' to move';
    else txt=G.pos.side===G.myColor?'Your move':(G.mode==='bot'?L('Waiting for Fisher…','Hinihintay si Fisher…'):'Waiting for opponent…');
    h='<div class="status">'+txt+(G.pos.inCheck()?'<small>Check</small>':'')+'</div>';
    if(G.drawBy&&G.myColor!==null&&G.drawBy!==(G.myColor===0?'w':'b'))h+='<div class="row" style="margin-top:10px"><span>Opponent offers a draw</span><button class="btn pri" id="b-acc">Accept</button><button class="btn" id="b-dec">Decline</button></div>';
  }
  if(canPremove()){
    if(G.pm.length)h+='<div class="pmbar"><span class="pmt"><b>'+esc(L('Premoves','Premoves'))+'</b> '+esc(pmLabel().join(' → '))+'</span><button class="btn" id="b-pmclear" type="button">'+esc(L('Clear','Burahin'))+'</button></div>';
    else if(G.mode==='bot'||G.mode==='online')h+='<div class="pmhint">'+esc(L('You can premove while you wait. Queue as many moves as you like; right-click or press Esc to cancel.','Puwede kang mag-premove habang naghihintay. Magpila ng kasing-dami ng galaw; right-click o pindutin ang Esc para ikansela.'))+'</div>';
  }
  var bkn=bookRun(),op=null;for(var q=bkn.length-1;q>=0;q--){if(bkn[q]){op=bkn[q];break;}}
  if(op&&G.status!=='over'&&!(G.mode==='online'&&!(G.players.w&&G.players.b)))h+='<div class="gopen"><span>📖</span><span>Opening: <b>'+esc(op)+'</b></span></div>';
  b.innerHTML=h;
  var pc=$('#b-pmclear');if(pc)pc.addEventListener('click',function(){clearPremoves();});
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
  if(G.mode==='bot')add(L('Coach: ','Coach: ')+(G.coach?L('On','Bukas'):L('Off','Sarado')),'',function(){G.coach=!G.coach;SET.coach=G.coach;applySettings();if(G.coach&&!G.coachNote)G.coachNote=null;renderCoachBox();renderCtrl();});
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
    status:'active',result:null,reason:null,tc:TCS[0],clockOn:false,t:{w:0,b:0,at:Date.now()},flip:false,players:{w:null,b:null},thinking:false,drawBy:'',delta:null,animate:false,online:{code:code},pm:[]};
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
  RV={src:src,ply:0,res:null,progress:0,flip:src.my===1,showBest:false,prev:0,glideFrom:new E.Pos().setFen(src.fens[src.fens.length-1])};
  $('#rv-empty').hidden=true;$('#rv-main').hidden=false;
  if(!RB)RB=new Board($('#rboard'),{targets:function(){return [];},onMove:function(){}});
  go('review');
  var rv=RV;
  A.analyze(Object.assign({},src),EN,function(a,b){
    if(rv!==RV)return;rv.progress=a/b;
    var p=$('#prog');if(p)p.style.width=(rv.progress*100)+'%';
    var t=$('#progtxt');if(t)t.textContent=L('Reading position '+a+' of '+b+'…','Binabasa ang posisyon '+a+' sa '+b+'…');
  },{ms:160,cancel:function(){return rv!==RV;}})
  .then(function(res){if(rv!==RV||!res)return;rv.res=res;renderReview();})
  .catch(function(){toast('Analysis failed. Try again.');});
}
function revGo(p){if(!RV)return;var n=RV.src.ucis.length,np=Math.max(0,Math.min(n,p));if(Math.abs(np-RV.ply)>1)RV.glideFrom=new E.Pos().setFen(RV.src.fens[RV.ply]);RV.prev=RV.ply;RV.ply=np;RV.showBest=false;renderReview();}
$$('[data-nav]').forEach(function(b){b.addEventListener('click',function(){
  if(!RV)return;var n=RV.src.ucis.length,a=b.dataset.nav;
  if(a==='start')revGo(0);else if(a==='prev')revGo(RV.ply-1);else if(a==='next')revGo(RV.ply+1);else if(a==='end')revGo(n);else if(a==='flip'){RV.flip=!RV.flip;renderReview();}
});});
$('#b-best').addEventListener('click',function(){if(!RV)return;RV.showBest=!RV.showBest;renderReview();});
function dotHtml(cls,big){return '<span class="dot '+CLS_CSS[cls]+'" title="'+esc(lbl(cls))+'">'+esc(A.SYM[cls])+'</span>';}
function renderCoach(o,ply){
  var rv=RV,res=rv.res,b=$('#bubble');if(!b)return;
  var h='<div class="who whorow"><span>Fisher &middot; Coach</span>'+langSwitchHtml()+'</div>';
  if(!res){
    h+='<div class="bh"><b>'+esc(L('Studying the tides…','Binabasa ang agos…'))+'</b></div><div class="prog"><i id="prog" style="width:'+(rv.progress*100)+'%"></i></div><p class="note" id="progtxt">'+esc(L('Reading the game…','Binabasa ang laro…'))+'</p>';
  }else if(ply===0){
    var it=C.intro(SET.lang);
    h+='<div class="bh"><b>'+esc(L('Starting position','Panimulang posisyon'))+'</b><span class="evchip">'+esc(A.evalText(res.evalPos[0]))+'</span></div><p class="poem">'+esc(it.poem)+'</p><p class="note">'+esc(it.note)+'</p>';
  }else{
    var x=loc(o);
    h+='<div class="bh">'+dotHtml(o.cls)+'<b>'+esc(moveHead(o.san,o.cls))+'</b><span class="evchip">'+esc(A.evalText(res.evalPos[ply]))+'</span></div>'+(res.opening&&res.opening[ply]?'<div class="opn">📖 '+esc(res.opening[ply])+'</div>':'')+'<p class="poem">'+esc(x.poem)+'</p><p class="note">'+esc(x.note)+'</p>'+(x.tip?'<p class="tip">💡 '+esc(x.tip)+'</p>':'');
  }
  b.innerHTML=h;bindLang(b);
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
  RB.render(pos,{last:mvObj?[mvObj&127,(mvObj>>7)&127]:null,check:pos.inCheck()?pos.ksq[pos.side]:-1,arrows:arrows,badge:o?{sq:(mvObj>>7)&127,cls:o.cls}:null,animate:ply===rv.prev+1,glide:rv.glideFrom});rv.glideFrom=null;
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
    var fo=res.opening&&res.opening[n];if(fo)h+='<div class="gopen" style="margin-top:10px"><span>📖</span><span>Opening: <b>'+esc(fo)+'</b></span></div>';
    h+='<div class="engtag" style="margin-top:10px">Engine: '+esc(res.engine||'built-in')+(res.depth?' · depth '+res.depth:'')+'</div></div>';
    h+='<div class="card"><svg class="graph" id="graph" viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="Evaluation graph. Click to jump to a move."></svg></div>';
    var cw=res.counts[0],cb=res.counts[1];
    h+='<div class="card"><table class="cnt"><tbody>';
    A.ORDER.forEach(function(k){h+='<tr><td><span class="k">'+dotHtml(k)+esc(lbl(k))+'</span></td><td>'+(cw[k]||0)+'</td><td>'+(cb[k]||0)+'</td></tr>';});
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
