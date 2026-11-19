/* Tagalog explanations for the review and the live coach. Mirrors the English builders in analysis.js. */
var GCATL=(function(E){
'use strict';
var MATE=E.MATE,I=GCI;
var PN=['','peon','kabayo','obispo','torre','reyna','hari'];
var LABEL={brilliant:'Brilliant',great:'Napakahusay',best:'Pinakamahusay',excellent:'Magaling',good:'Maayos',book:'Galaw sa aklat',inaccuracy:'Kaunting mali',mistake:'Pagkakamali',miss:'Nalampasan',blunder:'Malaking mali'};
var PHRASE={brilliant:'brilliant na galaw',great:'napakahusay na galaw',best:'ang pinakamahusay na galaw',excellent:'magaling',good:'maayos',book:'galaw sa aklat',inaccuracy:'may kaunting mali',mistake:'isang pagkakamali',miss:'nalampasang pagkakataon',blunder:'isang malaking mali'};
function pct(x){return Math.round(x)+'%';}
function mateIn(score){return Math.ceil((MATE-Math.abs(score))/2);}
function sqn(s){return E.sqName(s);}
function onsq(pos,sq){return PN[pos.b[sq]&7]+' sa '+sqn(sq);}

/* who: S = subject, own = owner of the mover's pieces, oth = owner of the other side's pieces */
function who(side,pov){
  if(pov===0||pov===1)return side===pov?{S:'Ikaw',own:'mo',oth:'ng kalaban mo',me:true,you:true}:{S:'Ang kalaban mo',own:'ng kalaban mo',oth:'mo',me:false,you:false};
  return side===0?{S:'Ang Puti',own:'ng Puti',oth:'ng Itim',me:true,you:false}:{S:'Ang Itim',own:'ng Itim',oth:'ng Puti',me:true,you:false};
}
function describe(pos,m,score){
  var from=m&127,to=(m>>7)&127,p=pos.b[from],t=p&7,capt=(m&E.F_EP)?1:(pos.b[to]&7),promo=(m>>14)&7;
  if(score!==null&&score>=MATE-100)return 'checkmate ito sa '+mateIn(score)+' galaw';
  var gives=false;pos.make(m);gives=pos.inCheck();pos.unmake();
  if(promo)return 'magiging '+PN[promo]+' ang peon';
  if(m&E.F_CASTLE)return 'ligtas ang hari, gising ang torre';
  if(capt)return 'makakakuha ka ng '+PN[capt]+(gives?' na may tsek':'');
  if(gives)return 'may tsek at tuloy ang presyon';
  var home=(p>>3)?0:7;
  if((t===2||t===3)&&(from>>4)===home)return 'lalabas ang '+PN[t]+' sa laro';
  return null;
}
function threatLine(info,w){
  var r=info.reply;if(!r||!r.uci)return null;
  var posA=info.posAfter,m=E.fromUci(posA,r.uci);if(!m)return null;
  var rs=E.toSan(posA,m),to=(m>>7)&127,capt=(m&E.F_EP)?1:(posA.b[to]&7),opp=w.you?'ang kalaban mo':'ang kabila';
  if(r.score>=MATE-100)return {t:rs.slice(-1)==='#'?'Checkmate ang '+rs+'.':'Sasagot sila ng '+rs+', at mate sa '+mateIn(r.score)+'.'};
  if(capt){
    if(to===info.to&&info.hung)return {t:'Kukunin lang ng '+rs+' ang '+PN[info.pt]+' sa '+sqn(info.to)+'.',hang:true};
    return {t:'Mapapanalunan ng '+rs+' ang '+PN[capt]+' '+w.own+' sa '+sqn(to)+'.',hang:true};
  }
  var gives=false;posA.make(m);gives=posA.inCheck();posA.unmake();
  if(gives)return {t:'May tsek ang '+rs+' at sila na ang hahawak ng laro.'};
  return {t:'Pagkatapos ng '+rs+', '+opp+' na ang may hawak.'};
}
function betterLine(info){
  if(!info.bestSan||info.isBest)return '';
  var d=describe(info.posBefore,info.bestMove,info.scoreBefore);
  return ' Subukan ang '+info.bestSan+(d?', '+d+'.':', mas ligtas iyon.');
}
function swing(info){return '';}
function pickV(list,info){return list[((info&&info.ply)||0)%list.length];}

var BOOK_SAYS=['Kilala at ligtas ito.','Gustong-gusto ito ng mga malalakas.','Nasa tamang landas ka pa.'];
var TIPS={
  hang:'Tandaan: protektahan ang mga piyesa mo at huwag magbigay ng libreng piyesa sa kalaban. Bago gumalaw, tiyaking walang nakabitin.',
  ignored:'Bago gumalaw, tingnan kung ano ang iniwang nakabitin ng kalaban. Ang libreng piyesa ay nananalo ng laro.',
  queen:'Ilabas muna ang mga kabayo at obispo. Puwedeng maghintay ang reyna.',
  repeat:'Sa opening, bigyan ng isang magandang galaw ang bawat piyesa bago galawin ang alinman nang dalawang beses.',
  generic:'Bago gumalaw, itanong: ano ang banta ng kalaban, at protektado ba ang lahat ng piyesa ko?',
  trapMine:'Madaling target ang mga piyesang kakaunti ang ligtas na parisukat. Laging maghanap ng paraan para masukol ang reyna at malalaking piyesa ng kalaban.',
  trapTheirs:'Bago galawin ang reyna o torre, tiyaking may ligtas pa itong babalikan.',
  forkMine:'Maghanap ng fork: isang galaw na umaatake sa dalawang piyesa nang sabay, kadalasan ay nananalo ng materyal.',
  forkTheirs:'Bago ang bawat galaw, tingnan kung may kabayo o peon na puwedeng umatake sa dalawa mong piyesa nang sabay.',
  pinMine:'Hindi makakagalaw ang naka-pin na piyesa nang hindi inilalantad ang mas mahalaga. Dagdagan ang presyon dito.',
  pinTheirs:'Iwasang mag-iwan ng piyesa sa harap ng hari o reyna mo na kasabay ng obispo o torre ng kalaban sa iisang linya.',
  free:'Laging tingnan kung protektado ang mga piyesa ng kalaban. Ang hindi protektadong piyesa ay libreng regalo.',
  aware:'Magandang ugali! Laging tingnan kung inaatake ang mga piyesa mo bago gumalaw.',
  book:'Pangunahing tuntunin sa opening: kontrolin ang gitna, ilabas ang mga piyesa, at mag-castle nang maaga.',
  open:'Sa opening, makipaglaban para sa gitna, ilabas ang mga kabayo at obispo, at mag-castle nang maaga.'
};
function positive(info,w,mo){
  var B=info.posBefore,A=info.posAfter,S=w.S;
  if(!mo)return null;
  var mate=false;try{mate=A.inCheck()&&A.legal(false).length===0;}catch(e){}
  if(mate)return {big:true,t:'Checkmate! Wala nang matatakbuhan ang hari.',tip:w.me?'Ang galing ng pagtatapos. Laging tingnan ang bawat tsek, kuha at banta bago gumalaw.':''};
  if(mo.trap){
    var q=mo.trap.t===5;
    return {big:true,t:S+' ay nakasukol sa '+PN[mo.trap.t]+' '+w.oth+' sa '+sqn(mo.trap.sq)+'. Inaatake ito at wala nang ligtas na parisukat'+(q?' (reyna pa nga!)':'')+'.',tip:w.me?TIPS.trapMine:TIPS.trapTheirs};
  }
  if(mo.fork){
    var a=mo.fork[0],b=mo.fork[1];
    return {big:true,t:S+' ay nag-fork sa '+PN[a.t]+' sa '+sqn(a.sq)+' at '+PN[b.t]+' sa '+sqn(b.sq)+'. May isa sa kanila na babagsak.',tip:w.me?TIPS.forkMine:TIPS.forkTheirs};
  }
  if(mo.pin&&mo.pin.px>=2)return {big:true,t:S+' ay nag-pin sa '+PN[mo.pin.px]+' sa '+sqn(mo.pin.pinned)+' laban sa '+PN[mo.pin.py]+' sa '+sqn(mo.pin.target)+'. Kapag gumalaw ito, may mas mahalagang mawawala.',tip:w.me?TIPS.pinMine:TIPS.pinTheirs};
  if(mo.win){
    var cv=I.VAL[mo.win.t],mv=I.VAL[mo.t===6?1:mo.t];
    if(mo.win.free)return {big:true,t:S+' ay nakakuha sa '+PN[mo.win.t]+' '+w.oth+' sa '+sqn(mo.win.sq)+', at walang nagbabantay rito. Libre!',tip:w.me?TIPS.free:TIPS.hang};
    if(cv>mv+40)return {big:true,t:S+' ay nakakuha sa '+PN[mo.win.t]+' '+w.oth+' gamit ang '+PN[mo.t]+' at lamang na sa materyal.',tip:w.me?TIPS.free:TIPS.hang};
    return {big:false,t:S+' ay nakakuha sa '+PN[mo.win.t]+' '+w.oth+' sa '+sqn(mo.win.sq)+(cv<=mv-40?'. Patas na palitan, basta bilangin ang recapture.':', patas na palitan lang.'),tip:''};
  }
  if(mo.escaped)return {big:false,t:'Ayos! Inaatake ang '+PN[mo.escaped.t]+' sa '+sqn(mo.escaped.sq)+', at nakaligtas ito.',tip:TIPS.aware};
  if(mo.saved)return {big:false,t:'Ayos! Inaatake ang '+onsq(B,mo.saved.sq)+', at protektado na ito ngayon.',tip:TIPS.aware};
  if(mo.threat)return {big:false,t:'Inaatake nito ang '+onsq(A,mo.threat.sq)+', na kulang sa proteksyon.',tip:''};
  if(mo.promo)return {big:true,t:S+' ay nag-promote ng peon bilang '+PN[mo.promo]+'.',tip:''};
  if(mo.castle)return {big:false,t:'Castling: ligtas ang hari, kasali na ang torre.',tip:TIPS.open};
  if(mo.check)return {big:false,t:'Tsek! Tuloy ang presyon.',tip:''};
  if(mo.develop)return {big:false,t:'Maganda, kasali na ang '+PN[mo.t]+'.',tip:TIPS.open};
  if(mo.center)return {big:false,t:'Maganda, ang gitna ay nagbibigay ng espasyo sa mga piyesa.',tip:TIPS.open};
  return null;
}
function negative(info,w,mo){
  var parts=[],tip='';mo=mo||{};
  var tl=threatLine(info,w);
  if(tl){parts.push(tl.t);if(tl.hang)tip=TIPS.hang;}
  else if(mo.hangs&&mo.hangs.length){parts.push('Nakabitin ang '+onsq(info.posAfter,mo.hangs[0].sq)+'.');tip=TIPS.hang;}
  if(mo.ignored&&!info.missedCapture){parts.push('Libre sanang kunin ang '+onsq(info.posBefore,mo.ignored.sq)+'.');tip=tip||TIPS.ignored;}
  if(mo.earlyQueen){parts.push('Masyadong maaga ang reyna at hahabulin ito.');tip=tip||TIPS.queen;}
  if(mo.repeat){parts.push('Parehong piyesa ulit, mas maganda kadalasan ang maglabas ng bago.');tip=tip||TIPS.repeat;}
  return {t:parts.join(' '),tip:tip||TIPS.generic};
}
function explain(cls,info,w){
  var S=w.S,mo=info.mo||null,pos=null,n,out={note:'',tip:''};
  try{pos=positive(info,w,mo);}catch(e){pos=null;}
  var praise=(pos&&pos.big&&w.me)?(cls==='brilliant'?'Brilliant! ':'Ang galing! '):'';
  switch(cls){
    case 'brilliant':
      out.note='Wow, sakripisyo! Gumana ang pagsuko ng '+PN[info.pt]+', at napakahirap itong makita.'+(pos&&pos.t?' '+pos.t:'');
      out.tip='Gumagana lang ang sakripisyo kung nakikita mo ang susunod. Suriin muna ang bawat sagot.';break;
    case 'great':
      out.note='Ang galing ng nakita! Karamihan ng galaw dito ay magpapawala ng bentahe, pero napanatili ito.'+(pos&&pos.t?' '+pos.t:'');
      out.tip=(pos&&pos.tip)||'Sa mahihirap na posisyon, tingnan muna ang bawat tsek, kuha at banta.';break;
    case 'best':{
      var d=describe(info.posBefore,info.move,info.scoreBefore);
      out.note=pos?praise+pos.t:pickV(['Tamang-tama','Iyan na nga','Ayan, tama'],info)+(d?': '+d+'.':'.');
      out.tip=pos?pos.tip:'';break;}
    case 'excellent':
      out.note=(pos?praise+pos.t+' ':'')+'Halos kasing-galing ng pinakamahusay'+(info.bestSan?' ('+info.bestSan+')':'')+'.';
      out.tip=pos?pos.tip:'';break;
    case 'good':
      out.note=(pos?pos.t+' ':'')+'Matatag.'+(info.bestSan?' Bahagyang mas malakas ang '+info.bestSan+'.':'');
      out.tip=pos?pos.tip:'';break;
    case 'book':
      out.note='Galaw sa aklat'+(info.bookName?' ('+info.bookName+')':'')+'. '+BOOK_SAYS[(info.ply||0)%BOOK_SAYS.length];
      out.tip=TIPS.book;break;
    case 'inaccuracy':
      n=negative(info,w,mo);
      out.note=pickV(['Medyo sablay.','Hindi masama, pero may mas maganda.'],info)+(n.t?' '+n.t:'')+betterLine(info);out.tip=n.tip;break;
    case 'mistake':
      n=negative(info,w,mo);
      out.note=pickV(['Aray, sayang.','Hmm, pagkakamali ito.'],info)+(n.t?' '+n.t:'')+betterLine(info);out.tip=n.tip;break;
    case 'blunder':
      n=negative(info,w,mo);
      out.note=pickV(['Naku!','Aray ko!'],info)+(n.t?' '+n.t:'')+betterLine(info);out.tip=n.tip;break;
    case 'miss':{
      n=negative(info,w,mo);
      var lead=info.missedMate?'Nalampasan ang sapilitang checkmate!':(info.missedCapture?'Nalampasan ang pagkakataong manalo ng materyal.':(info.gift?'Nadulas sila, pero hindi ito nasamantala.':'May mas magandang galaw dito.'));
      out.note=lead+(n.t?' '+n.t:'')+betterLine(info);out.tip=info.missedCapture||info.gift?TIPS.ignored:n.tip;break;}
  }
  return out;
}
return {explain:explain,who:who,LABEL:LABEL,PHRASE:PHRASE,TIPS:TIPS};
})(GCE);
