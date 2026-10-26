import {KEYS} from './theory.mjs';

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
