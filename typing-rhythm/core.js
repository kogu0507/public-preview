/* Shared, dependency-free chart/time/judgement model. Browser + Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RhythmCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const LANES=[['左小指','qaz'],['左薬指','wsx'],['左中指','edc'],['左人差し指 外','rfv'],['左人差し指 内','tgb'],['右人差し指 内','yhn'],['右人差し指 外','ujm'],['右中指','ik'],['右薬指','ol'],['右小指','p']];
 const WINDOW=.180,GRACE=.050,EPS=1e-9,MAX_BYTES=5*1024*1024;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function upperBound(array,value,get=x=>x){let l=0,r=array.length;while(l<r){const m=(l+r)>>>1;if(get(array[m])<=value)l=m+1;else r=m;}return l;}
 function seconds(p,k,x){return Math.abs(k)<1e-12?60*x/p:60*Math.log1p(k*x/p)/k;}
 function beatDelta(p,k,t){return Math.abs(k)<1e-12?t*p/60:p*Math.expm1(k*t/60)/k;}
 function timeline(events){
  const controls=events.filter(e=>e.e==='tempo'||e.e==='tempoRamp');const segments=[];let beat=0,time=0,bpm;
  function add(end,slope=0){segments.push({beat,end,time,bpm,slope});time+=seconds(bpm,slope,end-beat);bpm+=slope*(end-beat);beat=end;if(!Number.isFinite(time))throw Error('テンポから計算した時刻が大きすぎます。');}
  for(const e of controls){if(e.beat<beat-EPS)throw Error(`イベント${e.index+1}: テンポ変化が重複しています。`);if(e.beat>beat){if(!bpm)throw Error('beat=0にtempoが必要です。');add(e.beat);}if(e.e==='tempo')bpm=e.bpm;else{if(!bpm)throw Error('tempoRampより前にtempoが必要です。');add(e.toBeat,(e.toBpm-bpm)/(e.toBeat-e.beat));}}
  if(!bpm)throw Error('beat=0にtempoが必要です。');segments.push({beat,end:Infinity,time,bpm,slope:0});
  const initial=segments[0].bpm;
  function at(b){if(b<0)return b*60/initial;const s=segments[Math.max(0,upperBound(segments,b,s=>s.beat)-1)];return s.time+seconds(s.bpm,s.slope,b-s.beat);}
  function inverse(t){if(t<0)return t*initial/60;const s=segments[Math.max(0,upperBound(segments,t,s=>s.time)-1)];return s.beat+beatDelta(s.bpm,s.slope,t-s.time);}
  return {segments,initial,at,inverse};
 }
 function parseChart(text){if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('JSONは5MB以下にしてください。');let d;try{d=JSON.parse(text);}catch{throw Error('JSONを読めません。コメントや末尾のカンマを確認してください。');}return validateChart(d);}
 function validateChart(d){
  const fail=(i,field,message)=>{throw Error(i===null?`${field}: ${message}`:`イベント${i+1} / ${field}: ${message}`);};
  const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
  if(!d||Array.isArray(d)||typeof d!=='object')fail(null,'JSON','オブジェクト形式にしてください。');
  if(d.schemaVersion!==1)fail(null,'schemaVersion','対応している版は1です。');
  for(const f of ['id','revision','title'])if(typeof d[f]!=='string'||!d[f].trim())fail(null,f,'空でない文字列が必要です。');
  if(!Number.isSafeInteger(d.countInBeats)||d.countInBeats<0)fail(null,'countInBeats','0以上の整数にしてください。');
  if(!Array.isArray(d.events)||!d.events.length||d.events.length>100000)fail(null,'events','1〜100,000個のイベントが必要です。');
  const warnings=[],events=[],noteBeats=new Set(),controlBeats=new Set();let initialCount=0;
  for(let i=0;i<d.events.length;i++){
   const e=d.events[i];if(!e||typeof e!=='object'||Array.isArray(e))fail(i,'event','オブジェクトが必要です。');
   if(typeof e.e!=='string'||!e.e)fail(i,'e','イベント名が必要です。');if(!finite(e.beat)||e.beat<0)fail(i,'beat','0以上の有限数が必要です。');
   if(e.e==='tempo'||e.e==='tempoRamp'){
    const f=e.e==='tempo'?'bpm':'toBpm';if(!finite(e[f])||e[f]<20||e[f]>400)fail(i,f,'20〜400にしてください。');
    if(controlBeats.has(e.beat))fail(i,'beat','同じ拍にテンポ制御を重ねられません。');controlBeats.add(e.beat);
    if(e.e==='tempo'&&e.beat===0)initialCount++;
    if(e.e==='tempoRamp'&&(!finite(e.toBeat)||e.toBeat<=e.beat))fail(i,'toBeat','開始拍より後の有限数が必要です。');
   }else if(e.e==='note'){
    if(typeof e.key!=='string'||!/^[a-z]$/.test(e.key))fail(i,'key','小文字a〜zの1文字にしてください。');
    if(noteBeats.has(e.beat))fail(i,'beat','同時に複数のノートは置けません。');noteBeats.add(e.beat);
   }else if(e.e==='hint'){if(typeof e.text!=='string'||e.text.length>2000)fail(i,'text','2,000文字以内の文字列にしてください。');}
   else if(e.e==='barline'){if(e.style!==0&&e.style!==1)fail(i,'style','0または1にしてください。');}
   else {warnings.push(`イベント${i+1}: 未対応の「${e.e}」を無視します。この教材では自己ベストを保存しません。`);continue;}
   events.push({...e,index:i});
  }
  if(initialCount!==1)fail(null,'tempo','beat=0に1個のtempoが必要です。');
  if(!noteBeats.size)fail(null,'note','1個以上のノートが必要です。');
  events.sort((a,b)=>a.beat-b.beat||a.index-b.index);const map=timeline(events);
  const notes=events.filter(e=>e.e==='note').map(e=>({...e,time:map.at(e.beat),lane:LANES.findIndex(l=>l[1].includes(e.key))}));
  const hints=events.filter(e=>e.e==='hint').map(e=>({...e,time:map.at(e.beat)}));
  const barlines=events.filter(e=>e.e==='barline').map(e=>({...e,time:map.at(e.beat)}));
  let lastBeat=events.at(-1).beat;for(const s of map.segments)lastBeat=Math.max(lastBeat,s.beat);
  const duration=map.at(lastBeat),countInSeconds=d.countInBeats*60/map.initial;
  if(!Number.isFinite(duration)||!Number.isFinite(countInSeconds)||!Number.isFinite(duration+countInSeconds)||notes.some(n=>!Number.isFinite(n.time)))fail(null,'beat','計算した時刻が大きすぎます。');
  const lastKey=new Map();let dense=0;for(const n of notes){if(lastKey.has(n.key)&&n.time-lastKey.get(n.key)<.360-EPS)dense++;lastKey.set(n.key,n.time);}if(dense)warnings.push(`同じキーの間隔が360ms未満の箇所が${dense}個あります。先のノートから判定します。`);
  return {id:d.id,revision:d.revision,title:d.title,countInBeats:d.countInBeats,events,notes,hints,barlines,map,lastBeat,duration,countInSeconds,warnings,ranked:events.length===d.events.length};
 }
 function makeSession(chart,speed){
  const notes=chart.notes.map(n=>({...n,time:n.time/speed,state:null}));const byKey=new Map(),cursors=new Map();for(const n of notes){if(!byKey.has(n.key))byKey.set(n.key,[]);byKey.get(n.key).push(n);}let expiry=0,raw=0,wrong=0,last=null;
  const counts={perfect:0,good:0,ok:0,miss:0,early:0,late:0};const first=notes[0].time,lastInput=notes.at(-1).time+WINDOW;
  function expire(cutoff){while(expiry<notes.length&&notes[expiry].time+WINDOW<cutoff-EPS){const n=notes[expiry++];if(!n.state){n.state='miss';counts.miss++;last={kind:'miss',key:n.key,delta:null};}}}
  function input(key,time){if(time<first-WINDOW-EPS||time>lastInput+EPS)return {kind:'ignored'};expire(time);const group=byKey.get(key)||[];let cursor=cursors.get(key)||0;while(cursor<group.length&&group[cursor].state)cursor++;cursors.set(key,cursor);const n=group[cursor];
   if(!n||Math.abs(time-n.time)>WINDOW+EPS){wrong++;last={kind:'wrong',key,delta:null};return last;}
   const delta=time-n.time,a=Math.abs(delta),kind=a<=.060+EPS?'perfect':a<=.120+EPS?'good':'ok';n.state=kind;raw+=kind==='perfect'?100:kind==='good'?70:40;counts[kind]++;if(delta<-.001)counts.early++;if(delta>.001)counts.late++;cursors.set(key,cursor+1);last={kind,key,delta};return last;
  }
  function snapshot(){return {score:Math.round(10000*clamp((raw-wrong*10)/(notes.length*100),0,1)),raw,wrong,counts:{...counts},last,judged:counts.perfect+counts.good+counts.ok+counts.miss,total:notes.length};}
  return {notes,input,expire,snapshot,first,lastInput,end:Math.max(chart.duration/speed,lastInput)+GRACE};
 }
 const recordKey=(chart,speed)=>'typing-rhythm:v1:'+JSON.stringify([chart.id,chart.revision,Number(speed).toFixed(1),'rules1']);
 function readBest(storage,key){try{const text=storage.getItem(key);if(!text)return {best:null,available:true};let d;try{d=JSON.parse(text);}catch{}if(!d||!Number.isInteger(d.score)||d.score<0||d.score>10000){storage.removeItem(key);return {best:null,available:true};}return {best:d,available:true};}catch{return {best:null,available:false};}}
 function saveBest(storage,key,result){const current=readBest(storage,key);if(!current.available)return {...current,updated:false};try{if(!current.best||result.score>current.best.score){storage.setItem(key,JSON.stringify(result));return {best:result,available:true,updated:true};}return {...current,updated:false};}catch{return {...current,available:false,updated:false};}}
 return {LANES,WINDOW,GRACE,EPS,MAX_BYTES,upperBound,timeline,parseChart,validateChart,makeSession,recordKey,readBest,saveBest};
});
