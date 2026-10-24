import {getKey,SCALE_FORMS} from './theory.mjs';
/** Article questions refer to the source score, without announcing its key. */
export function keyPresentation(config){
 const key=getKey(config.key),concealed=config.context==='article'&&config.mode==='question';
 return {concealed,name:concealed?'この楽譜の調':key.displayName,shortName:concealed?'この楽譜をもとに':key.shortName};
}
/** Task conditions describe the expected score; hint controls reveal its parts. */
export function questionCopy(config){
 const key=getKey(config.key),form=config.scaleForm||(key.family==='major'?'major':'natural');
 const keyName=keyPresentation(config).name;
 const formName=SCALE_FORMS.find(item=>item.id===form)?.displayName;
 if(!formName)throw new RangeError('Unknown scale form');
 let task;
 if(config.kind==='scale'){
  const name=form.startsWith('melodic-')?'旋律的短音階':formName;
  task=`${keyName}の${name}を${form==='melodic-descending'?'下行':'上行'}で書きなさい。`;
 }else if(config.kind==='diatonic-triads'){
  task=key.family==='major'?`${keyName}の7つの音階固有三和音を基本形で書きなさい。`:`${keyName}の${formName}の構成音による7つの三和音を、第1音から第7音の順に基本形で書きなさい。`;
 }else if(config.kind==='tonic-triad')task=`${keyName}の主和音を基本形で書きなさい。`;
 else if(config.kind==='primary-triads')task=key.family==='major'?`${keyName}の主要三和音を基本形で書きなさい。`:`${keyName}の主要三和音を、和声的短音階の構成音を用いて基本形で書きなさい。`;
 else throw new RangeError('Unknown example kind');
 return {instruction:`高音部譜表に、${task}`,notationInstruction:config.notation==='accidentals-only'?'調号を使わず、必要な臨時記号を各音に付けなさい。':'調号を用いなさい。',hintIntro:'必要な部分の見本を表示できます。'};
}
