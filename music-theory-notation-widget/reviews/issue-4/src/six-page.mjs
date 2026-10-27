import {createLessonModel,keyNames} from './lesson-model.mjs';
import {prepareScoreImage} from './score-presentation.mjs';
import {lessonRelations,signatureLabel,fifthsWindow,intervalAnswer,keyAndToneRows,fifthsReference,RHYTHM_SOURCE,rhythmCardSteps,formatExampleKeys} from './six-review-support.mjs?rev=hints-20261027-qc';
import {noteNames} from './note-names.mjs';
const root=document.getElementById('lesson'),rev='hints-20261027-qc';
const assets=new URL('../assets/',import.meta.url),scores=new URL('lessons/pd001-review/',assets),owned=[];
const full={clef:true,keySignature:true,notes:true},empty={clef:false,keySignature:false,notes:false};
function n(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function disclosure(title){const d=n('details');d.append(n('summary',title));return d;}
function conceptHint(title,lines){const d=disclosure(title);d.className='screen-help concept-hint';for(const text of lines)d.append(n('p',text));return d;}
function section(number,title){const s=n('section');s.id='question-'+number;s.append(n('h2',`問${number}｜${title}`));return s;}
function table(headers,rows,blank=false){const t=n('table'),head=n('thead'),hr=n('tr'),body=n('tbody');for(const h of headers){const th=n('th',h);th.scope='col';hr.append(th);}head.append(hr);for(const row of rows){const tr=n('tr');row.forEach((text,i)=>{const cell=n(i?'td':'th');if(!i)cell.scope='row';if(blank&&i){const line=n('span',undefined,'answer-line');line.setAttribute('aria-label',row[0]+' '+headers[i]);cell.append(line);}else cell.textContent=text;tr.append(cell);});body.append(tr);}t.append(head,body);return t;}
function image(url,alt,cls){const f=n('figure',undefined,cls),img=n('img');img.className='score';img.src=url;img.alt=alt;f.append(img);return f;}
function sourceImage(file,alt,cls){const url=new URL(file,scores);url.searchParams.set('rev',rev);return image(url.href,alt,cls);}
async function widgetImage(task,manifest,state,{example=false,cls}={}){const entry=manifest.scores[example?task.exampleScoreId:task.scoreId],filename=state.notes?entry.svg:entry.questionSvg;const result=await prepareScoreImage(new URL('scores/'+filename,assets).href,state);if(result.owned)owned.push(result.url);return image(result.url,state.notes?'完成譜':'記譜用五線',cls);}
function printControls(){const panel=n('div',undefined,'print-controls');for(const [label,open]of [['問題を印刷',false],['解答を含めて印刷',true]]){const b=n('button',label);b.type='button';b.onclick=()=>{root.querySelectorAll('details').forEach(d=>d.open=false);root.querySelector('#answers').open=open;window.print();};panel.append(b);}return panel;}
async function questionScore(task,manifest,reference){
 const panel=n('div',undefined,'task-block');panel.dataset.lessonTask=task.id;
 panel.append(n('h3',task.notation==='key-signature'?'（1）高音部譜表に調号を用いて書きなさい。':'（2）調号を用いず、臨時記号のみで書きなさい。'));
 panel.append(reference);
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
 function questionSource(number,{id=false,repeat=false}={}){
  const figure=n('figure',undefined,'question-source'+(repeat?' repeated-reference':''));if(id)figure.id='common-score';
  const file=number===1?data.questionSources.noteNames:number===2?data.questionSources.intervals:data.commonSvg;
  const caption=n('figcaption',undefined,'source-toolbar'),link=n('a','譜例を拡大','screen-help');
  const img=sourceImage(file,'原曲全8小節・2段。音符1から25を順に付番。').querySelector('img');
  link.href=img.src;link.target='_blank';link.rel='noopener';caption.append(n('span','譜例（全8小節）'),link);figure.append(caption,img);return figure;
 }
 const q1=section(1,'音名');q1.append(n('p','指定された音符番号の音名を、日本語・英語・ドイツ語で答えなさい。'),questionSource(1,{id:true}),table(['音符番号','日本語','英語','ドイツ語'],data.notes.map(t=>['音符'+t.number,'','','']),true));
 q1.append(conceptHint('ヒント：音名の読み方',['まず五線上の位置を読んで幹音名を確かめます。','次に調号や、音符の前にある臨時記号を確認します。この譜例の調号は♭1つです。','ドイツ語はBが変ロ、Hがロです。英語のBと混同しないようにします。']));content.append(q1);
 const q2=section(2,'音程');q2.append(n('p','指定された音符番号による音程を答えなさい。'),questionSource(2),table(['音符番号','音程'],data.intervals.map(t=>[t.location,'']),true));
 q2.append(conceptHint('ヒント：音程の調べ方',['先に2音の幹音名を数え、何度かを確かめます（最初と最後の音を含めて数えます）。','次に調号や臨時記号を反映した実際の音の隔たりから、完全・長・短などの種類を判断します。','必要なら鍵盤で2音を確かめたり、別の楽典資料を参照してもかまいません。']));content.append(q2);
 const toneRows=keyAndToneRows(model),relationRows=lessonRelations(model).map(([relation,key])=>[relation,key.displayName,signatureLabel(key)]);
 const q3=section(3,'調名と関係調');q3.append(n('p','（1）調名と、その調における主音・属音・下属音・導音の音名を答えなさい。日本語／英語／ドイツ語の3か国語で答えること。'),questionSource(3),table(['','日本語','英語','ドイツ語'],toneRows,true),n('p','（2）関係調の調名と調号を答えなさい。（例：♭1つ／調号なし／♯1つ）'),table(['関係調','調名','調号'],relationRows,true));
 const fifthsHint=disclosure('ヒント：五度圏を表示');fifthsHint.id='fifths-hint';fifthsHint.className='screen-help';
 const scroll=n('div',undefined,'fifths-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','五度圏の調名一覧。横にスクロールできます。');
 const reference=fifthsReference(),languageSelect=n('select');languageSelect.id='fifths-language';languageSelect.dataset.fifthsLanguage='';languageSelect.setAttribute('aria-label','五度圏の調名表示言語');
 for(const [value,label] of [['japanese','日本語'],['english','English'],['german','Deutsch']]){const option=n('option',label);option.value=value;languageSelect.append(option);}
 function renderFifths(){const x=scroll.scrollLeft,language=languageSelect.value;scroll.replaceChildren(table(['調号',...reference.map(c=>c.label)],[['長調',...reference.map(c=>keyNames(c.major.id)[language])],['短調',...reference.map(c=>keyNames(c.minor.id)[language])]]));scroll.scrollLeft=x;}
 languageSelect.onchange=renderFifths;renderFifths();
 const langLabel=n('label','五度圏の調名表示言語');langLabel.htmlFor=languageSelect.id;langLabel.className='fifths-language-label';
 fifthsHint.append(langLabel,languageSelect,n('p','横にスクロールして確認できます。'),scroll);
 fifthsHint.addEventListener('toggle',()=>{if(fifthsHint.open&&!fifthsHint.dataset.positioned){scroll.scrollLeft=(scroll.scrollWidth-scroll.clientWidth)/2;fifthsHint.dataset.positioned='true';}});q3.append(fifthsHint);content.append(q3);
 for(const kind of ['scale','diatonic-triads']){
  const isScale=kind==='scale',q=section(isScale?4:5,isScale?'音階':'三和音');q.append(n('p',isScale?'問3（1）で答えた調の音階を、例の書式に合わせて書きなさい。短調の場合は、自然短音階・和声的短音階・旋律的短音階（上行形・下行形）を書くこと。':'問4で書いた音階の各音上に、基本形の三和音を書式例にならって書きなさい。短調の場合は和声的短音階を用いること。'));
  const example=n('div',undefined,'format-example');example.append(n('h3','書式例'));
  const {major:majorExampleKey,minor:minorExampleKey}=formatExampleKeys(model.key);
  const majorExamples=n('div',undefined,'example-family'),minorExamples=n('div',undefined,'example-family');majorExamples.dataset.exampleFamily='major';minorExamples.dataset.exampleFamily='minor';minorExamples.hidden=true;
  const exampleChoice=n('select');exampleChoice.dataset.exampleMode='';exampleChoice.setAttribute('aria-label','書式例の長調・短調を切り替える');
  for(const [value,label]of [['major','長調の書式例'],['minor','短調の書式例']]){const option=n('option',label);option.value=value;exampleChoice.append(option);}
  const exampleLabel=n('label','表示する書式例を選ぶ','example-select-label');exampleLabel.append(exampleChoice);example.append(exampleLabel);
  majorExamples.append(n('h4',majorExampleKey.displayName));minorExamples.append(n('h4',minorExampleKey.displayName));
  for(const task of model.sections.filter(t=>t.kind===kind)){
   const notation=task.notation,notationLabel=notation==='key-signature'?'調号あり':'臨時記号のみ';
   majorExamples.append(n('p',notationLabel),await widgetImage({exampleScoreId:[majorExampleKey.id,'major',notation,kind].join('--')},manifest,full,{example:true}));
   const forms=isScale?[['natural','自然短音階（上行）'],['harmonic','和声的短音階（上行）'],['melodic-ascending','旋律的短音階（上行形）'],['melodic-descending','旋律的短音階（下行形）']]:[['harmonic','和声的短音階による基本形三和音']];
   for(const [form,label]of forms){minorExamples.append(n('p',notationLabel+'・'+label),await widgetImage({exampleScoreId:[minorExampleKey.id,form,notation,kind].join('--')},manifest,full,{example:true}));}
  }
  exampleChoice.onchange=()=>{majorExamples.hidden=exampleChoice.value!=='major';minorExamples.hidden=exampleChoice.value!=='minor';};
  example.append(majorExamples,minorExamples);q.append(example);
  for(const [i,task]of model.sections.filter(t=>t.kind===kind).entries())q.append(await questionScore(task,manifest,questionSource(isScale?4:5,{repeat:i>0})));content.append(q);
 }
 const q6=section(6,'音価と拍子');q6.append(n('p','譜例の音価と拍子を書き換えなさい。'));
 for(const [i,r]of data.rewrites.entries()){
  const block=n('div',undefined,'task-block rewrite-task');block.dataset.meter=r.meter;
  const display=sourceImage(r.blankSvg,`${r.meter}・全8小節の記入用五線`,'rewrite-interactive screen-score');
  const paper=sourceImage(r.blankSvg,`${r.meter}・全8小節の記入用五線`,'rewrite-blank print-only');
  const displayImg=display.querySelector('img'),blankSrc=displayImg.src,answerSrc=sourceImage(r.svg,`${r.meter}・全8小節の正答譜`).querySelector('img').src;
  const controls=n('div',undefined,'rewrite-controls screen-help'),toggle=n('button','正答譜を一時表示（解答）');
  toggle.type='button';toggle.dataset.rewriteAnswerToggle='';toggle.setAttribute('aria-pressed','false');
  displayImg.id='rewrite-score-'+i;toggle.setAttribute('aria-controls',displayImg.id);displayImg.dataset.rewriteAnswer='hidden';
  toggle.onclick=()=>{const shown=toggle.getAttribute('aria-pressed')!=='true';displayImg.src=shown?answerSrc:blankSrc;displayImg.alt=shown?`${r.meter}・全8小節の正答譜（表示中）`:`${r.meter}・全8小節の記入用五線`;displayImg.dataset.rewriteAnswer=shown?'shown':'hidden';toggle.setAttribute('aria-pressed',String(shown));toggle.textContent=shown?'正答譜を隠す（問題に戻る）':'正答譜を一時表示（解答）';};
  controls.append(toggle);block.append(n('h3',`（${i+1}）音価を${r.factor}倍にして${r.meter}拍子に。`),questionSource(6,{repeat:i>0}),display,paper,controls);q6.append(block);
 }content.append(q6);
 const answers=disclosure('解答・解説を開く');answers.id='answers';answers.className='answer-section';
 const a1=n('div',undefined,'answer-copy');a1.append(n('h2','問1の解答'),table(['音符番号','日本語','英語','ドイツ語'],data.notes.map(t=>{const names=noteNames(t);return ['音符'+t.number,names.japanese,names.english,names.german];})),n('p','調号を含めて音名を読みます。ドイツ語のBは変ロ、Hはロを表します。'));answers.append(a1);
 const a2=n('div',undefined,'answer-copy');a2.append(n('h2','問2の解答'),table(['音符番号','音程'],data.intervals.map(t=>[t.location,intervalAnswer(t)])),n('p','音名の文字で度数を数え、半音の数と合わせて種類を確かめます。'));answers.append(a2);
 const a3=n('div',undefined,'answer-copy');a3.append(n('h2','問3の解答'),table(['','日本語','英語','ドイツ語'],toneRows),table(['関係調','調名','調号'],relationRows));
 const diagram=n('figure',undefined,'related-key-component');diagram.append(n('figcaption',model.names.japanese+'を中心にした五度圏の一部'));
 const grid=n('div',undefined,'relation-diagram');grid.setAttribute('role','group');grid.setAttribute('aria-label','調号順の長調と短調の関係');
 const columns=fifthsWindow(model),header=n('div',undefined,'relation-header');for(const c of columns)header.append(n('span',c.label));grid.append(header);
 for(const family of ['major','minor']){const row=n('div',undefined,'relation-row');row.setAttribute('aria-label',family==='major'?'長調':'短調');for(const column of columns){const cell=n('div',undefined,'relation-key'),item=column[family];if(item){cell.append(n('span',item[0]),n('strong',item[1].displayName));if(item[0]==='主調')cell.classList.add('is-current');}else cell.classList.add('is-empty');row.append(cell);}grid.append(row);}
 diagram.append(grid);a3.append(diagram,n('p','横の1列が五度の隔たりを表します。属調は右隣、下属調は左隣。同じ列の長調と短調が平行調です。同主調は主音が同じ長調と短調で、調号は異なります。'));answers.append(a3);
 for(const kind of ['scale','diatonic-triads']){const a=n('div',undefined,'answer-copy');a.append(n('h2',kind==='scale'?'問4の解答':'問5の解答'));for(const task of model.sections.filter(t=>t.kind===kind))a.append(n('p',task.notation==='key-signature'?'調号あり':'臨時記号のみ'),await widgetImage(task,manifest,full));a.append(n('p',kind==='scale'?'長音階の音程配列は全音・全音・半音・全音・全音・全音・半音です。':'三和音の種類は長・短・短・長・長・短・減の順です。'));answers.append(a);}
 const a6=n('div',undefined,'answer-copy');a6.append(n('h2','問6の解答'));for(const [i,r]of data.rewrites.entries()){const block=n('div',undefined,'rewrite-answer');block.dataset.meter=r.meter;block.append(n('h3',`（${i+1}）${r.meter}拍子`),sourceImage(r.svg,`${r.meter}・全8小節の正答譜`));const link=n('a','正答譜を拡大','screen-help');link.href=block.querySelector('img').src;link.target='_blank';link.rel='noopener';block.append(link);a6.append(block);}a6.append(n('p','音符・休符とも同じ割合で音価を変えます。最後の付点全音符は、3/4では付点2分音符、3/8では付点4分音符になります。'));a6.append(n('h3','リズムカード'));
 const cards=n('div',undefined,'rhythm-cards');for(const event of RHYTHM_SOURCE){const card=n('div',undefined,'rhythm-card');card.dataset.rhythmKind=event.kind;
  for(const step of rhythmCardSteps(event)){const cell=n('div',undefined,'rhythm-step');cell.append(n('p',step.label),sourceImage(step.svg,step.name),n('p',step.name,'rhythm-name'));card.append(cell);}cards.append(card);
 }a6.append(cards);answers.append(a6);content.append(answers,n('p',lesson.source.credit,'source-link'));
 root.replaceChildren(content);root.dataset.ready='true';root.setAttribute('aria-busy','false');
}
window.addEventListener('pagehide',()=>owned.forEach(url=>URL.revokeObjectURL(url)));
main().catch(e=>{root.setAttribute('aria-busy','false');const p=n('p','教材を表示できませんでした。'+e.message,'error');p.setAttribute('role','alert');root.append(p);});
