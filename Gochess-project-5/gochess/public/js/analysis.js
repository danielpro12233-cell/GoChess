/* Game review: rates every move from engine evaluations and lets Fisher explain it. */
var GCA=(function(E,C){
'use strict';
var MATE=E.MATE,VAL=E.VAL,I=GCI,O=(typeof GCO!=='undefined')?GCO:null;
var PN=['','pawn','knight','bishop','rook','queen','king'];
var LABEL={brilliant:'Brilliant',great:'Great move',best:'Best move',excellent:'Excellent',good:'Good',book:'Book move',inaccuracy:'Inaccuracy',mistake:'Mistake',miss:'Miss',blunder:'Blunder'};
var SYM={brilliant:'!!',great:'!',best:'★',excellent:'✓',good:'✓',book:'📖',inaccuracy:'?!',mistake:'?',miss:'✕',blunder:'??'};
var ORDER=['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder'];

function winP(cp){
  if(cp>=MATE-100)return 100;
  if(cp<=-MATE+100)return 0;
  return 50+50*(2/(1+Math.exp(-0.00368208*cp))-1);
}
function evalText(cpW){
  if(Math.abs(cpW)>=MATE-100){var n=Math.ceil((MATE-Math.abs(cpW))/2);return (cpW>0?'':'-')+'M'+n;}
  return (cpW>=0?'+':'')+(cpW/100).toFixed(2);
}
function mateIn(score){return Math.ceil((MATE-Math.abs(score))/2);}
function accuracy(loss){var a=103.1668*Math.exp(-0.04354*loss)-3.1669;return Math.max(0,Math.min(100,a));}
function pct(x){return Math.round(x)+'%';}
function article(w){return /^[aeiou]/i.test(w)?'an':'a';}

function describe(pos,m,score){
  var from=m&127,to=(m>>7)&127,p=pos.b[from],t=p&7,capt=(m&E.F_EP)?1:(pos.b[to]&7),promo=(m>>14)&7;
  if(score!==null&&score>=MATE-100)return 'it leads to checkmate in '+mateIn(score);
  var gives=false;pos.make(m);gives=pos.inCheck();pos.unmake();
  if(promo)return 'it promotes the pawn to '+article(PN[promo])+' '+PN[promo];
  if(m&E.F_CASTLE)return 'it gets the king to safety and wakes up the rook';
  if(capt)return 'it wins '+article(PN[capt])+' '+PN[capt]+(gives?' with check':'');
  if(gives)return 'it gives check and keeps the pressure on';
  var home=(p>>3)?0:7;
  if((t===2||t===3)&&(from>>4)===home)return 'it brings the '+PN[t]+' into the game';
  return null;
}

/* who: subject and possessive words for the side that moved (O = the other side's possessive, me = the viewer's own move) */
function who(side,pov){
  if(pov===0||pov===1)return side===pov?{S:'You',P:'your',O:'your opponent’s',me:true}:{S:'Your opponent',P:'their',O:'your',me:false};
  return side===0?{S:'White',P:'White’s',O:'Black’s',me:true}:{S:'Black',P:'Black’s',O:'White’s',me:true};
}
function threatLine(info,w){
  var r=info.reply;if(!r||!r.uci)return null;
  var posA=info.posAfter,m=E.fromUci(posA,r.uci);if(!m)return null;
  var rs=E.toSan(posA,m),to=(m>>7)&127,capt=(m&E.F_EP)?1:(posA.b[to]&7);
  if(r.score>=MATE-100)return rs.slice(-1)==='#'?'That lets them play '+rs+', and that is checkmate.':'That lets them play '+rs+', and checkmate is coming in '+mateIn(r.score)+'.';
  if(capt){
    if(to===info.to&&info.hung)return 'The '+PN[info.pt]+' on '+E.sqName(info.to)+' isn’t protected well enough, so '+rs+' simply takes it.';
    return 'That lets them play '+rs+' and win '+w.P+' '+PN[capt]+' on '+E.sqName(to)+'.';
  }
  var gives=false;posA.make(m);gives=posA.inCheck();posA.unmake();
  if(gives)return 'That lets them play '+rs+' with check and take over the initiative.';
  return 'After '+rs+', '+(w.S==='You'?'your opponent':'the other side')+' is in control.';
}
function betterLine(info){
  if(!info.bestSan||info.isBest)return '';
  var d=describe(info.posBefore,info.bestMove,info.scoreBefore);
  return ' '+info.bestSan+' was better'+(d?': '+d+'.':', it keeps things safer.');
}
function swing(info){return ' Your winning chances dropped from '+pct(info.before)+' to '+pct(info.after)+'.';}

var BOOK_SAYS=['A well-known opening move, so you’re on safe ground.','Lots of strong players have played this one, so you can trust it.','You’re still following the usual path of this opening.'];
var TIPS={
  hang:'Remember to protect your pieces, and don’t give your opponent free pieces. Before you move, check that nothing is left hanging.',
  ignored:'Before you move, check what your opponent just left hanging. Free pieces win games.',
  queen:'Bring out your knights and bishops first. The queen can wait.',
  repeat:'In the opening, give each piece one good move before moving any of them twice.',
  generic:'Before you move, ask yourself: what is my opponent threatening, and are all my pieces protected?',
  trapMine:'Pieces with few safe squares are easy targets. Always look for a way to trap your opponent’s queen and other big pieces.',
  trapTheirs:'Before you move your queen or a rook, make sure it still has a safe square to go back to.',
  forkMine:'Look for forks: one move that attacks two pieces at once usually wins material.',
  forkTheirs:'Before each move, check if a knight or pawn could attack two of your pieces at once.',
  pinMine:'A pinned piece cannot move without exposing something more valuable. Keep adding pressure to it.',
  pinTheirs:'Try not to leave a piece in front of your king or queen on the same line as an enemy bishop or rook.',
  free:'Always check if your opponent’s pieces are protected. An unprotected piece is a free gift.',
  aware:'Good habit! Always check if your pieces are under attack before you move.',
  book:'Opening basics: control the center, bring out your pieces, and castle early.',
  open:'In the opening, fight for the center, bring out your knights and bishops, and castle early.'
};
function sqn(s){return E.sqName(s);}
function onsq(pos,sq){return PN[pos.b[sq]&7]+' on '+sqn(sq);}
/* the main idea of a good move: {t: sentence, tip, big} or null */
function positive(info,w,mo){
  var B=info.posBefore,A=info.posAfter,S=w.S;
  if(!mo)return null;
  var mate=false;try{mate=A.inCheck()&&A.legal(false).length===0;}catch(e){}
  if(mate)return {big:true,t:'Checkmate! The king has nowhere to go.',tip:w.me?'Nicely finished. Always look at every check, capture and threat before you move.':''};
  if(mo.trap){
    var q=mo.trap.t===5;
    return {big:true,t:S+' cornered '+w.O+' '+PN[mo.trap.t]+' on '+sqn(mo.trap.sq)+'. It’s under attack and has nowhere safe to run'+(q?', and the queen is the strongest piece on the board':'')+'.',tip:w.me?TIPS.trapMine:TIPS.trapTheirs};
  }
  if(mo.fork){
    var a=mo.fork[0],b=mo.fork[1];
    return {big:true,t:S+' forked the '+PN[a.t]+' on '+sqn(a.sq)+' and the '+PN[b.t]+' on '+sqn(b.sq)+'. One move attacks both, so one of them is going to fall.',tip:w.me?TIPS.forkMine:TIPS.forkTheirs};
  }
  if(mo.pin&&mo.pin.px>=2)return {big:true,t:S+' pinned the '+PN[mo.pin.px]+' on '+sqn(mo.pin.pinned)+' to the '+PN[mo.pin.py]+' on '+sqn(mo.pin.target)+'. If it moves, something more valuable gets taken.',tip:w.me?TIPS.pinMine:TIPS.pinTheirs};
  if(mo.win){
    var cv=I.VAL[mo.win.t],mv=I.VAL[mo.t===6?1:mo.t];
    if(mo.win.free)return {big:true,t:S+' captured '+w.O+' '+PN[mo.win.t]+' on '+sqn(mo.win.sq)+', and nothing was protecting it. Free piece!',tip:w.me?TIPS.free:TIPS.hang};
    if(cv>mv+40)return {big:true,t:S+' captured '+w.O+' '+PN[mo.win.t]+' with a '+PN[mo.t]+' and came out ahead.',tip:w.me?TIPS.free:TIPS.hang};
    return {big:false,t:S+' captured '+w.O+' '+PN[mo.win.t]+' on '+sqn(mo.win.sq)+(cv<=mv-40?'. Fair trade, as long as you count the recapture.':', a fair trade.'),tip:''};
  }
  if(mo.escaped)return {big:false,t:'Nice! The '+PN[mo.escaped.t]+' on '+sqn(mo.escaped.sq)+' was under attack and this move gets it to safety.',tip:TIPS.aware};
  if(mo.saved)return {big:false,t:'Nice! The '+onsq(B,mo.saved.sq)+' was under attack and this move protects it.',tip:TIPS.aware};
  if(mo.threat)return {big:false,t:'This attacks the '+onsq(A,mo.threat.sq)+', and it isn’t protected well enough, so something has to give.',tip:''};
  if(mo.promo)return {big:true,t:S+' promoted the pawn to '+article(PN[mo.promo])+' '+PN[mo.promo]+'.',tip:''};
  if(mo.castle)return {big:false,t:'Castling gets the king to safety and brings the rook into the game.',tip:TIPS.open};
  if(mo.check)return {big:false,t:'Check! This keeps the pressure on.',tip:''};
  if(mo.develop)return {big:false,t:'Good, that brings the '+PN[mo.t]+' into the game.',tip:TIPS.open};
  if(mo.center)return {big:false,t:'Nice, taking space in the center gives your pieces more room.',tip:TIPS.open};
  return null;
}
/* what went wrong: {t: sentences, tip} */
function negative(info,w,mo){
  var parts=[],tip='';mo=mo||{};
  var tl=threatLine(info,w);
  if(tl){parts.push(tl);if(/protected|\bwin\b|simply takes/.test(tl))tip=TIPS.hang;}
  else if(mo.hangs&&mo.hangs.length){parts.push('This leaves the '+onsq(info.posAfter,mo.hangs[0].sq)+' hanging, so it can just be taken.');tip=TIPS.hang;}
  if(mo.ignored&&!info.missedCapture){parts.push('The '+onsq(info.posBefore,mo.ignored.sq)+' was left hanging, so it could have been taken for free.');tip=tip||TIPS.ignored;}
  if(mo.earlyQueen){parts.push('Bringing the queen out this early lets the other side chase her around and develop with tempo.');tip=tip||TIPS.queen;}
  if(mo.repeat){parts.push('Moving the same piece again wastes time. It’s usually better to bring out a new piece.');tip=tip||TIPS.repeat;}
  return {t:parts.join(' '),tip:tip||TIPS.generic};
}
function explain(cls,info,w){
  var S=w.S,mo=info.mo||null,pos=null,n,out={note:'',tip:''};
  try{pos=positive(info,w,mo);}catch(e){pos=null;}
  var praise=(pos&&pos.big&&w.me)?(cls==='brilliant'?'Brilliant! ':'Great move! '):'';
  switch(cls){
    case 'brilliant':
      out.note='Brilliant! '+S+' gave up '+article(PN[info.pt])+' '+PN[info.pt]+' on purpose, and it works out. That is very hard to spot.'+(pos&&pos.t?' '+pos.t:'');
      out.tip='A sacrifice only works if you can see what comes next. Before you give something up, check every reply.';break;
    case 'great':
      out.note='Great move! This was a tricky spot where most moves would have thrown the advantage away, and '+((S==='You')?'you':S)+' found the right one.'+(pos&&pos.t?' '+pos.t:'');
      out.tip=(pos&&pos.tip)||'In tricky positions, take a moment to look at every check, capture and threat before you decide.';break;
    case 'best':{
      var d=describe(info.posBefore,info.move,info.scoreBefore);
      out.note=pos?praise+pos.t:'This is the best move here'+(d?': '+d+'.':'.');
      out.tip=pos?pos.tip:'';break;}
    case 'excellent':
      out.note=(pos?praise+pos.t+' ':'')+'Almost as good as the best move'+(info.bestSan?' ('+info.bestSan+')':'')+'. Nothing much lost.';
      out.tip=pos?pos.tip:'';break;
    case 'good':
      out.note=(pos?pos.t+' ':'')+'A solid move.'+(info.bestSan?' '+info.bestSan+' was a tiny bit better, but this is fine.':'');
      out.tip=pos?pos.tip:'';break;
    case 'book':
      out.note='Book move'+(info.bookName?': '+info.bookName:'')+'. '+BOOK_SAYS[(info.ply||0)%BOOK_SAYS.length]+(pos&&pos.t&&!/Checkmate/.test(pos.t)?' '+pos.t:'');
      out.tip=TIPS.book;break;
    case 'inaccuracy':
      n=negative(info,w,mo);
      out.note='Not terrible, but there was a better move.'+(n.t?' '+n.t:'')+betterLine(info)+swing(info);out.tip=n.tip;break;
    case 'mistake':
      n=negative(info,w,mo);
      out.note='That’s a mistake.'+(n.t?' '+n.t:'')+betterLine(info)+swing(info);out.tip=n.tip;break;
    case 'blunder':
      n=negative(info,w,mo);
      out.note='Ouch, that’s a big mistake.'+(n.t?' '+n.t:'')+betterLine(info)+swing(info);out.tip=n.tip;break;
    case 'miss':{
      n=negative(info,w,mo);
      var lead=info.missedMate?S+' missed a forced checkmate!':(info.missedCapture?S+' missed a chance to win material.':(info.gift?'They slipped up, but '+((S==='White'||S==='Black')?S:S.toLowerCase())+' didn’t take advantage.':S+' missed a better move.'));
      out.note=lead+(n.t?' '+n.t:'')+betterLine(info)+swing(info);out.tip=info.missedCapture||info.gift?TIPS.ignored:n.tip;break;}
  }
  return out;
}

/* eng.analyze(fen, ms, multipv) -> {uci, score, lines:[{uci,score}], depth, engine} (score: side to move) */
async function analyze(R,eng,progress,cfg){
  cfg=cfg||{};
  var ms=cfg.ms||160,n=R.ucis.length,S=[],poss=[],moves=[],sans=[],i;
  for(i=0;i<=n;i++)poss.push(new E.Pos().setFen(R.fens[i]));
  for(i=0;i<n;i++){var mv=E.fromUci(poss[i],R.ucis[i]);moves.push(mv);sans.push(E.toSan(poss[i],mv));}
  var engineName='';
  for(i=0;i<=n;i++){
    var r=await eng.analyze(R.fens[i],ms,2);
    S.push(r);engineName=r.engine||engineName;
    if(progress)progress(i+1,n+1);
    if(cfg.cancel&&cfg.cancel())return null;
  }
  var out=[],pov=(R.my===0||R.my===1)?R.my:null;
  for(i=0;i<n;i++){
    var pos=poss[i],side=pos.side,m=moves[i],uci=R.ucis[i],cur=S[i],nxt=S[i+1];
    var scoreBefore=cur.score,scoreAfter=-nxt.score;
    var before=winP(scoreBefore),after=winP(scoreAfter);
    var bestUci=cur.uci||null,isBest=bestUci===uci;
    var loss=isBest?0:Math.max(0,before-after);
    var from=m&127,to=(m>>7)&127,pt=pos.b[from]&7,capt=(m&E.F_EP)?1:(pos.b[to]&7),promo=(m>>14)&7;
    var legalCount=pos.legal(false).length,posAfter=poss[i+1];
    var hung=posAfter.attacked(to,side^1)&&!posAfter.attacked(to,side);
    var prevLoss=i>0?out[i-1].loss:0,prevTo=i>0?((moves[i-1]>>7)&127):-1;
    var bestMove=bestUci?E.fromUci(pos,bestUci):0;
    var mo=null;
    try{mo=I.motifs(pos,m,posAfter,{ply:i+(cfg.plyBase||0),prevTo:i>1?((moves[i-2]>>7)&127):-1});}catch(e){mo=null;}
    var bookName=O?O.lookup(R.fens[i+1]):null;
    var info={ply:i,mo:mo,bookName:bookName,posBefore:pos,posAfter:posAfter,move:m,to:to,pt:pt,before:before,after:after,loss:loss,scoreBefore:scoreBefore,
      bestMove:bestMove,bestSan:bestMove?E.toSan(pos,bestMove):null,isBest:isBest,reply:nxt,hung:hung,
      gift:prevLoss>=10,missedMate:false,missedCapture:false,second:null};
    var cls;
    if(isBest||loss<=0.3)cls='best';else if(loss<=2)cls='excellent';else if(loss<=5)cls='good';else if(loss<=10)cls='inaccuracy';else if(loss<=20)cls='mistake';else cls='blunder';
    if(!isBest&&loss>=10){
      info.missedMate=scoreBefore>=MATE-100&&scoreAfter<MATE-100;
      if(bestMove&&(bestMove&E.F_CAP)){
        var bc=(bestMove&E.F_EP)?1:(pos.b[(bestMove>>7)&127]&7);
        info.missedCapture=VAL[bc]>=300&&VAL[capt]<VAL[bc];
      }
      if(loss<35&&(info.gift||info.missedMate||info.missedCapture))cls='miss';
    }
    if(loss<=3&&before<85&&after>=45&&pt!==6&&!promo){
      var matBefore=E.matNow(R.fens[i]),matAfter=-E.matQ(R.fens[i+1]);
      if(matAfter<=matBefore-150)cls='brilliant';
    }
    if(cls==='best'&&isBest&&legalCount>1&&before<=90&&after>=30&&!(capt&&to===prevTo)&&cur.lines&&cur.lines[1]){
      var sw=winP(cur.lines[1].score);
      if(before-sw>=15){cls='great';info.second=sw;}
    }
    /* a move that stays inside a known opening (and is not a real error) is a book move */
    if(bookName&&loss<=15)cls='book';
    var w=who(side,pov),ex=explain(cls,info,w);
    out.push({cls:cls,san:sans[i],uci:uci,bestSan:info.bestSan,bestUci:bestUci,loss:cls==='book'?0:loss,before:before,after:after,book:cls==='book'?bookName:null,
      evalW:(side===0?1:-1)*scoreAfter,poem:C.poem(cls,i*7+(side+3),sans[i]),note:ex.note,tip:ex.tip,side:side});
  }
  var evalPos=[],win=[];
  for(i=0;i<=n;i++){var e=(poss[i].side===0?1:-1)*S[i].score;evalPos.push(e);win.push(winP(e));}
  /* opening name at every position: the latest book name reached so far */
  var opening=[null],cur0=null;
  for(i=0;i<n;i++){if(out[i].book)cur0=out[i].book;opening.push(cur0);}
  var acc=[[],[]],counts=[{},{}],depth=0;
  out.forEach(function(o){acc[o.side].push(accuracy(o.loss));counts[o.side][o.cls]=(counts[o.side][o.cls]||0)+1;});
  S.forEach(function(s){if(s.depth>depth)depth=s.depth;});
  var avg=function(a){return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null;};
  return {opening:opening,S:S,out:out,evalPos:evalPos,win:win,acc:[avg(acc[0]),avg(acc[1])],counts:counts,sans:sans,moves:moves,engine:engineName,depth:depth};
}
return {analyze:analyze,winP:winP,evalText:evalText,LABEL:LABEL,SYM:SYM,ORDER:ORDER,accuracy:accuracy,article:article};
})(GCE,GCCoach);
