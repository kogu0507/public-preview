/** Visual hints expose parts of the same engraved score without changing pitches. */
export function effectiveHints({mode,hints='none'}) {
  if(mode!=='question'||hints==='all') return {clef:true,keySignature:true,notes:true};
  const parts=hints==='none'?[]:hints.split(',');
  return {clef:parts.includes('clef'),keySignature:parts.includes('key-signature'),notes:parts.includes('notes')};
}
export function hintString({clef,keySignature,notes}) {
  const parts=[clef&&'clef',keySignature&&'key-signature',notes&&'notes'].filter(Boolean);
  return parts.length===3?'all':parts.join(',')||'none';
}
/** Browser XML DOM; the result remains an image resource, not inline host HTML. */
export function filterScoreSvg(text,state,{labels=[],anchors}={}) {
  const doc=new DOMParser().parseFromString(text,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.namespaceURI!=='http://www.w3.org/2000/svg')throw new Error('譜例SVGを読み取れません。');
  const classes=[];
  if(!state.clef)classes.push('clef');
  if(!state.keySignature)classes.push('keySig');
  if(!state.notes)classes.push('note','chord','accid','ledgerLines');
  if(classes.length)doc.querySelectorAll(classes.map(name=>'.'+name).join(',')).forEach(node=>node.remove());
  if(state.notes&&labels.length){
    if(!anchors||anchors.centers.length!==labels.length)throw new Error('譜例の補助表示位置を取得できません。');
    const svg=doc.documentElement,ns=svg.namespaceURI;
    const [x,y,width,height]=anchors.viewBox,space=anchors.staffSpace;
    // Freeze the original nested engraving viewport before adding label space.
    // Upstream scale SVGs have physical dimensions and no outer viewBox.
    for(const child of svg.children)if(child.localName==='svg'){child.setAttribute('width',String(width));child.setAttribute('height',String(height));}
    const group=doc.createElementNS(ns,'g');group.setAttribute('class','score-labels');
    group.setAttribute('font-family','"Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif');
    group.setAttribute('text-anchor','middle');group.setAttribute('fill','#245d4f');
    const top=Math.max(y+height,anchors.musicBottom)+space*1.6;
    let bottom=top;
    const estimate=(value,size)=>Array.from(value).reduce((sum,char)=>sum+(/[\x00-\x7F]/.test(char)?0.65:1)*size,0);
    labels.forEach((label,index)=>{
      const center=anchors.centers[index],previous=anchors.centers[index-1],next=anchors.centers[index+1];
      const available=Math.min(previous===undefined?Infinity:center-previous,next===undefined?Infinity:next-center,width)*0.88;
      const size=space*1.8,lineHeight=space*2.0;
      const lines=label.text.includes('・')&&estimate(label.text,size)>available?label.text.split('・'):[label.text];
      const event=doc.createElementNS(ns,'g');event.setAttribute('data-event-index',String(index));event.setAttribute('data-anchor-x',String(center));
      function addLine(value,row,fontSize,className){
        const node=doc.createElementNS(ns,'text');node.setAttribute('x',String(center));node.setAttribute('y',String(top+row*lineHeight));node.setAttribute('font-size',String(fontSize));node.setAttribute('class',className);
        // textContent keeps labels as XML text, including musical accidentals.
        node.textContent=value;event.append(node);bottom=Math.max(bottom,top+row*lineHeight+space*.7);
      }
      lines.forEach((line,row)=>addLine(line,row,size,'score-label-main'));
      if(label.subtext)addLine(label.subtext,lines.length,space*1.4,'score-label-quality');
      group.append(event);
    });
    svg.append(group);
    // Both engraving and labels share the root SVG coordinate system. Image,
    // full screen, print and saved SVG therefore keep identical alignment.
    svg.setAttribute('viewBox',`${x} ${y} ${width} ${bottom+space-y}`);
    svg.removeAttribute('width');svg.removeAttribute('height');
  }
  return new XMLSerializer().serializeToString(doc);
}
const svgCache=new Map();
export async function prepareScoreImage(source,state,options={}) {
  if(state.clef&&state.keySignature&&state.notes&&!options.labels?.length)return {url:source,owned:false};
  if(!svgCache.has(source))svgCache.set(source,fetch(source).then(response=>{
    if(!response.ok)throw new Error('譜例SVGを取得できません。');
    return response.text();
  }).catch(error=>{svgCache.delete(source);throw error;}));
  const svg=filterScoreSvg(await svgCache.get(source),state,options);
  return {url:URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),owned:true};
}
