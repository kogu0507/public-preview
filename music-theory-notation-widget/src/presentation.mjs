export function labelForEvent(event, {labels, degreeStyle='quality'}) {
  if(labels==='note-names') return {text:event.notes.map(note=>note.displayName).join('・'), quality:event.quality||null};
  if(labels!=='degrees') return {text:'',quality:null};
  if(!event.roman) return {text:String(event.degree),quality:null};
  if(degreeStyle==='upper') return {text:['I','II','III','IV','V','VI','VII'][event.degree-1],quality:null};
  return {text:event.roman,quality:event.quality||null};
}
