/* Client for the Gochess server: a small document store with the same surface as the in-app database. */
var GCNet=(function(){
'use strict';
function post(body){
  return fetch((window.GC_BASE||'')+'/api/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){
    return r.json().then(function(j){if(!r.ok)throw {code:j.code||'unavailable',message:j.message||''};return j;});
  });
}
var META={fromCache:false,hasPendingWrites:false};
function docSnap(id,data){return {id:id,exists:data!=null,data:function(){return data==null?undefined:data;},metadata:META};}
function querySnap(rows){
  var docs=rows.map(function(r){return docSnap(r.id,r.data);});
  return {docs:docs,size:docs.length,empty:!docs.length,docChanges:function(){return [];},metadata:META};
}
function lastSeg(p){return p.split('/').pop();}
function stream(params,onData,onError){
  var es=new EventSource((window.GC_BASE||'')+'/api/stream?'+params),dead=false;
  es.addEventListener('snap',function(e){try{onData(JSON.parse(e.data));}catch(x){}});
  es.onerror=function(){if(!dead&&es.readyState===2&&onError)onError({code:'unavailable',message:'stream closed'});};
  return function(){dead=true;es.close();};
}
function DocRef(path){
  this.path=path;this.id=lastSeg(path);
}
DocRef.prototype.get=function(){var self=this;return post({op:'get',path:this.path}).then(function(r){return docSnap(self.id,r.data);});};
DocRef.prototype.set=function(data){return post({op:'set',path:this.path,data:data}).then(function(){});};
DocRef.prototype.update=function(data){return post({op:'update',path:this.path,data:data}).then(function(){});};
DocRef.prototype.delete=function(){return post({op:'delete',path:this.path}).then(function(){});};
DocRef.prototype.acquire=function(o){return post({op:'acquire',path:this.path,holder:o.holder,ttlMs:o.ttlMs||0,data:o.data||null});};
DocRef.prototype.collection=function(p){return new Query(this.path+'/'+p,{});};
DocRef.prototype.onSnapshot=function(next,error){
  var self=this;
  return stream('kind=doc&path='+encodeURIComponent(this.path),function(m){next(docSnap(self.id,m.data));},error);
};
function Query(path,q){this.path=path;this.q=q;}
Query.prototype._with=function(patch){var q=JSON.parse(JSON.stringify(this.q));Object.keys(patch).forEach(function(k){if(k==='where')(q.where=q.where||[]).push(patch.where);else q[k]=patch[k];});var n=new Query(this.path,q);return n;};
Query.prototype.where=function(f,op,v){return this._with({where:[f,op,v]});};
Query.prototype.orderBy=function(f,dir){return this._with({orderBy:[f,dir||'asc']});};
Query.prototype.limit=function(n){return this._with({limit:n});};
Query.prototype.get=function(){return post({op:'query',path:this.path,query:this.q}).then(function(r){return querySnap(r.rows);});};
Query.prototype.onSnapshot=function(next,error){
  return stream('kind=col&path='+encodeURIComponent(this.path)+'&q='+encodeURIComponent(JSON.stringify(this.q)),function(m){next(querySnap(m.rows));},error);
};
Query.prototype.doc=function(id){return new DocRef(this.path+'/'+(id||('d'+Date.now().toString(36)+Math.random().toString(36).slice(2,8))));};
Query.prototype.add=function(data){var r=this.doc();return r.set(data).then(function(){return r;});};
var db={doc:function(p){return new DocRef(p);},collection:function(p){return new Query(p,{});}};
return {connect:function(){
  return fetch((window.GC_BASE||'')+'/api/health').then(function(r){return r.ok?r.json():null;}).then(function(j){return j&&j.ok?db:null;}).catch(function(){return null;});
}};
})();
