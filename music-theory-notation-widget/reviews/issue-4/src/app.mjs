import {KEYS,SCALE_FORMS,createDisplayModel,getKey} from './theory.mjs';
import {DEFAULT_CONFIG,parseParams,serializeParams,normalizeConfig} from './params.mjs';
import {questionCopy,keyPresentation} from './question-copy.mjs';
import {labelForEvent} from './presentation.mjs';
import {effectiveHints,hintString,prepareScoreImage} from './score-presentation.mjs';
const $=id=>document.getElementById(id);
const names={scale:'音階','diatonic-triads':'音階固有三和音','tonic-triad':'主和音','primary-triads':'I・IV・Vの三和音'};
const modes={reference:'見本',question:'問題',answer:'解答'};
const qualities={major:'長三和音',minor:'短三和音',diminished:'減三和音',augmented:'増三和音'};
let config={...DEFAULT_CONFIG}, manifest, sources, labelAnchors, currentAsset, currentOwned=false, renderVersion=0;
function status(message){$('status').textContent=message;clearTimeout(status.timer);status.timer=setTimeout(()=>$('status').textContent='',3500);}
function updateForm(){
  const key=getKey(config.key);
  const fixed=key.family==='minor'&&config.kind==='primary-triads';
  $('scaleForm').replaceChildren(...SCALE_FORMS.filter(f=>fixed?f.id==='harmonic':(key.family==='major')===(f.id==='major')).map(f=>new Option(f.displayName,f.id)));
  $('scaleForm').disabled=fixed;
  for(const name of ['kind','key','scaleForm','labels','degreeStyle']) $(name).value=config[name];
  $('degreeStyle').disabled=config.labels!=='degrees'||config.kind==='scale';
  document.querySelectorAll('[name=notation]').forEach(input=>input.checked=input.value===config.notation);
  document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===config.mode)));
}
function configUrl(overrides={}){const url=new URL(location.href);url.search=serializeParams({...config,...overrides});url.hash='';return url.href;}
function updateSharing(){
  const url=configUrl({embed:true});
  const escaped=url.replaceAll('&','&amp;').replaceAll('"','&quot;');
  $('embed-code').value=`<iframe src="${escaped}" title="楽典譜例：${keyPresentation(config).name} ${names[config.kind]}" width="100%" height="520" loading="lazy" allowfullscreen style="border:0;max-width:1000px"></iframe>`;
}
async function render(view={...config}){
  const version=++renderVersion;
  // Clear the previous answer immediately while preparing the next hint image.
  $('score').removeAttribute('src');$('score').alt='譜例を準備しています。';$('download').disabled=true;
  if(currentOwned)URL.revokeObjectURL(currentAsset);currentAsset=undefined;currentOwned=false;
  $('errors').hidden=true;$('errors').replaceChildren();
  updateForm(); document.body.classList.toggle('embed',view.embed);
  const hintState=effectiveHints(view),question=view.mode==='question';
  const keyCopy=keyPresentation(view);
  const model=createDisplayModel(hintState.notes?{...view,mode:'answer'}:view);
  $('hint-controls').hidden=!question;
  for(const input of $('hint-controls').querySelectorAll('input[data-hint]'))input.checked=hintState[input.dataset.hint];
  $('hint-key-signature').disabled=view.notation==='accidentals-only';
  $('key-signature-hint-note').hidden=view.notation!=='accidentals-only';
  const formName=SCALE_FORMS.find(f=>f.id===view.scaleForm).displayName;
  $('example-title').textContent=`${keyCopy.name} · ${names[view.kind]}`;
  $('example-subtitle').textContent=`${keyCopy.shortName} / ${formName}`;
  document.title=`${keyCopy.name} ${names[view.kind]}｜楽典譜例ウィジェット`;
  updateSharing();
  $('mode-badge').textContent=modes[view.mode];
  const task=questionCopy(view);
  $('prompt').textContent=question?`${task.instruction} ${task.notationInstruction}`:`${formName} / ${view.notation==='key-signature'?'調号あり':'臨時記号のみ'} / ${view.kind==='scale'?(model.direction==='descending'?'下行':'上行'):'基本形'}`;
  $('caption').textContent=question?(view.hints==='none'?'五線だけを表示しています。必要なら、ト音記号・調号・音符の見本を表示できます。':'完成譜の一部をヒントとして表示しています。解答ではすべて表示します。'):model.events.map(event=>event.notes.map(n=>n.displayName+n.octave).join('・')).join(' → ');
  $('caption').classList.toggle('sr-only',!question);
  $('explanation').textContent=question?'':model.explanation;
  $('note-labels').replaceChildren();
  const scoreLabels=[];
  if(hintState.notes&&view.labels!=='none'){
    model.events.forEach(event=>{const label=labelForEvent(event,view),cell=document.createElement('div');cell.textContent=label.text;if(label.quality){const sub=document.createElement('small');sub.textContent=qualities[label.quality];cell.append(sub);}$('note-labels').append(cell);scoreLabels.push({text:label.text,subtext:label.quality?qualities[label.quality]:''});});
  }
  $('reveal').hidden=!question;
  const source=sources[view.source];$('source-info').hidden=!view.source||question;
  $('source-info').textContent=view.source?`関連教材ID: ${view.source}${source?'':'（登録情報なし）'}`:'';
  const id=[view.key,view.scaleForm,view.notation,view.kind].join('--');
  const entry=manifest.scores[id];
  if(!entry){$('errors').hidden=false;$('errors').textContent='この設定の譜例が見つかりません。生成済みアセットを確認してください。';return;}
  const sourceAsset=`./assets/scores/${hintState.notes?entry.svg:entry.questionSvg}`;
  let image;
  try{image=await prepareScoreImage(sourceAsset,hintState,{labels:scoreLabels,anchors:labelAnchors[id]});}catch(error){if(version!==renderVersion)return;throw error;}
  if(version!==renderVersion){if(image.owned)URL.revokeObjectURL(image.url);return;}
  if(currentOwned)URL.revokeObjectURL(currentAsset);
  currentAsset=image.url;currentOwned=image.owned;
  $('score').dataset.source=sourceAsset;
  $('score').dataset.hints=question?view.hints:'all';
  $('score').alt=question?`${keyCopy.name}、${names[view.kind]}の問題。${$('caption').textContent}${hintState.notes?model.events.map(event=>event.notes.map(n=>n.displayName+n.octave).join('・')).join(' → '):''}`:`${model.key.displayName}、${formName}、${names[view.kind]}。${$('caption').textContent}`;
  // SVG is an image resource: it cannot execute scripts in the host document.
  $('score').src=currentAsset;
  $('download').disabled=false;
  if(version!==renderVersion)return;
}
async function setConfig(next,{url=true}={}){config=normalizeConfig(next);if(url)history.replaceState(null,'',serializeParams(config));await render();}
async function copy(text){try{await navigator.clipboard.writeText(text);status('コピーしました。');}catch{status('自動コピーできません。テキストを選択してコピーしてください。');}}
for(const family of ['major','minor']){const group=document.createElement('optgroup');group.label=family==='major'?'長調':'短調';KEYS.filter(k=>k.family===family).forEach(k=>group.append(new Option(`${k.displayName} / ${k.shortName}`,k.id)));$('key').append(group);}
$('settings').addEventListener('change',event=>{const next={...config,[event.target.name]:event.target.value};if(event.target.name==='key'&&getKey(next.key).family!==getKey(config.key).family)next.scaleForm=getKey(next.key).family==='major'?'major':'natural';if(getKey(next.key).family==='minor'&&next.kind==='primary-triads')next.scaleForm='harmonic';setConfig(next).catch(showError);});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setConfig({...config,mode:button.dataset.mode,hints:button.dataset.mode==='question'?'none':config.hints}).catch(showError)));
$('reveal').addEventListener('click',()=>setConfig({...config,mode:'answer',hints:'all'}).catch(showError));
$('hint-controls').addEventListener('change',()=>{const state={};for(const input of $('hint-controls').querySelectorAll('input[data-hint]'))state[input.dataset.hint]=input.checked;setConfig({...config,hints:hintString(state)}).catch(showError);});
$('copy-url').addEventListener('click',()=>copy(configUrl()));$('copy-embed').addEventListener('click',()=>copy($('embed-code').value));

const scoreCard=$('score-card'), expandedDialog=$('expanded-dialog');
const scoreHome=document.createComment('score card home');scoreCard.before(scoreHome);
let expansionFocus;
function updateExpandButton(){const expanded=Boolean(document.fullscreenElement)||expandedDialog.open;$('expand-score').textContent=expanded?'拡大表示を閉じる':'全画面で見る';$('expand-score').setAttribute('aria-expanded',String(expanded));}
function restoreCard(){scoreHome.after(scoreCard);updateExpandButton();expansionFocus?.focus();}
expandedDialog.addEventListener('close',restoreCard);
document.addEventListener('fullscreenchange',()=>{updateExpandButton();if(!document.fullscreenElement)expansionFocus?.focus();});
$('expand-score').addEventListener('click',async()=>{
 if(expandedDialog.open){expandedDialog.close();return;}
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 expansionFocus=document.activeElement;
 try{if(!scoreCard.requestFullscreen)throw new Error('Fullscreen unavailable');await scoreCard.requestFullscreen();}
 catch{expandedDialog.append(scoreCard);expandedDialog.showModal();$('expand-score').focus();}
 updateExpandButton();
});

$('print').addEventListener('click',()=>window.print());
$('download').addEventListener('click',async()=>{if(!currentAsset)return;try{const response=await fetch(currentAsset);if(!response.ok)throw new Error('SVG取得失敗');const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${config.key}-${config.kind}-${config.mode}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){showError(error);}});
function showError(error){$('errors').hidden=false;$('errors').textContent=`表示できませんでした。${error.message}`;}
function loadUrl(){const parsed=parseParams(location.search);if(parsed.errors.length){++renderVersion;$('score').removeAttribute('src');$('score').alt='';$('note-labels').replaceChildren();$('download').disabled=true;if(currentOwned)URL.revokeObjectURL(currentAsset);currentAsset=undefined;currentOwned=false;$('errors').hidden=false;$('errors').replaceChildren(document.createTextNode('URLの指定に誤りがあります。'+parsed.errors.map(e=>`${e.param}: ${e.message}`).join(' / ')));const link=document.createElement('a');link.href=location.pathname;link.textContent=' 初期設定で開く';$('errors').append(link);return false;}$('errors').hidden=true;config=parsed.config;return true;}
window.addEventListener('popstate',()=>{if(loadUrl())render().catch(showError);});
try{const responses=await Promise.all([fetch('./assets/scores/manifest.json'),fetch('./assets/sources.json'),fetch('./assets/label-anchors.json')]);if(responses.some(r=>!r.ok))throw new Error('アセットを取得できません。HTTPサーバーで開いてください。');[manifest,sources,labelAnchors]=await Promise.all(responses.map(r=>r.json()));if(loadUrl())await render();}catch(error){showError(error);}
