/* Insight: finds the ideas behind a move (trapped pieces, forks, pins, hanging pieces, ...) so the coach can explain them. */
var GCI=(function(E){
'use strict';
var VAL=[0,100,320,330,500,900,10000];
var PN=['','pawn','knight','bishop','rook','queen','king'];
var KN=[-33,-31,-18,-14,14,18,31,33],KG=[-17,-16,-15,-1,1,15,16,17],BD=[-17,-15,15,17],RD=[-16,-1,1,16];
var ALL=[-17,-16,-15,-1,1,15,16,17];

function on(s){return !(s&0x88);}
/* squares of the pieces of colour `by` that attack `sq` (sliders stacked behind each other count, for exchanges) */
function attackers(pos,sq,by){
  var b=pos.b,out=[],i,d,s,t,pc=by<<3;
  if(by===0){s=sq+15;if(on(s)&&b[s]===1)out.push(s);s=sq+17;if(on(s)&&b[s]===1)out.push(s);}
  else{s=sq-15;if(on(s)&&b[s]===9)out.push(s);s=sq-17;if(on(s)&&b[s]===9)out.push(s);}
  for(i=0;i<8;i++){s=sq+KN[i];if(on(s)&&b[s]===2+pc)out.push(s);}
  for(i=0;i<8;i++){s=sq+KG[i];if(on(s)&&b[s]===6+pc)out.push(s);}
  for(i=0;i<4;i++){d=BD[i];s=sq+d;while(on(s)){t=b[s];if(t){if(t===3+pc||t===5+pc){out.push(s);s+=d;continue;}break;}s+=d;}}
  for(i=0;i<4;i++){d=RD[i];s=sq+d;while(on(s)){t=b[s];if(t){if(t===4+pc||t===5+pc){out.push(s);s+=d;continue;}break;}s+=d;}}
  return out;
}
function vals(pos,sqs){return sqs.map(function(s){return VAL[pos.b[s]&7];}).sort(function(a,b){return a-b;});}
/* material the side attacking `sq` can win by capturing what stands there (0 when the exchange does not pay) */
function see(pos,sq){
  var p=pos.b[sq];if(!p)return 0;
  var col=p>>3,atk=vals(pos,attackers(pos,sq,col^1)),def=vals(pos,attackers(pos,sq,col));
  if(!atk.length)return 0;
  var gain=[VAL[p&7]],d=0,cur=atk[0],ai=1,di=0,turn=1;
  for(;;){
    d++;gain[d]=cur-gain[d-1];
    if(turn===1){if(di>=def.length)break;cur=def[di++];}else{if(ai>=atk.length)break;cur=atk[ai++];}
    turn^=1;
    if(Math.max(-gain[d-1],gain[d])<0)break;
  }
  while(--d>0)gain[d-1]=-Math.max(-gain[d-1],gain[d]);
  return Math.max(0,gain[0]);
}
/* pieces of colour `col` (not kings, not pawns unless asked) that the other side wins by simply capturing */
function hanging(pos,col,withPawns){
  var out=[],sq,p,t,g;
  for(sq=0;sq<128;sq++){
    if(sq&0x88){sq+=7;continue;}
    p=pos.b[sq];if(!p||(p>>3)!==col)continue;t=p&7;
    if(t===6||(t===1&&!withPawns))continue;
    g=see(pos,sq);if(g>0)out.push({sq:sq,t:t,gain:g});
  }
  out.sort(function(a,b){return VAL[b.t]-VAL[a.t];});
  return out;
}
function slideTargets(pos,from){
  var b=pos.b,t=b[from]&7,out=[],i,d,s,dirs=[];
  if(t===2){for(i=0;i<8;i++){s=from+KN[i];if(on(s)&&b[s])out.push(s);}return out;}
  if(t===1){var up=(b[from]>>3)?16:-16;[up-1,up+1].forEach(function(x){s=from+x;if(on(s)&&b[s])out.push(s);});return out;}
  if(t===3||t===5)dirs=dirs.concat(BD);
  if(t===4||t===5)dirs=dirs.concat(RD);
  if(t===6)return out;
  for(i=0;i<dirs.length;i++){d=dirs[i];s=from+d;while(on(s)){if(b[s]){out.push(s);break;}s+=d;}}
  return out;
}
/* an enemy piece that is attacked now, cannot be rescued by moving away, and would be lost: "cornered" */
function trapped(pos,victim){
  /* `pos` has the victim to move; returns [{sq,t}] */
  var out=[],sq,p,t,legal=pos.legal(false),k;
  for(sq=0;sq<128;sq++){
    if(sq&0x88){sq+=7;continue;}
    p=pos.b[sq];if(!p||(p>>3)!==victim)continue;t=p&7;
    if(t<2||t>5)continue;
    if(see(pos,sq)<=0)continue; /* not actually in danger */
    var safe=false,any=false;
    for(k=0;k<legal.length;k++){
      var m=legal[k];if((m&127)!==sq)continue;any=true;
      pos.make(m);
      var to=(m>>7)&127,lost=see(pos,to)>0;
      pos.unmake();
      if(!lost){safe=true;break;}
    }
    if(!safe)out.push({sq:sq,t:t,stuck:!any});
  }
  return out;
}
function trappedNow(pos,victim){
  /* works from either side to move by passing the turn to the victim */
  if(pos.side===victim)return trapped(pos,victim);
  if(pos.inCheck())return [];
  pos.nullMake();var r;try{r=trapped(pos,victim);}finally{pos.nullUnmake();}
  return r;
}
function findPin(pos,from){
  var b=pos.b,p=b[from],t=p&7,col=p>>3,i,d,s,dirs=[];
  if(t===3||t===5)dirs=dirs.concat(BD);
  if(t===4||t===5)dirs=dirs.concat(RD);
  for(i=0;i<dirs.length;i++){
    d=dirs[i];s=from+d;var first=-1;
    while(on(s)){
      if(b[s]){
        if((b[s]>>3)===col)break;
        if(first<0)first=s;
        else{
          var x=b[first]&7,y=b[s]&7;
          if(y===6||(VAL[y]>VAL[x]&&x!==6))return {pinned:first,px:x,target:s,py:y};
          break;
        }
      }
      s+=d;
    }
  }
  return null;
}
function sqn(s){return E.sqName(s);}

/* Everything worth saying about one move. ctx: {ply, prevTo (this side's previous destination), prevMoveWasCapture} */
function motifs(before,m,after,ctx){
  ctx=ctx||{};
  var from=m&127,to=(m>>7)&127,p=before.b[from],t=p&7,side=p>>3,enemy=side^1;
  var capt=(m&E.F_EP)?1:(before.b[to]&7),promo=(m>>14)&7,r={t:t,from:from,to:to,capt:capt,side:side};
  r.castle=!!(m&E.F_CASTLE);r.promo=promo;
  /* mate / check */
  var chk=after.inCheck();r.check=chk;
  /* free capture? */
  if(capt&&!(m&E.F_EP)){
    var defs=attackers(before,to,enemy).length;
    r.win={t:capt,free:defs===0,sq:to};
  }
  /* trapped pieces created by this move */
  try{
    var nowT=trappedNow(after,enemy),beforeT=trappedNow(before,enemy);
    var made=nowT.filter(function(a){return !beforeT.some(function(b){return b.sq===a.sq;});});
    made.sort(function(a,b){return VAL[b.t]-VAL[a.t];});
    if(made.length)r.trap=made[0];
  }catch(e){}
  /* fork: the moved piece attacks two or more things worth winning */
  if(t!==6&&!promo){
    var tg=slideTargets(after,to).filter(function(s){return (after.b[s]>>3)===enemy;}).map(function(s){
      var tt=after.b[s]&7;return {sq:s,t:tt,win:tt===6||see(after,s)>0||VAL[tt]>VAL[t]};
    }).filter(function(x){return x.win;});
    if(tg.length>=2){tg.sort(function(a,b){return VAL[b.t]-VAL[a.t];});r.fork=tg.slice(0,3);}
  }
  /* pin */
  if(t>=3&&t<=5){var pn=findPin(after,to);if(pn)r.pin=pn;}
  /* new threat: an enemy piece that is now attacked and loses material */
  var th=hanging(after,enemy,false).filter(function(h){
    var was=before.b[h.sq]&&(before.b[h.sq]>>3)===enemy&&see(before,h.sq)>0;
    return !was;
  });
  if(th.length)r.threat=th[0];
  /* own pieces: which were in danger before, which are now */
  var hb=hanging(before,side,true),ha=hanging(after,side,true);
  if(hb.length){
    var movedOut=hb.filter(function(h){return h.sq===from&&!ha.some(function(a){return a.sq===to;});})[0];
    if(movedOut)r.escaped=movedOut;
    else{
      var saved=hb.filter(function(h){return !ha.some(function(a){return a.sq===h.sq;})&&h.sq!==to;})[0];
      if(saved)r.saved=saved;
    }
  }
  var fresh=ha.filter(function(h){
    if(h.sq===to)return !(hb.some(function(b){return b.sq===from;}));
    return !hb.some(function(b){return b.sq===h.sq;});
  });
  if(fresh.length)r.hangs=fresh;
  /* free material the opponent just left on the board that this move ignored */
  var left=hanging(before,enemy,true).filter(function(h){return h.t>=2||h.gain>=100;});
  if(left.length&&!(capt&&to===left[0].sq))r.ignored=left[0];
  /* opening ideas */
  var ply=ctx.ply||0;
  if(ply<20){
    if(t===1&&((to>>4)===3||(to>>4)===4)&&((to&7)===3||(to&7)===4))r.center=true;
    if((t===2||t===3)&&(from>>4)===(side?0:7))r.develop=true;
    if(t===5&&!capt&&ply<12)r.earlyQueen=true;
    if((t===2||t===3)&&ctx.prevTo===from&&!capt&&ply<16)r.repeat=true;
  }
  return r;
}
return {motifs:motifs,see:see,hanging:hanging,attackers:attackers,trappedNow:trappedNow,PN:PN,VAL:VAL};
})(GCE);
