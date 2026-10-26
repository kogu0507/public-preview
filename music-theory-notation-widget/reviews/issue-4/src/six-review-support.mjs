import {KEYS} from './theory.mjs';
import {noteNames} from './note-names.mjs';

export function intervalAnswer(pair){return pair.answer.replace(/^(?:上行|下行)・/,'');}
export function keyAndToneRows(model){
 const rows=[['調名',model.names]],scale=model.sections.find(t=>t.kind==='scale').answer.events;
 for(const [label,index]of [['主音',0],['属音',4],['下属音',3],['導音',6]]){
  const note=scale[index].notes[0];rows.push([label,noteNames({pname:note.letter,alteration:({natural:0,flat:-1,sharp:1})[note.accidental]})]);
 }
 return rows.map(([label,names])=>[label,names.japanese,names.english,names.german]);
}
export function fifthsReference(){return Array.from({length:15},(_,i)=>{
 const fifths=i-7;return {label:signatureLabel({fifths}),major:KEYS.find(k=>k.fifths===fifths&&k.family==='major'),minor:KEYS.find(k=>k.fifths===fifths&&k.family==='minor')};
});}

export function signatureLabel(key){return key.fifths===0?'調号なし':`${key.fifths<0?'♭':'♯'}${Math.abs(key.fifths)}つ`;}

// Five-column layout adapted from key-signature-trainer's related-key-diagram.
// Names and signatures come from this widget's existing spelling table.
export function lessonRelations(model){
 const parallel=KEYS.find(k=>k.family!==model.key.family&&k.tonicLetter===model.key.tonicLetter&&k.tonicAccidental===model.key.tonicAccidental);
 if(!parallel)throw new RangeError('Parallel key outside this key table');
 return [['属調',model.related.dominant],['下属調',model.related.subdominant],['平行調',model.related.relative],['同主調',parallel]];
}

export function fifthsWindow(model){
 const key=model.key,offsets=key.family==='major'?[-3,-2,-1,0,1]:[-1,0,1,2,3];
 const cells=[['主調',key],...lessonRelations(model)];
 return offsets.map(offset=>{
  const fifths=key.fifths+offset;
  return {fifths,label:signatureLabel({fifths}),major:cells.find(([,k])=>k.fifths===fifths&&k.family==='major'),minor:cells.find(([,k])=>k.fifths===fifths&&k.family==='minor')};
 });
}

const durationName=({kind,dur,dots})=>`${dots?'付点':''}${dur===1?'全':dur+'分'}${kind==='note'?'音符':'休符'}`;
// Only rhythmic values present in this fixed eight-bar source; dots are retained.
export const RHYTHM_SOURCE=[
 {kind:'note',dur:2,dots:0},{kind:'note',dur:4,dots:0},{kind:'note',dur:8,dots:0},{kind:'note',dur:1,dots:1},
 {kind:'rest',dur:2,dots:0},{kind:'rest',dur:4,dots:0}
];
export function rhythmCorrespondence(){return RHYTHM_SOURCE.map(event=>[1,2,4].map(factor=>durationName({...event,dur:event.dur*factor})));}
export function rhythmCardSteps(event){return [1,2,4].map((factor,index)=>({
 label:['原譜（3/2）','1/2倍（3/4）','1/4倍（3/8）'][index],name:durationName({...event,dur:event.dur*factor}),
 svg:`rhythm-${event.kind}-${event.dur*factor}-${event.dots}.svg`
}));}
