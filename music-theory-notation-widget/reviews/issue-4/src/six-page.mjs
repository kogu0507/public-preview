import {createLessonModel} from './lesson-model.mjs';
import {prepareScoreImage} from './score-presentation.mjs';
import {lessonRelations,signatureLabel,fifthsWindow,rhythmCorrespondence} from './six-review-support.mjs';
import {noteNames} from './note-names.mjs';
const root=document.getElementById('lesson'),rev='mobile-20261026';
const assets=new URL('../assets/',import.meta.url),scores=new URL('lessons/pd001-review/',assets),owned=[];
const full={clef:true,keySignature:true,notes:true},empty={clef:false,keySignature:false,notes:false};
function n(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function disclosure(title){const d=n('details');d.append(n('summary',title));return d;}
function section(number,title){const s=n('section');s.id='question-'+number;s.append(n('h2',`問${number}｜${title}`));return s;}
function table(headers,rows,blank=false){const t=n('table'),head=n('thead'),hr=n('tr'),body=n('tbody');for(const h of headers){const th=n('th',h);th.scope='col';hr.append(th);}head.append(hr);for(const row of rows){const tr=n('tr');row.forEach((text,i)=>{const cell=n(i?'td':'th');if(!i)cell.scope='row';if(blank&&i){const line=n('span',undefined,'answer-line');line.setAttribute('aria-label',row[0]+' '+headers[i]);cell.append(line);}else cell.textContent=text;tr.append(cell);});body.append(tr);}t.append(head,body);return t;}
function image(url,alt,cls){const f=n('figure',undefined,cls),img=n('img');img.className='score';img.src=url;img.alt=alt;f.append(img);return f;}
function sourceImage(file,alt){const url=new URL(file,scores);url.searchParams.set('rev',rev);return image(url.href,alt);}
async function widgetImage(task,manifest,state,{example=false,cls}={}){const entry=manifest.scores[example?task.exampleScoreId:task.scoreId],filename=state.notes?entry.svg:entry.questionSvg;const result=await prepareScoreImage(new URL('scores/'+filename,assets).href,state);if(result.owned)owned.push(result.url);return image(result.url,state.notes?'完成譜':'記譜用五線',cls);}
function printControls(){const panel=n('div',undefined,'print-controls');for(const [label,open]of [['問題を印刷',false],['解答を含めて印刷',true]]){const b=n('button',label);b.type='button';b.onclick=()=>{root.querySelectorAll('details').forEach(d=>d.open=false);root.querySelector('#answers').open=open;window.print();};panel.append(b);}return panel;}
async function questionScore(task,manifest){
 const panel=n('div',undefined,'task-block');panel.dataset.lessonTask=task.id;
 panel.append(n('h3',task.notation==='key-signature'?'（1）高音部譜表に調号を用いて書きなさい。':'（2）調号を用いず、臨時記号のみで書きなさい。'));
 const screen=await widgetImage(task,manifest,empty,{cls:'screen-score'}),img=screen.querySelector('img');img.dataset.hintState='none';panel.append(screen,await widgetImage(task,manifest,empty,{cls:'print-only'}));
 const help=n('div',undefined,'screen-help');help.append(n('h4','ヒント'));
 const controls=n('div',undefined,'hint-controls');
 const states=[['空五線（ヒントなし）','none',empty],['音部記号のみ','clef',{...empty,clef:true}]];
 if(task.notation==='key-signature')states.push(['音部記号と調号','clef-key',{...empty,clef:true,keySignature:true}]);
 const urls=new Map([['none',img.src]]);
 for(const [,id,state]of states)if(id!=='none')urls.set(id,(await widgetImage(task,manifest,state)).querySelector('img').src);
 urls.set('answer',(await widgetImage(task,manifest,full)).querySelector('img').src);
 let hint='none',showAnswer=false;
 const choice=n('select');choice.id='hint-'+task.id;choice.dataset.hintSelect='';choice.setAttribute('aria-label','ヒントの表示');
 img.id='score-'+task.id;choice.setAttribute('aria-controls',img.id);
 for(const [label,id]of states){const option=n('option',label);option.value=id;choice.append(option);}
 const answer=n('button','完成譜を一時表示（解答）');answer.type='button';answer.dataset.temporaryAnswer='';answer.setAttribute('aria-controls',img.id);
 function render(){
  img.src=urls.get(showAnswer?'answer':hint);img.dataset.hintState=showAnswer?'answer':hint;
  img.alt=showAnswer?'完成譜（解答を一時表示中）':'記譜用五線';choice.value=hint;
  answer.textContent=showAnswer?'完成譜を隠す（ヒントに戻る）':'完成譜を一時表示（解答）';answer.setAttribute('aria-pressed',String(showAnswer));
 }
 choice.onchange=()=>{hint=choice.value;showAnswer=false;render();};
 answer.onclick=()=>{showAnswer=!showAnswer;render();};controls.append(choice,answer);render();help.append(controls);panel.append(help);return panel;
}
async function main(){
 const responses=await Promise.all([fetch(new URL('lessons.json',assets)),fetch(new URL('scores/manifest.json',assets)),fetch(new URL('bundle.json?rev='+rev,scores))]);if(responses.some(r=>!r.ok))throw Error('教材データを取得できません。');
 const [catalog,manifest,data]=await Promise.all(responses.map(r=>r.json())),lesson=catalog.lessons.find(l=>l.id===root.dataset.lesson),model=createLessonModel(lesson),content=document.createDocumentFragment();
 document.title=lesson.title+'｜楽典6問・校閲候補';content.append(n('p','楽典総合問題','eyebrow'),n('h1',lesson.title),n('p','校閲用プレビュー','review-banner'),printControls());
 function questionSource(number){
  const figure=n('figure',undefined,'question-source');if(number===1)figure.id='common-score';
  const file=number===1?data.questionSources.noteNames:number===2?data.questionSources.intervals:data.commonSvg;
  figure.append(n('figcaption','譜例（全8小節）'),sourceImage(file,'原曲全8小節・2段。音符1から25を順に付番。'));
  const link=n('a','譜例を拡大','screen-help');link.href=figure.querySelector('img').src;link.target='_blank';link.rel='noopener';figure.append(link);
  if(number<=2)figure.append(n('p','色と下線の付いた番号がこの問の対象です。','number-legend'));
  if(number===1)figure.append(n('p',lesson.source.credit,'source-link'));
  return figure;
 }
 const q1=section(1,'音名');q1.append(questionSource(1),n('p','指定された音符番号の音名を、日本語・英語・ドイツ語で答えなさい。'),table(['音符番号','日本語','英語','ドイツ語'],data.notes.map(t=>['音符'+t.number,'','','']),true));content.append(q1);
 const q2=section(2,'音程');q2.append(questionSource(2),n('p','指定された音符番号による音程を答えなさい（種類・度数・上行／下行）。'),table(['音符番号','音程'],data.intervals.map(t=>[t.location,'']),true));content.append(q2);
 const nameRows=[['日本語',model.names.japanese],['英語',model.names.english],['ドイツ語',model.names.german]],relationRows=lessonRelations(model).map(([relation,key])=>[relation,key.displayName,signatureLabel(key)]);
 const q3=section(3,'調名と関係調');q3.append(questionSource(3),n('p','（1）調名を答えなさい。日本語／英語／ドイツ語の3か国語で答えること。'),table(['調名','解答'],nameRows,true),n('p','（2）関係調の調名と調号を答えなさい。（例：♭1つ／調号なし／♯1つ）'),table(['関係調','調名','調号'],relationRows,true));content.append(q3);
 for(const kind of ['scale','diatonic-triads']){
  const isScale=kind==='scale',q=section(isScale?4:5,isScale?'音階':'三和音');q.append(questionSource(isScale?4:5),n('p',isScale?'問3で答えた調の音階を、例の書式に合わせて書きなさい。短調の場合は、自然短音階・和声的短音階・旋律的短音階（上行形・下行形）を書くこと。':'問4で書いた音階の各音上に、基本形の三和音を書式例にならって書きなさい。短調の場合は和声的短音階を用いること。'));
  const example=n('div',undefined,'format-example');example.append(n('h3','書式例（ト長調）'));
  for(const task of model.sections.filter(t=>t.kind===kind)){example.append(n('p',task.notation==='key-signature'?'調号あり':'臨時記号のみ'),await widgetImage(task,manifest,full,{example:true}));}q.append(example);
  for(const task of model.sections.filter(t=>t.kind===kind))q.append(await questionScore(task,manifest));content.append(q);
 }
 const q6=section(6,'音価と拍子');q6.append(questionSource(6),n('p','譜例の音価と拍子を書き換えなさい。'));
 for(const [i,r]of data.rewrites.entries()){const block=n('div',undefined,'task-block rewrite-task');block.dataset.meter=r.meter;block.append(n('h3',`（${i+1}）音価を${r.factor}倍にして${r.meter}拍子に。`),sourceImage(r.blankSvg,`${r.meter}・全8小節の記入用五線`));q6.append(block);}content.append(q6);
 const answers=disclosure('解答・解説を開く');answers.id='answers';answers.className='answer-section';
 const a1=n('div',undefined,'answer-copy');a1.append(n('h2','問1の解答'),table(['音符番号','日本語','英語','ドイツ語'],data.notes.map(t=>{const names=noteNames(t);return ['音符'+t.number,names.japanese,names.english,names.german];})),n('p','調号を含めて音名を読みます。ドイツ語のBは変ロ、Hはロを表します。'));answers.append(a1);
 const a2=n('div',undefined,'answer-copy');a2.append(n('h2','問2の解答'),table(['音符番号','音程'],data.intervals.map(t=>[t.location,t.answer])),n('p','音名の文字で度数を数え、半音の数と合わせて種類を確かめます。'));answers.append(a2);
 const a3=n('div',undefined,'answer-copy');a3.append(n('h2','問3の解答'),table(['調名','解答'],nameRows),table(['関係調','調名','調号'],relationRows));
 const diagram=n('figure',undefined,'related-key-component');diagram.append(n('figcaption',model.names.japanese+'を中心にした五度圏の一部'));
 const grid=n('div',undefined,'relation-diagram');grid.setAttribute('role','group');grid.setAttribute('aria-label','調号順の長調と短調の関係');
 const columns=fifthsWindow(model),header=n('div',undefined,'relation-header');for(const c of columns)header.append(n('span',c.label));grid.append(header);
 for(const family of ['major','minor']){const row=n('div',undefined,'relation-row');row.setAttribute('aria-label',family==='major'?'長調':'短調');for(const column of columns){const cell=n('div',undefined,'relation-key'),item=column[family];if(item){cell.append(n('span',item[0]),n('strong',item[1].displayName));if(item[0]==='主調')cell.classList.add('is-current');}else cell.classList.add('is-empty');row.append(cell);}grid.append(row);}
 diagram.append(grid);a3.append(diagram,n('p','横の1列が五度の隔たりを表します。属調は右隣、下属調は左隣。同じ列の長調と短調が平行調です。同主調は主音が同じ長調と短調で、調号は異なります。'));answers.append(a3);
 for(const kind of ['scale','diatonic-triads']){const a=n('div',undefined,'answer-copy');a.append(n('h2',kind==='scale'?'問4の解答':'問5の解答'));for(const task of model.sections.filter(t=>t.kind===kind))a.append(n('p',task.notation==='key-signature'?'調号あり':'臨時記号のみ'),await widgetImage(task,manifest,full));a.append(n('p',kind==='scale'?'長音階の音程配列は全音・全音・半音・全音・全音・全音・半音です。':'三和音の種類は長・短・短・長・長・短・減の順です。'));answers.append(a);}
 const a6=n('div',undefined,'answer-copy');a6.append(n('h2','問6の解答'));for(const [i,r]of data.rewrites.entries()){const block=n('div',undefined,'rewrite-answer');block.dataset.meter=r.meter;block.append(n('h3',`（${i+1}）${r.meter}拍子`),sourceImage(r.svg,`${r.meter}・全8小節の正答譜`));const link=n('a','正答譜を拡大','screen-help');link.href=block.querySelector('img').src;link.target='_blank';link.rel='noopener';block.append(link);a6.append(block);}a6.append(n('p','音符・休符とも同じ割合で音価を変えます。最後の付点全音符は、3/4では付点2分音符、3/8では付点4分音符になります。'));a6.append(n('h3','リズム対応表'),table(['原譜（3/2）','1/2倍（3/4）','1/4倍（3/8）'],rhythmCorrespondence()));answers.append(a6);content.append(answers);
 root.replaceChildren(content);root.dataset.ready='true';root.setAttribute('aria-busy','false');
}
window.addEventListener('pagehide',()=>owned.forEach(url=>URL.revokeObjectURL(url)));
main().catch(e=>{root.setAttribute('aria-busy','false');const p=n('p','教材を表示できませんでした。'+e.message,'error');p.setAttribute('role','alert');root.append(p);});
