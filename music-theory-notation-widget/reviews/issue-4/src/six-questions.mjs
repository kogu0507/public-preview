// Source-derived music comes from dictation-content #5. This module only renders it.
const assetBase=new URL('../assets/lessons/pd001-review/',import.meta.url);
function n(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function image(file,alt){const fig=n('figure'),img=n('img');img.className='score';img.src=new URL(file,assetBase).href;img.alt=alt;fig.append(img);return fig;}
function section(number,title){const el=n('section');el.id=`question-${number}`;el.append(n('h2',`問${number}｜${title}`));return el;}
function rows(items,blank=false){const t=n('table'),b=n('tbody');for(const [label,value]of items){const tr=n('tr'),th=n('th',label),td=n('td');th.scope='row';if(blank){const s=n('span',undefined,'answer-line');s.setAttribute('aria-label',`${label}の解答欄`);td.append(s);}else td.textContent=value;tr.append(th,td);b.append(tr);}t.append(b);return t;}
function pending(){return n('p','共通データの検証済み譜例を待っています。この候補を完成済み教材として扱わないでください。','pending');}
export async function loadSixQuestionData(){const response=await fetch(new URL('bundle.json',assetBase));if(!response.ok)throw Error('6問用の共通譜例データが未取込です。');return response.json();}
export function sourceQuestions(data){
  const q1=section(1,'音名');
  q1.append(n('p','番号①〜⑥の音名を英語の音名で書きなさい。調号と臨時記号に注意し、♭・♯があれば付けてください。音域の数字は不要です。'),n('p','音名は階名（移動ド）ではありません。例：C、F♯。','muted'));
  const grid=n('div',undefined,'target-grid');
  for(const target of data.notes){const card=n('div',undefined,'target-card');card.append(n('h3',target.label),n('p',target.location,'answer-location'));if(target.svg)card.append(image(target.svg,`${target.label}で指定した原曲の音。${target.location}`));else card.append(pending());const line=n('div','音名：','paper-answer');line.append(n('span',undefined,'answer-line'));card.append(line);grid.append(card);}
  q1.append(grid,rows(data.notes.map(t=>[t.label,'']),true));
  const q2=section(2,'音程');
  q2.append(n('p','A〜Dについて、譜例で「1」から「2」へ進む2音の音程を、種類（完全・長・短・増・減）と度数で答えなさい。上行・下行も書きなさい。すべて旋律的音程として考え、間の音や休符は無視します。'),n('p','例：上行・長3度。音名は綴りのまま数え、下行も下の音から上の音まで数えた度数で表します。','muted'));
  const pairs=n('div',undefined,'target-grid');
  for(const target of data.intervals){const card=n('div',undefined,'target-card');card.append(n('h3',target.label),n('p',target.location,'answer-location'));if(target.svg)card.append(image(target.svg,`${target.label}：1から2へ進む原曲の2音。${target.location}`));else card.append(pending());pairs.append(card);}
  q2.append(pairs,rows(data.intervals.map(t=>[t.label,'']),true));return [q1,q2];
}
export function writingQuestion(data){
  const q=section(6,'音価と拍子の書換え');
  q.append(n('p','冒頭の原曲8小節すべてを、音符・休符の音価がそれぞれ半分になるように書き換えなさい。拍子は3/2から3/4へ変更し、音高・調号・小節の区切りは保ってください。付点も忘れずに書きなさい。'),n('p','紙や五線ノートを使って構いません。これは記譜の練習です。演奏テンポは指定しません。','muted'));
  if(data.blankSvg)q.append(image(data.blankSvg,'8小節を書き込むための空五線。音部記号・調号・拍子も自分で書きます。'));else q.append(pending());return q;
}
export function sourceAnswers(data){
  const a1=n('div',undefined,'answer-copy');a1.append(n('h2','問1の解答'),rows(data.notes.map(t=>[t.label,t.answer])),n('p','音名は音の高さの名称です。五線上の位置だけでなく、調号と臨時記号を読みます。②の音には調号の♭が効きます。オクターブ数字は校閲用資料に記載し、答案では求めません。'));
  const a2=n('div',undefined,'answer-copy');a2.append(n('h2','問2の解答'),rows(data.intervals.map(t=>[t.label,t.answer])));
  for(const t of data.intervals)a2.append(n('p',`${t.label}：${t.explanation}`));
  a2.append(n('p','度数は音名の文字を両端を含めて数えます。半音の数を併せて、完全・長・短などの種類を確かめます。'));
  return [a1,a2];
}
export function writingAnswer(data){const a=n('div',undefined,'answer-copy');a.append(n('h2','問6の解答'),n('p','全8小節・3/4拍子'));
  if(data.rewriteSvg){a.append(image(data.rewriteSvg,'問6正答。原曲全8小節の音符と休符を半分の音価にした3/4拍子の譜。'));const link=n('a','正答譜を別画面で開く（拡大）','screen-help');link.href=new URL(data.rewriteSvg,assetBase).href;link.target='_blank';link.rel='noopener';a.append(link);}else a.append(pending());
  a.append(n('p','2分音符→4分音符、4分音符→8分音符、8分音符→16分音符。休符も同じ比率です。第8小節の付点全音符は付点2分音符になります。各小節は4分音符3個分です。'),n('p','音価の書換えだけでは実際の演奏速度は決まりません。原曲の2分音符と書換え後の4分音符に同じメトロノーム数を与えれば、各拍の実時間を揃えられます。'));
  return a;}
export function reviewControls(root){
  const panel=n('div',undefined,'print-controls');
  for(const [label,open]of [['問題を印刷',false],['解答を含めて印刷',true]]){const b=n('button',label);b.type='button';b.addEventListener('click',()=>{root.querySelectorAll('details').forEach(d=>d.open=false);root.querySelector('#answers').open=open;window.print();});panel.append(b);}
  return panel;
}
