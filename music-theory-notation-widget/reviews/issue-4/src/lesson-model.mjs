import {KEYS,getKey,buildExample} from './theory.mjs';
import {normalizeConfig,serializeParams} from './params.mjs';

/** Lesson answers share the widget's spelling and circle-of-fifths key table. */
export function keyNames(keyId) {
  const key=getKey(keyId);
  const natural={C:'C',D:'D',E:'E',F:'F',G:'G',A:'A',B:'H'};
  const flat={C:'Ces',D:'Des',E:'Es',F:'Fes',G:'Ges',A:'As',B:'B'};
  const sharp={C:'Cis',D:'Dis',E:'Eis',F:'Fis',G:'Gis',A:'Ais',B:'His'};
  const spelling=({natural,flat,sharp})[key.tonicAccidental][key.tonicLetter];
  return {japanese:key.displayName,english:key.shortName,german:`${key.family==='minor'?spelling.toLowerCase():spelling}-${key.family==='major'?'Dur':'Moll'}`};
}

export function relatedKeys(keyId) {
  const key=getKey(keyId);
  const find=(fifths,family)=>{
    const related=KEYS.find(item=>item.fifths===fifths&&item.family===family);
    if(!related)throw new RangeError('Related key needs more than seven signature accidentals');
    return related;
  };
  return {dominant:find(key.fifths+1,key.family),subdominant:find(key.fifths-1,key.family),relative:find(key.fifths,key.family==='major'?'minor':'major')};
}

export function createLessonModel(lesson) {
  if(!lesson||!/^[a-z0-9][a-z0-9-]*$/.test(lesson.id))throw new RangeError('Invalid lesson ID');
  const key=getKey(lesson.key),exampleKey=getKey(lesson.exampleKey);
  if(key.family!=='major'||exampleKey.family!=='major')throw new RangeError('This lesson template currently supports major keys only');
  if(key.id===exampleKey.id)throw new RangeError('The example must use a different key');
  const related=relatedKeys(key.id);
  const sections=['scale','diatonic-triads'].flatMap(kind=>['key-signature','accidentals-only'].map(notation=>{
    const config=normalizeConfig({kind,key:key.id,scaleForm:'major',notation,mode:'question',labels:'none',embed:true,context:'article',hints:'none',source:lesson.id});
    const exampleConfig=normalizeConfig({...config,key:exampleKey.id,mode:'reference',hints:'all'});
    const scoreId=[key.id,'major',notation,kind].join('--');
    const exampleScoreId=[exampleKey.id,'major',notation,kind].join('--');
    return {id:`${kind}-${notation}`,kind,notation,config,exampleConfig,query:serializeParams(config),scoreId,exampleScoreId,answer:buildExample({...config,mode:'answer'}),example:buildExample(exampleConfig)};
  }));
  return {lesson,key,exampleKey,names:keyNames(key.id),related,sections};
}
