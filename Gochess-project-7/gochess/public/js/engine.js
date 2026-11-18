var GCE=(function(){
'use strict';
var P=1,N=2,B=3,R=4,Q=5,K=6;
var VAL=[0,100,320,330,500,900,0];
var KN=[-33,-31,-18,-14,14,18,31,33],KG=[-17,-16,-15,-1,1,15,16,17],BD=[-17,-15,15,17],RD=[-16,-1,1,16];
var F_CAP=1<<17,F_EP=1<<18,F_CASTLE=1<<19,F_DBL=1<<20;
var INF=32000,MATE=30000;
var FILES='abcdefgh';
var CMASK=new Int8Array(128).fill(15);
CMASK[112]=13;CMASK[119]=14;CMASK[116]=12;CMASK[0]=7;CMASK[7]=11;CMASK[4]=3;

function sqName(s){return FILES[s&7]+(8-(s>>4));}
function nameSq(n){return (8-(+n[1]))*16+(n.charCodeAt(0)-97);}

function Pos(){this.b=new Int8Array(128);this.side=0;this.cast=0;this.ep=-1;this.half=0;this.full=1;this.ksq=[0,0];this.stack=[];this.nullStack=[];}
Pos.prototype.setFen=function(fen){
  var parts=fen.trim().split(/\s+/),rows=parts[0].split('/');
  this.b.fill(0);
  for(var r=0;r<8;r++){var f=0;
    for(var i=0;i<rows[r].length;i++){var c=rows[r][i];
      if(c>='1'&&c<='8'){f+=+c;}
      else{var t='pnbrqk'.indexOf(c.toLowerCase())+1,col=(c===c.toLowerCase())?8:0,sq=r*16+f;
        this.b[sq]=t+col;if(t===6)this.ksq[col>>3]=sq;f++;}
    }}
  this.side=parts[1]==='b'?1:0;
  var cs=parts[2]||'-';this.cast=0;
  if(cs.indexOf('K')>=0)this.cast|=1;if(cs.indexOf('Q')>=0)this.cast|=2;
  if(cs.indexOf('k')>=0)this.cast|=4;if(cs.indexOf('q')>=0)this.cast|=8;
  this.ep=(parts[3]&&parts[3]!=='-')?nameSq(parts[3]):-1;
  this.half=+(parts[4]||0);this.full=+(parts[5]||1);
  this.stack=[];this.nullStack=[];
  return this;
};
Pos.prototype.fen=function(){
  var s='',r,f,e,p;
  for(r=0;r<8;r++){e=0;
    for(f=0;f<8;f++){p=this.b[r*16+f];
      if(!p)e++;else{if(e){s+=e;e=0;}var ch='pnbrqk'[(p&7)-1];s+=(p&8)?ch:ch.toUpperCase();}
    }
    if(e)s+=e;if(r<7)s+='/';}
  var c=(this.cast&1?'K':'')+(this.cast&2?'Q':'')+(this.cast&4?'k':'')+(this.cast&8?'q':'');
  return s+' '+(this.side?'b':'w')+' '+(c||'-')+' '+(this.ep>=0?sqName(this.ep):'-')+' '+this.half+' '+this.full;
};
Pos.prototype.attacked=function(sq,by){
  var b=this.b,i,d,t,s,pc=by<<3;
  if(by===0){s=sq+15;if(!(s&0x88)&&b[s]===P)return true;s=sq+17;if(!(s&0x88)&&b[s]===P)return true;}
  else{s=sq-15;if(!(s&0x88)&&b[s]===P+8)return true;s=sq-17;if(!(s&0x88)&&b[s]===P+8)return true;}
  for(i=0;i<8;i++){s=sq+KN[i];if(!(s&0x88)&&b[s]===N+pc)return true;}
  for(i=0;i<8;i++){s=sq+KG[i];if(!(s&0x88)&&b[s]===K+pc)return true;}
  for(i=0;i<4;i++){d=BD[i];s=sq+d;while(!(s&0x88)){t=b[s];if(t){if(t===B+pc||t===Q+pc)return true;break;}s+=d;}}
  for(i=0;i<4;i++){d=RD[i];s=sq+d;while(!(s&0x88)){t=b[s];if(t){if(t===R+pc||t===Q+pc)return true;break;}s+=d;}}
  return false;
};
Pos.prototype.inCheck=function(){return this.attacked(this.ksq[this.side],this.side^1);};
Pos.prototype.gen=function(caps){
  var m=[],b=this.b,us=this.side,them=us^1,sq,p,t,d,s,i,tgt,r,k;
  var dir=us?16:-16,startRow=us?1:6,promoRow=us?6:1;
  var promos=caps?[Q]:[Q,R,B,N];
  for(sq=0;sq<128;sq++){
    if(sq&0x88){sq+=7;continue;}
    p=b[sq];if(!p||(p>>3)!==us)continue;t=p&7;
    if(t===P){
      r=sq>>4;s=sq+dir;
      if(!(s&0x88)&&!b[s]){
        if(r===promoRow){for(k=0;k<promos.length;k++)m.push(sq|(s<<7)|(promos[k]<<14));}
        else if(!caps){m.push(sq|(s<<7));if(r===startRow&&!b[s+dir])m.push(sq|((s+dir)<<7)|F_DBL);}
      }
      for(i=-1;i<=1;i+=2){
        s=sq+dir+i;if(s&0x88)continue;tgt=b[s];
        if(tgt&&(tgt>>3)===them){
          if(r===promoRow){for(k=0;k<promos.length;k++)m.push(sq|(s<<7)|(promos[k]<<14)|F_CAP);}
          else m.push(sq|(s<<7)|F_CAP);
        }else if(!tgt&&s===this.ep){m.push(sq|(s<<7)|F_CAP|F_EP);}
      }
    }else if(t===N||t===K){
      var dl=t===N?KN:KG;
      for(i=0;i<8;i++){s=sq+dl[i];if(s&0x88)continue;tgt=b[s];
        if(!tgt){if(!caps)m.push(sq|(s<<7));}
        else if((tgt>>3)===them)m.push(sq|(s<<7)|F_CAP);}
      if(t===K&&!caps){
        if(us===0&&sq===116&&!this.attacked(116,1)){
          if((this.cast&1)&&!b[117]&&!b[118]&&b[119]===R&&!this.attacked(117,1)&&!this.attacked(118,1))m.push(116|(118<<7)|F_CASTLE);
          if((this.cast&2)&&!b[115]&&!b[114]&&!b[113]&&b[112]===R&&!this.attacked(115,1)&&!this.attacked(114,1))m.push(116|(114<<7)|F_CASTLE);
        }else if(us===1&&sq===4&&!this.attacked(4,0)){
          if((this.cast&4)&&!b[5]&&!b[6]&&b[7]===R+8&&!this.attacked(5,0)&&!this.attacked(6,0))m.push(4|(6<<7)|F_CASTLE);
          if((this.cast&8)&&!b[3]&&!b[2]&&!b[1]&&b[0]===R+8&&!this.attacked(3,0)&&!this.attacked(2,0))m.push(4|(2<<7)|F_CASTLE);
        }
      }
    }else{
      var dirs=t===B?BD:(t===R?RD:KG);
      for(i=0;i<dirs.length;i++){d=dirs[i];s=sq+d;
        while(!(s&0x88)){tgt=b[s];
          if(!tgt){if(!caps)m.push(sq|(s<<7));}
          else{if((tgt>>3)===them)m.push(sq|(s<<7)|F_CAP);break;}
          s+=d;}
      }
    }
  }
  return m;
};
Pos.prototype.make=function(m){
  var b=this.b,from=m&127,to=(m>>7)&127,promo=(m>>14)&7,us=this.side,p=b[from],cap=b[to];
  this.stack.push([m,cap,this.cast,this.ep,this.half,this.full]);
  b[to]=p;b[from]=0;
  if(m&F_EP)b[us?to-16:to+16]=0;
  if(promo)b[to]=promo|(us<<3);
  if((p&7)===K)this.ksq[us]=to;
  if(m&F_CASTLE){if(to>from){b[from+1]=b[from+3];b[from+3]=0;}else{b[from-1]=b[from-4];b[from-4]=0;}}
  this.cast&=CMASK[from]&CMASK[to];
  this.ep=(m&F_DBL)?((from+to)>>1):-1;
  this.half=((p&7)===P||cap)?0:this.half+1;
  if(us)this.full++;
  this.side^=1;
};
Pos.prototype.unmake=function(){
  var u=this.stack.pop(),m=u[0],from=m&127,to=(m>>7)&127,promo=(m>>14)&7,b=this.b;
  this.side^=1;var us=this.side,p=b[to];
  if(promo)p=P|(us<<3);
  b[from]=p;b[to]=u[1];
  if(m&F_EP){b[to]=0;b[us?to-16:to+16]=P|((us^1)<<3);}
  if((p&7)===K)this.ksq[us]=from;
  if(m&F_CASTLE){if(to>from){b[from+3]=b[from+1];b[from+1]=0;}else{b[from-4]=b[from-1];b[from-1]=0;}}
  this.cast=u[2];this.ep=u[3];this.half=u[4];this.full=u[5];
};
Pos.prototype.nullMake=function(){this.nullStack.push(this.ep);this.ep=-1;this.side^=1;};
Pos.prototype.nullUnmake=function(){this.side^=1;this.ep=this.nullStack.pop();};
Pos.prototype.legal=function(caps){
  var ms=this.gen(caps),out=[],i,m;
  for(i=0;i<ms.length;i++){m=ms[i];this.make(m);
    if(!this.attacked(this.ksq[this.side^1],this.side))out.push(m);
    this.unmake();}
  return out;
};
function perft(pos,d){
  if(d===0)return 1;var ms=pos.gen(false),n=0;
  for(var i=0;i<ms.length;i++){pos.make(ms[i]);
    if(!pos.attacked(pos.ksq[pos.side^1],pos.side))n+=perft(pos,d-1);
    pos.unmake();}
  return n;
}

/* ---------- evaluation ---------- */
var PP=[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0];
var PN=[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
var PB=[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
var PR=[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
var PQ=[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
var KM=[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];
var KE=[-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50];
var PST=[null,PP,PN,PB,PR,PQ];
function evaluate(pos){
  var b=pos.b,npm=0,s=0,sq,p,t,c,idx,wb=0,bb=0,r,f,v;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}p=b[sq];if(!p)continue;t=p&7;if(t!==P&&t!==K)npm+=VAL[t];}
  var end=npm<=1300;
  for(sq=0;sq<128;sq++){
    if(sq&0x88){sq+=7;continue;}
    p=b[sq];if(!p)continue;t=p&7;c=p>>3;r=sq>>4;f=sq&7;
    idx=c?(((7-r)<<3)|f):((r<<3)|f);
    v=VAL[t]+(t===K?(end?KE[idx]:KM[idx]):PST[t][idx]);
    if(t===B){if(c)bb++;else wb++;}
    s+=c?-v:v;
  }
  if(wb>=2)s+=30;if(bb>=2)s-=30;
  return (pos.side?-s:s)+8;
}
function matBal(pos){var b=pos.b,s=0,sq,p;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}p=b[sq];if(!p)continue;s+=(p>>3)?-VAL[p&7]:VAL[p&7];}
  return pos.side?-s:s;}
function matQs(pos,alpha,beta,d){
  var stand=matBal(pos);
  if(d>=8||stand>=beta)return stand;
  if(stand>alpha)alpha=stand;
  var ms=pos.gen(true),i,sc,b=pos.b;
  var caps=[];for(i=0;i<ms.length;i++)if(ms[i]&F_CAP)caps.push(ms[i]);
  caps.sort(function(x,y){return VAL[b[(y>>7)&127]&7]-VAL[b[(x>>7)&127]&7];});
  for(i=0;i<caps.length;i++){
    pos.make(caps[i]);
    if(pos.attacked(pos.ksq[pos.side^1],pos.side)){pos.unmake();continue;}
    sc=-matQs(pos,-beta,-alpha,d+1);pos.unmake();
    if(sc>=beta)return sc;if(sc>alpha)alpha=sc;
  }
  return alpha;
}
function matQ(fen){var pos=new Pos().setFen(fen);return matQs(pos,-INF,INF,0);}
function matNow(fen){return matBal(new Pos().setFen(fen));}

/* ---------- search ---------- */
var nodes=0,deadline=Infinity,stop=false,rootBest=0,rootPV=0,excl=[];
var killers=[];for(var ki=0;ki<130;ki++)killers.push([0,0]);
var hist=new Int32Array(2*16384);
function now(){return (typeof performance!=='undefined'?performance.now():Date.now());}
function scoreMoves(pos,ms,ply,pv){
  var sc=new Array(ms.length),b=pos.b,i,m,s,v,pr;
  for(i=0;i<ms.length;i++){
    m=ms[i];s=0;pr=(m>>14)&7;
    if(m===pv)s=1e6;
    else if(m&F_CAP){v=(m&F_EP)?P:(b[(m>>7)&127]&7);s=100000+VAL[v]*10-VAL[b[m&127]&7]/10+(pr?VAL[pr]:0);}
    else if(pr)s=95000+VAL[pr];
    else if(killers[ply]&&killers[ply][0]===m)s=80000;
    else if(killers[ply]&&killers[ply][1]===m)s=70000;
    else s=hist[(pos.side<<14)|((m&127)<<7)|((m>>7)&127)];
    sc[i]=s;
  }
  return sc;
}
function hasPieces(pos,side){var b=pos.b,sq,p,t;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}p=b[sq];if(!p||(p>>3)!==side)continue;t=p&7;if(t>=N&&t<=Q)return true;}
  return false;}
function qsearch(pos,alpha,beta,ply){
  if((++nodes&2047)===0&&now()>deadline)stop=true;
  if(stop)return 0;
  var stand=evaluate(pos);
  if(ply>=100||stand>=beta)return stand;
  if(stand>alpha)alpha=stand;
  var ms=pos.gen(true),sc=scoreMoves(pos,ms,ply,0),i,j,bi,bs,m,score;
  for(i=0;i<ms.length;i++){
    bi=i;bs=sc[i];for(j=i+1;j<ms.length;j++)if(sc[j]>bs){bs=sc[j];bi=j;}
    m=ms[bi];ms[bi]=ms[i];sc[bi]=sc[i];ms[i]=m;sc[i]=bs;
    pos.make(m);
    if(pos.attacked(pos.ksq[pos.side^1],pos.side)){pos.unmake();continue;}
    score=-qsearch(pos,-beta,-alpha,ply+1);pos.unmake();
    if(stop)return 0;
    if(score>=beta)return score;
    if(score>alpha)alpha=score;
  }
  return alpha;
}
function negamax(pos,depth,alpha,beta,ply,nullOk){
  if((++nodes&2047)===0&&now()>deadline)stop=true;
  if(stop)return 0;
  var inChk=pos.inCheck();
  if(inChk)depth++;
  if(depth<=0)return qsearch(pos,alpha,beta,ply);
  var isRoot=ply===0;
  if(!isRoot&&pos.half>=100)return 0;
  if(ply>=120)return evaluate(pos);
  if(nullOk&&!inChk&&depth>=3&&!isRoot&&hasPieces(pos,pos.side)){
    pos.nullMake();var ns=-negamax(pos,depth-3,-beta,-beta+1,ply+1,false);pos.nullUnmake();
    if(stop)return 0;if(ns>=beta)return beta;
  }
  var ms=pos.gen(false),sc=scoreMoves(pos,ms,ply,isRoot?rootPV:0);
  var best=-INF,legalN=0,i,j,bi,bs,m,score,quiet;
  for(i=0;i<ms.length;i++){
    bi=i;bs=sc[i];for(j=i+1;j<ms.length;j++)if(sc[j]>bs){bs=sc[j];bi=j;}
    m=ms[bi];ms[bi]=ms[i];sc[bi]=sc[i];ms[i]=m;sc[i]=bs;
    if(isRoot&&excl.length&&excl.indexOf(m)>=0)continue;
    pos.make(m);
    if(pos.attacked(pos.ksq[pos.side^1],pos.side)){pos.unmake();continue;}
    legalN++;
    quiet=!(m&F_CAP)&&!((m>>14)&7);
    if(legalN>4&&depth>=3&&quiet&&!inChk){
      score=-negamax(pos,depth-2,-alpha-1,-alpha,ply+1,true);
      if(score>alpha)score=-negamax(pos,depth-1,-beta,-alpha,ply+1,true);
    }else score=-negamax(pos,depth-1,-beta,-alpha,ply+1,true);
    pos.unmake();
    if(stop)return 0;
    if(score>best){best=score;if(isRoot)rootBest=m;}
    if(score>alpha){alpha=score;
      if(alpha>=beta){
        if(quiet){var k=killers[ply];if(k[0]!==m){k[1]=k[0];k[0]=m;}
          var hi=(pos.side<<14)|((m&127)<<7)|((m>>7)&127);hist[hi]=Math.min(hist[hi]+depth*depth,60000);}
        break;}
    }
  }
  if(legalN===0)return inChk?-MATE+ply:0;
  return best;
}
function resetSearch(){nodes=0;stop=false;rootBest=0;rootPV=0;excl=[];
  for(var i=0;i<killers.length;i++){killers[i][0]=0;killers[i][1]=0;}
  for(var j=0;j<hist.length;j++)hist[j]=hist[j]>>3;}
function search(opts){
  var pos=new Pos().setFen(opts.fen);
  resetSearch();
  var legal=pos.legal(false);
  if(!legal.length)return {move:0,score:pos.inCheck()?-MATE:0,depth:0,nodes:0,over:true};
  excl=(opts.exclude||[]).slice();
  var avail=legal.filter(function(x){return excl.indexOf(x)<0;});
  if(!avail.length)return {move:0,score:null,depth:0,nodes:0};
  var t0=now(),ms=opts.ms||1000,maxD=opts.depth||64;
  var best=avail[0],score=0,done=0;
  for(var d=1;d<=maxD;d++){
    rootBest=0;
    deadline=d===1?Infinity:t0+ms;
    var sc=negamax(pos,d,-INF,INF,0,false);
    if(stop&&d>1)break;
    if(rootBest){best=rootBest;score=sc;done=d;rootPV=best;}
    if(Math.abs(sc)>MATE-100&&d>=3)break;
    if(avail.length===1&&d>=4)break;
    if(now()-t0>ms*0.6&&d>=3)break;
  }
  deadline=Infinity;
  return {move:best,score:score,depth:done,nodes:nodes};
}
var LEVELS=[
  {name:'Beginner',elo:400,depth:1,noise:330,skill:0,sfMs:60},
  {name:'Novice',elo:700,depth:1,noise:170,skill:1,sfMs:80},
  {name:'Casual',elo:1000,depth:2,noise:120,skill:3,sfMs:100},
  {name:'Club',elo:1300,depth:2,noise:50,skill:6,sfMs:150},
  {name:'Advanced',elo:1600,depth:3,noise:25,skill:9,sfMs:250},
  {name:'Expert',elo:1900,ms:450,depth:5,noise:0,skill:12,sfMs:400},
  {name:'Master',elo:2300,ms:1000,depth:8,noise:0,skill:15,sfMs:700},
  {name:'Grandmaster',elo:2700,ms:1600,depth:12,noise:0,skill:18,sfMs:1000},
  {name:'Super GM',elo:3000,ms:2200,depth:20,noise:0,skill:20,sfMs:1500}
];
function gauss(){return (Math.random()+Math.random()+Math.random()-1.5)*1.6;}
function weakMove(fen,level){
  var cfg=LEVELS[level],pos=new Pos().setFen(fen);
  resetSearch();deadline=Infinity;
  var legal=pos.legal(false),best=0,bs=-1e9,i,sc;
  for(i=0;i<legal.length;i++){
    pos.make(legal[i]);
    sc=-negamax(pos,cfg.depth-1,-INF,INF,1,false)+gauss()*cfg.noise;
    pos.unmake();
    if(sc>bs){bs=sc;best=legal[i];}
  }
  return {move:best,score:bs,depth:cfg.depth};
}
function botMove(fen,level){
  var cfg=LEVELS[level];
  if(cfg.noise>0)return weakMove(fen,level);
  return search({fen:fen,ms:cfg.ms,depth:cfg.depth});
}

function botUci(fen,level){var r=botMove(fen,level);return {uci:r.move?toUci(r.move):null,score:r.score,depth:r.depth};}
function analyzeFen(fen,ms,mpv){
  var r1=search({fen:fen,ms:ms,depth:14});
  if(r1.over||!r1.move)return {uci:null,score:r1.score,lines:[],depth:0,engine:'Gochess built-in'};
  var lines=[{uci:toUci(r1.move),score:r1.score,depth:r1.depth}];
  if(mpv>1){var r2=search({fen:fen,ms:Math.max(60,ms*0.6),depth:12,exclude:[r1.move]});if(r2.move)lines.push({uci:toUci(r2.move),score:r2.score,depth:r2.depth});}
  return {uci:lines[0].uci,score:r1.score,depth:r1.depth,lines:lines,engine:'Gochess built-in'};
}
/* ---------- notation & status ---------- */
var PROMO_L='??NBRQ';
function toUci(m){var s=sqName(m&127)+sqName((m>>7)&127),pr=(m>>14)&7;return s+(pr?'??nbrq'[pr]:'');}
function fromUci(pos,u){
  var from=nameSq(u.substr(0,2)),to=nameSq(u.substr(2,2)),pl=u[4],ms=pos.legal(false);
  for(var i=0;i<ms.length;i++){var m=ms[i];
    if((m&127)===from&&((m>>7)&127)===to){
      var pr=(m>>14)&7;
      if(!pr&&!pl)return m;
      if(pr&&pl&&'??nbrq'[pr]===pl)return m;
      if(pr&&!pl&&pr===Q)return m;
    }}
  return 0;
}
function toSan(pos,m){
  var from=m&127,to=(m>>7)&127,pr=(m>>14)&7,p=pos.b[from],t=p&7,s='';
  if(m&F_CASTLE)s=to>from?'O-O':'O-O-O';
  else{
    var cap=m&F_CAP;
    if(t===P){if(cap)s+=FILES[from&7]+'x';s+=sqName(to);if(pr)s+='='+PROMO_L[pr];}
    else{
      s+='?PNBRQK'[t];
      var others=pos.legal(false).filter(function(o){return o!==m&&((o>>7)&127)===to&&(pos.b[o&127]&15)===(p&15);});
      if(others.length){
        var sameFile=others.some(function(o){return ((o&127)&7)===(from&7);});
        var sameRank=others.some(function(o){return ((o&127)>>4)===(from>>4);});
        if(!sameFile)s+=FILES[from&7];else if(!sameRank)s+=(8-(from>>4));else s+=FILES[from&7]+(8-(from>>4));
      }
      if(cap)s+='x';s+=sqName(to);
    }
  }
  pos.make(m);var chk=pos.inCheck(),has=pos.legal(false).length>0;pos.unmake();
  if(chk)s+=has?'+':'#';
  return s;
}
function fromSan(pos,san){
  var clean=san.replace(/[+#!?]/g,'').replace(/0/g,'O').replace(/=/g,'');
  var ms=pos.legal(false);
  for(var i=0;i<ms.length;i++){
    var s=toSan(pos,ms[i]).replace(/[+#]/g,'').replace(/=/g,'');
    if(s===clean)return ms[i];
  }
  return 0;
}
function key(pos){
  var p=pos.fen().split(' '),ep='-';
  if(pos.ep>=0){var d=pos.side?-16:16,pc=P|(pos.side<<3);
    var a=pos.ep+d-1,c=pos.ep+d+1;
    if((!(a&0x88)&&pos.b[a]===pc)||(!(c&0x88)&&pos.b[c]===pc))ep=p[3];}
  return p[0]+' '+p[1]+' '+p[2]+' '+ep;
}
function insufficient(pos){
  var b=pos.b,n=0,sq,t;
  for(sq=0;sq<128;sq++){if(sq&0x88){sq+=7;continue;}t=b[sq]&7;if(!t||t===K)continue;if(t===P||t===R||t===Q)return false;n++;}
  return n<=1;
}
function status(pos,keys){
  var legal=pos.legal(false).length;
  if(!legal){
    if(pos.inCheck())return {over:true,result:pos.side?'1-0':'0-1',reason:'checkmate'};
    return {over:true,result:'1/2-1/2',reason:'stalemate'};
  }
  if(insufficient(pos))return {over:true,result:'1/2-1/2',reason:'insufficient material'};
  if(pos.half>=100)return {over:true,result:'1/2-1/2',reason:'50-move rule'};
  if(keys){var k=key(pos),c=0;for(var i=0;i<keys.length;i++)if(keys[i]===k)c++;if(c>=3)return {over:true,result:'1/2-1/2',reason:'threefold repetition'};}
  return {over:false};
}
var START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
return {analyze:analyzeFen,botUci:botUci,Pos:Pos,perft:perft,search:search,botMove:botMove,weakMove:weakMove,matQ:matQ,matNow:matNow,LEVELS:LEVELS,
  toUci:toUci,fromUci:fromUci,toSan:toSan,fromSan:fromSan,key:key,status:status,sqName:sqName,nameSq:nameSq,
  START:START,MATE:MATE,VAL:VAL,F_CAP:F_CAP,F_EP:F_EP,F_CASTLE:F_CASTLE};
})();
