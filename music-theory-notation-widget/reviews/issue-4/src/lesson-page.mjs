import {createLessonModel,keyNames,relatedKeys} from './lesson-model.mjs';
import {prepareScoreImage} from './score-presentation.mjs';
import {loadSixQuestionData,sourceQuestions,sourceAnswers,writingQuestion,writingAnswer,reviewControls} from './six-questions.mjs';

const root=document.getElementById('lesson');
const six=root.dataset.edition==='six';
const assetBase=new URL('../assets/',import.meta.url);
const appUrl=new URL('../index.html',import.meta.url);
const ownedUrls=[];
const full={clef:true,keySignature:true,notes:true};
const kindNames={scale:'音階','diatonic-triads':'音階固有三和音'};
const notationNames={'key-signature':'調号を用いて書きなさい','accidentals-only':'調号を用いず、臨時記号のみで書きなさい'};
function node(tag,text,className){const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(className)item.className=className;return item;}
function table(rows,{blank=false}={}) {
  const result=node('table'),body=node('tbody');
  for(const [label,value] of rows){const row=node('tr'),heading=node('th',label);heading.scope='row';const cell=node('td');if(blank){const line=node('span',undefined,'answer-line');line.setAttribute('aria-label',`${label}の解答欄`);cell.append(line);}else cell.textContent=value;row.append(heading,cell);body.append(row);}result.append(body);return result;
}
function namesTable(names,blank=false){return table([['日本語',names.japanese],['英語',names.english],['ドイツ語',names.german]],{blank});}
function relationsTable(relations,blank=false){return table([['属調',relations.dominant.displayName],['下属調',relations.subdominant.displayName],['平行調',relations.relative.displayName]],{blank});}
function disclosure(title){const details=node('details');details.append(node('summary',title));return details;}
async function completedScore(section,manifest,{example=false}={}) {
  const id=example?section.exampleScoreId:section.scoreId,entry=manifest.scores[id];
  if(!entry)throw new Error('完成譜が見つかりません。');
  // Identical full-state SVG composition to the iframe; no separate note engine.
  const image=await prepareScoreImage(new URL(`scores/${entry.svg}`,assetBase).href,full);
  if(image.owned)ownedUrls.push(image.url);
  const figure=node('figure'),img=node('img');img.className='score';img.src=image.url;img.alt=`${(example?section.example:section.answer).key.displayName}の${kindNames[section.kind]}、${section.notation==='key-signature'?'調号あり':'各変化音に臨時記号を明示'}。`;
  figure.append(img);return figure;
}
async function printBlank(section,manifest){
  const entry=manifest.scores[section.scoreId];
  const image=await prepareScoreImage(new URL(`scores/${entry.questionSvg}`,assetBase).href,{clef:false,keySignature:false,notes:false});
  if(image.owned)ownedUrls.push(image.url);
  const figure=node('figure',undefined,'print-only'),img=node('img');img.className='score';img.src=image.url;img.alt='記譜用の空五線';figure.append(img);return figure;
}
async function main(){
  const responses=await Promise.all([fetch(new URL('lessons.json',assetBase)),fetch(new URL('scores/manifest.json',assetBase))]);
  if(responses.some(item=>!item.ok))throw new Error('教材データを取得できません。');
  const [catalog,manifest]=await Promise.all(responses.map(item=>item.json()));
  const lesson=catalog.lessons.find(item=>item.id===root.dataset.lesson);
  const model=createLessonModel(lesson);
  const sourceData=six?await loadSixQuestionData():null;
  document.title=`${lesson.title}｜楽典総合問題`;
  const content=document.createDocumentFragment();
  content.append(node('p','楽典総合問題 · 既存曲の楽譜から','eyebrow'),node('h1',lesson.title),node('p',`次の楽譜を見て、問1〜問${six?6:3}に答えなさい。`));
  if(six){content.append(node('p','非本番・Human校閲用候補。対象音の選び方・難度・教材採用・掲載権利は確認待ちです。','review-banner'),reviewControls(root));document.title+='｜6問・非本番';}
  content.append(node('p','五線譜と文字の解答は、紙やノートに書いてください。各譜例で必要なヒントや解答を確認できます。','notice'));
  const source=node('figure',undefined,'source-card');source.append(node('figcaption','出題楽譜'));
  if(!lesson.source?.svg)throw new Error('原曲の楽譜が未登録です。');
  const sourceImg=node('img');sourceImg.className='score';sourceImg.src=new URL(lesson.source.svg,assetBase).href;sourceImg.alt=lesson.source.alt;source.append(sourceImg);
  source.append(node('p',lesson.source.caption,'muted'));
  if(lesson.source.credit){const credit=node('p',lesson.source.credit,'source-link');source.append(credit);}
  if(lesson.source.url){const a=node('a','出典・原資料');a.href=lesson.source.url;a.target='_blank';a.rel='noopener';source.append(a);}
  if(six){const link=node('a','原曲譜を別画面で開く（拡大）','screen-help');link.href=sourceImg.src;link.target='_blank';link.rel='noopener';source.append(link);}
  content.append(source);

  if(six)content.append(...sourceQuestions(sourceData));

  const q1=node('section');q1.id='question-1';q1.append(node('h2','問1｜調名と関係調'),node('p','（1）この楽譜の調名を、日本語・英語・ドイツ語で書きなさい。'),namesTable(model.names,true),node('p','（2）この調の属調・下属調・平行調を、日本語で答えなさい。'),relationsTable(model.related,true));
  const example1=disclosure('例を開く（別の調を使った解答例）');example1.append(node('p',`${model.exampleKey.displayName}の場合`),namesTable(keyNames(model.exampleKey.id)),relationsTable(relatedKeys(model.exampleKey.id)));q1.append(example1);content.append(q1);
  if(six){q1.id='question-3';q1.querySelector('h2').textContent='問3｜調名と関係調';}

  for(const kind of ['scale','diatonic-triads']){
    const q=node('section');q.id=kind==='scale'?'question-2':'question-3';
    q.append(node('h2',kind==='scale'?'問2｜音階':'問3｜音階固有三和音'));
    if(six){q.id=kind==='scale'?'question-4':'question-5';q.querySelector('h2').textContent=kind==='scale'?'問4｜音階':'問5｜音階固有三和音';}
    q.append(node('p',kind==='scale'?'高音部譜表に、この楽譜の調の長音階を、主音から1オクターブ上の主音まで上行形で書きなさい。':'高音部譜表に、この楽譜の調の7つの音階固有三和音を、第1音から第7音の順に基本形で書きなさい。'));
    let index=0;
    for(const section of model.sections.filter(item=>item.kind===kind)){
      const block=node('div',undefined,'task-block');block.append(node('h3',`（${++index}）${notationNames[section.notation]}`));
      const example=disclosure('例を開く（別の調の完成譜）');example.append(node('p',`${model.exampleKey.displayName}の${kindNames[kind]}`),await completedScore(section,manifest,{example:true}));block.append(example);
      const frame=node('iframe');frame.src=appUrl.href+section.query;frame.title=`問${kind==='scale'?2:3}（${index}）${kindNames[kind]}の解答用五線`;frame.allowFullscreen=true;frame.dataset.lessonTask=section.id;frame.loading='eager';
      if(six)frame.title=`問${kind==='scale'?4:5}（${index}）${kindNames[kind]}の解答用五線`;
      block.append(frame,await printBlank(section,manifest));q.append(block);
    }
    q.append(node('p','「音符を表示」は完成譜の音符を示すヒントです。「解答を見る」で音部記号・調号・音符をすべて表示します。調号を使わない設問では調号のヒントはありません。','muted screen-help'));content.append(q);
  }
  if(six){
    content.append(writingQuestion(sourceData));
    const reflection=disclosure('任意｜演奏について考える');reflection.className='screen-help';reflection.append(node('p','長い音や休符を、どのような息づかい・フレーズで演奏したいですか。原曲を確かめ、自分の考えを先生に相談してみましょう。'));content.append(reflection);
  }
  const answers=disclosure('解答・解説を開く');answers.id='answers';answers.className='answer-section';
  if(six)answers.append(...sourceAnswers(sourceData));
  const answer1=node('div',undefined,'answer-copy');answer1.append(node('h2','問1の解答'),namesTable(model.names),relationsTable(model.related),node('p',`この楽譜は${model.names.japanese}です。属調は主音の完全5度上、下属調は完全5度下の調です。平行調は同じ調号を持つ長調・短調の組です。`));answers.append(answer1);
  if(six)answer1.querySelector('h2').textContent='問3の解答';
  for(const kind of ['scale','diatonic-triads']){
    const answer=node('div',undefined,'answer-copy');answer.append(node('h2',kind==='scale'?'問2の解答':'問3の解答'));
    if(six)answer.querySelector('h2').textContent=kind==='scale'?'問4の解答':'問5の解答';
    for(const section of model.sections.filter(item=>item.kind===kind)){answer.append(node('p',section.notation==='key-signature'?'調号あり':'臨時記号のみ','notation-label'),await completedScore(section,manifest));}
    answer.append(node('p',kind==='scale'?'長音階の音程配列は、全音・全音・半音・全音・全音・全音・半音です。':'各音を根音として、音階の構成音を一つおきに三つ重ねます。I・ii・iii・IV・V・vi・vii°の順に、長・短・短・長・長・短・減三和音となります。'));answers.append(answer);
  }
  if(six)answers.append(writingAnswer(sourceData));
  content.append(answers);
  if(lesson.related?.url){const related=node('section');related.append(node('h2','関連教材'));const link=node('a',lesson.related.title);link.href=lesson.related.url;related.append(link);content.append(related);}
  root.replaceChildren(content);root.setAttribute('aria-busy','false');root.dataset.ready='true';
}
window.addEventListener('pagehide',()=>ownedUrls.forEach(url=>URL.revokeObjectURL(url)));
main().catch(error=>{root.setAttribute('aria-busy','false');const status=document.getElementById('lesson-status')||node('p');status.className='error';status.setAttribute('role','alert');status.textContent=`教材を表示できませんでした。${error.message}`;if(!status.isConnected)root.append(status);});
