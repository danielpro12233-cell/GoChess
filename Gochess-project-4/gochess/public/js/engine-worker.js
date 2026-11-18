importScripts('engine.js');
self.onmessage=function(e){
  var d=e.data,r;
  try{
    if(d.kind==='bot')r=GCE.botUci(d.fen,d.level);
    else r=GCE.analyze(d.fen,d.ms,d.multipv);
  }catch(x){r={err:String(x)};}
  r.id=d.id;
  self.postMessage(r);
};
