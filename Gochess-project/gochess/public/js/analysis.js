/* Game review: rates every move from engine evaluations and lets Fisher explain it. */
var GCA=(function(E,C){
'use strict';
var MATE=E.MATE,VAL=E.VAL;
var PN=['','pawn','knight','bishop','rook','queen','king'];
var LABEL={brilliant:'Brilliant',great:'Great move',best:'Best move',excellent:'Excellent',good:'Good',inaccuracy:'Inaccuracy',mistake:'Mistake',miss:'Miss',blunder:'Blunder'};
var SYM={brilliant:'!!',great:'!',best:'★',excellent:'✓',good:'✓',inaccuracy:'?!',mistake:'?',miss:'✕',blunder:'??'};
var ORDER=['brilliant','great','best','excellent','good','inaccuracy','mistake','miss','blunder'];

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
  if(score!==null&&score>=MATE-100)return 'it forces checkmate in '+mateIn(score);
  var gives=false;pos.make(m);gives=pos.inCheck();pos.unmake();
  if(promo)return 'it promotes the pawn to '+article(PN[promo])+' '+PN[promo];
  if(m&E.F_CASTLE)return 'it tucks the king away and brings the rook into play';
  if(capt)return 'it wins '+article(PN[capt])+' '+PN[capt]+(gives?' with check':'');
  if(gives)return 'it gives check and keeps the initiative';
  var home=(p>>3)?0:7;
  if((t===2||t===3)&&(from>>4)===home)return 'it develops the '+PN[t]+' to a more active square';
  return null;
}

/* who: subject and possessive words for the side that moved */
function who(side,pov){
  if(pov===0||pov===1)return side===pov?{S:'You',P:'your'}:{S:'Your opponent',P:'their'};
  return side===0?{S:'White',P:'White’s'}:{S:'Black',P:'Black’s'};
}
function threatLine(info,w){
  var r=info.reply;if(!r||!r.uci)return null;
  var posA=info.posAfter,m=E.fromUci(posA,r.uci);if(!m)return null;
  var rs=E.toSan(posA,m),to=(m>>7)&127,capt=(m&E.F_EP)?1:(posA.b[to]&7);
  if(r.score>=MATE-100)return rs.slice(-1)==='#'?'It allows '+rs+', which is checkmate.':'It allows '+rs+', and then checkmate in '+mateIn(r.score)+'.';
  if(capt){
    if(to===info.to&&info.hung)return 'The '+PN[info.pt]+' on '+E.sqName(info.to)+' is not protected enough, so '+rs+' wins it.';
    return 'It allows '+rs+', which wins '+w.P+' '+PN[capt]+' on '+E.sqName(to)+'.';
  }
  var gives=false;posA.make(m);gives=posA.inCheck();posA.unmake();
  if(gives)return 'It allows '+rs+' with check, and the pressure builds.';
  return 'After '+rs+', the opponent is the one in control.';
}
function betterLine(info){
  if(!info.bestSan||info.isBest)return '';
  var d=describe(info.posBefore,info.bestMove,info.scoreBefore);
  return ' '+info.bestSan+' was stronger'+(d?': '+d+'.':', keeping the position healthier.');
}
function swing(info){return ' Winning chances went from '+pct(info.before)+' to '+pct(info.after)+'.';}

function note(cls,info,w){
  var S=w.S,P=w.P;
  switch(cls){
    case 'brilliant':
      return S+' gave up '+article(PN[info.pt])+' '+PN[info.pt]+' on purpose, yet the position stays at '+pct(info.after)+'. The sacrifice works because of what follows, and it is very hard to spot.';
    case 'great':
      return 'This was a critical moment: almost every other move lets the advantage slip, down to about '+pct(info.second)+'. '+S+' found the one that holds.';
    case 'best':{
      var d=describe(info.posBefore,info.move,info.scoreBefore);
      return 'This is the engine’s first choice'+(d?': '+d+'.':'.');
    }
    case 'excellent':
      return 'Almost as strong as the top choice'+(info.bestSan?' ('+info.bestSan+')':'')+'. Practically nothing is lost here.';
    case 'good':
      return 'A sound, reasonable move.'+(info.bestSan?' The engine slightly prefers '+info.bestSan+', but the difference is small.':'');
    case 'inaccuracy':
      return 'Not a disaster, but a little accuracy slips away.'+(threatLine(info,w)?' '+threatLine(info,w):'')+betterLine(info)+swing(info);
    case 'mistake':
      return S+' went wrong here.'+(threatLine(info,w)?' '+threatLine(info,w):'')+betterLine(info)+swing(info);
    case 'blunder':
      return 'A serious error.'+(threatLine(info,w)?' '+threatLine(info,w):'')+betterLine(info)+swing(info);
    case 'miss':{
      var lead=info.missedMate?S+' missed a forced checkmate.':(info.missedCapture?S+' missed the chance to win material.':(info.gift?'The opponent just slipped, and '+S.toLowerCase()+' did not take advantage.':S+' missed a stronger continuation.'));
      return lead+betterLine(info)+swing(info);
    }
  }
  return '';
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
    var info={posBefore:pos,posAfter:posAfter,move:m,to:to,pt:pt,before:before,after:after,loss:loss,scoreBefore:scoreBefore,
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
    var w=who(side,pov);
    out.push({cls:cls,san:sans[i],uci:uci,bestSan:info.bestSan,bestUci:bestUci,loss:loss,before:before,after:after,
      evalW:(side===0?1:-1)*scoreAfter,poem:C.poem(cls,i*7+(side+3),sans[i]),note:note(cls,info,w),side:side});
  }
  var evalPos=[],win=[];
  for(i=0;i<=n;i++){var e=(poss[i].side===0?1:-1)*S[i].score;evalPos.push(e);win.push(winP(e));}
  var acc=[[],[]],counts=[{},{}],depth=0;
  out.forEach(function(o){acc[o.side].push(accuracy(o.loss));counts[o.side][o.cls]=(counts[o.side][o.cls]||0)+1;});
  S.forEach(function(s){if(s.depth>depth)depth=s.depth;});
  var avg=function(a){return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null;};
  return {S:S,out:out,evalPos:evalPos,win:win,acc:[avg(acc[0]),avg(acc[1])],counts:counts,sans:sans,moves:moves,engine:engineName,depth:depth};
}
return {analyze:analyze,winP:winP,evalText:evalText,LABEL:LABEL,SYM:SYM,ORDER:ORDER,accuracy:accuracy,article:article};
})(GCE,GCCoach);
