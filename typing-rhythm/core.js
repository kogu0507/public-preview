/* Shared, dependency-free chart/time/sound model. Browser + Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RhythmCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const LANES=[['左小指','qaz'],['左薬指','wsx'],['左中指','edc'],['左人差し指 外','rfv'],['左人差し指 内','tgb'],['右人差し指 内','yhn'],['右人差し指 外','ujm'],['右中指','ik,'],['右薬指','ol.'],['右小指','p']];
 const EPS=1e-9,MAX_BYTES=5*1024*1024;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

 const KEYS=Object.freeze([... 'qwertyuiopasdfghjklzxcvbnm',',','.','space']);
 const keyLabel=k=>k==='space'?'スペース':k.toUpperCase();
 const keyCode=code=>/^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():({Comma:',',Period:'.',Space:'space'})[code]||null;
 const keyLane=k=>k==='space'?-1:LANES.findIndex(l=>l[1].includes(k));
 const DRUMS=Object.freeze(Object.fromEntries(Array.from({length:29},(_,i)=>{const kind=['kick','tom','wood','snare','hat'][i%5],id=kind+'-'+(Math.floor(i/5)+1);return [id,{kind,pitch:Math.pow(2,Math.floor(i/5)/6),label:({kick:'太鼓',tom:'タム',wood:'木',snare:'スネア',hat:'ハット'})[kind]+' '+(Math.floor(i/5)+1)}];})));
 function standardSounds(preset){return Object.fromEntries([...KEYS].map((k,i)=>[k,preset==='chip'?48+i:Object.keys(DRUMS)[i]]));}
 function soundConfig(s,warnings=[]){
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(s===undefined)s={};if(!obj(s))throw Error('sound: オブジェクトが必要です。');
  let preset=s.preset===undefined?'chip':s.preset;
  if(typeof preset!=='string')throw Error('sound.preset: 文字列が必要です。');
  if(!['chip','drums'].includes(preset)){warnings.push('未対応の音色セットをピコピコへ戻しました。');preset='chip';}
  const map=standardSounds(preset);
  function value(v,where,fallback){if(v==='miss')return v;if(preset==='chip'){if(typeof v!=='number')throw Error(where+': MIDI番号36〜96の整数またはmissが必要です。');if(!Number.isInteger(v)||v<36||v>96)throw Error(where+': MIDI番号は36〜96の整数です。');return v;}if(typeof v!=='string')throw Error(where+': 打楽器IDまたはmissが必要です。');if(!Object.hasOwn(DRUMS,v)){warnings.push(where+': 未対応の音を標準音へ戻しました。');return fallback;}return v;}
  if(Object.hasOwn(s,'default'))for(const k of KEYS)map[k]=value(s.default,'sound.default',map[k]);
  if(s.keys!==undefined){if(!obj(s.keys))throw Error('sound.keys: オブジェクトが必要です。');for(const [k,v]of Object.entries(s.keys)){if(!KEYS.includes(k))throw Error('sound.keys: キーはa〜z、,、.、spaceです。');map[k]=value(v,'sound.keys.'+k,map[k]);}}
  return {preset,keys:map};
 }
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
    if(typeof e.key!=='string'||!KEYS.includes(e.key))fail(i,'key','a〜z、,、.、spaceのいずれかにしてください。');
    if(noteBeats.has(e.beat))fail(i,'beat','同時に複数のノートは置けません。');noteBeats.add(e.beat);
   }else if(e.e==='hint'){if(typeof e.text!=='string'||e.text.length>2000)fail(i,'text','2,000文字以内の文字列にしてください。');if(e.text2!==undefined&&(typeof e.text2!=='string'||e.text2.length>2000))fail(i,'text2','2,000文字以内の文字列にしてください。');}
   else if(e.e==='barline'){if(e.style!==0&&e.style!==1)fail(i,'style','0または1にしてください。');}
   else {warnings.push(`イベント${i+1}: 未対応の「${e.e}」を無視します。対応するアプリ版で確認してください。`);continue;}
   events.push({...e,index:i});
  }
  if(initialCount!==1)fail(null,'tempo','beat=0に1個のtempoが必要です。');
  if(!noteBeats.size)fail(null,'note','1個以上のノートが必要です。');
  events.sort((a,b)=>a.beat-b.beat||a.index-b.index);const map=timeline(events);
  const notes=events.filter(e=>e.e==='note').map(e=>({...e,time:map.at(e.beat),lane:keyLane(e.key)}));
  const hints=events.filter(e=>e.e==='hint').map(e=>({...e,time:map.at(e.beat)}));
  const barlines=events.filter(e=>e.e==='barline').map(e=>({...e,time:map.at(e.beat)}));
  let lastBeat=events.at(-1).beat;for(const s of map.segments)lastBeat=Math.max(lastBeat,s.beat);
  const duration=map.at(lastBeat),countInSeconds=d.countInBeats*60/map.initial;
  if(!Number.isFinite(duration)||!Number.isFinite(countInSeconds)||!Number.isFinite(duration+countInSeconds)||notes.some(n=>!Number.isFinite(n.time)))fail(null,'beat','計算した時刻が大きすぎます。');
  const sound=soundConfig(d.sound,warnings);for(const key of new Set(notes.map(n=>n.key)))if(sound.keys[key]==='miss')warnings.push(keyLabel(key)+'は教材で使いますがハズレ音です。sound.keysを確認してください。');
  return {id:d.id,revision:d.revision,title:d.title,countInBeats:d.countInBeats,events,notes,hints,barlines,map,lastBeat,duration,countInSeconds,warnings,sound};
 }
 return {LANES,KEYS,keyLabel,keyCode,keyLane,DRUMS,EPS,MAX_BYTES,upperBound,timeline,parseChart,validateChart,soundConfig,standardSounds};
});
