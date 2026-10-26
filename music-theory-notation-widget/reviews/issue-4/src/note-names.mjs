// Display vocabulary only; pitch/alteration come from the shared source ledger.
export function noteNames({pname,alteration}){
 const ja={C:'ハ',D:'ニ',E:'ホ',F:'ヘ',G:'ト',A:'イ',B:'ロ'};
 const de={0:{C:'C',D:'D',E:'E',F:'F',G:'G',A:'A',B:'H'},'-1':{C:'Ces',D:'Des',E:'Es',F:'Fes',G:'Ges',A:'As',B:'B'},1:{C:'Cis',D:'Dis',E:'Eis',F:'Fis',G:'Gis',A:'Ais',B:'His'}};
 if(!ja[pname]||!de[alteration])throw Error('Unsupported note-name spelling');
 return {japanese:({0:'','-1':'変',1:'嬰'})[alteration]+ja[pname],english:pname+({0:'','-1':'♭',1:'♯'})[alteration],german:de[alteration][pname]};
}
