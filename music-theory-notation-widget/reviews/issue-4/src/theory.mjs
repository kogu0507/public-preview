/** Adapted from kogu0507/keyboard-theory-trainer src/music/{scales,keySignatures,chords}.ts.
 * The key tables, diatonic-letter spelling, signature order and MIDI calculation
 * are retained. This single core adds descending minor and all stacked triads.
 */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const OFFSET = { doubleFlat: -2, flat: -1, natural: 0, sharp: 1, doubleSharp: 2 };
export const ACCIDENTAL_SYMBOL = { doubleFlat: '𝄫', flat: '♭', natural: '♮', sharp: '♯', doubleSharp: '𝄪' };
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const KEY_ROWS = [
  ['c-major','ハ長調','C','natural',0], ['g-major','ト長調','G','natural',1],
  ['d-major','ニ長調','D','natural',2], ['a-major','イ長調','A','natural',3],
  ['e-major','ホ長調','E','natural',4], ['b-major','ロ長調','B','natural',5],
  ['f-sharp-major','嬰ヘ長調','F','sharp',6], ['c-sharp-major','嬰ハ長調','C','sharp',7],
  ['f-major','ヘ長調','F','natural',-1], ['b-flat-major','変ロ長調','B','flat',-2],
  ['e-flat-major','変ホ長調','E','flat',-3], ['a-flat-major','変イ長調','A','flat',-4],
  ['d-flat-major','変ニ長調','D','flat',-5], ['g-flat-major','変ト長調','G','flat',-6],
  ['c-flat-major','変ハ長調','C','flat',-7],
  ['a-minor','イ短調','A','natural',0], ['e-minor','ホ短調','E','natural',1],
  ['b-minor','ロ短調','B','natural',2], ['f-sharp-minor','嬰ヘ短調','F','sharp',3],
  ['c-sharp-minor','嬰ハ短調','C','sharp',4], ['g-sharp-minor','嬰ト短調','G','sharp',5],
  ['d-sharp-minor','嬰ニ短調','D','sharp',6], ['a-sharp-minor','嬰イ短調','A','sharp',7],
  ['d-minor','ニ短調','D','natural',-1], ['g-minor','ト短調','G','natural',-2],
  ['c-minor','ハ短調','C','natural',-3], ['f-minor','ヘ短調','F','natural',-4],
  ['b-flat-minor','変ロ短調','B','flat',-5], ['e-flat-minor','変ホ短調','E','flat',-6],
  ['a-flat-minor','変イ短調','A','flat',-7],
];
export const KEYS = KEY_ROWS.map(([id, displayName, tonicLetter, tonicAccidental, fifths]) => Object.freeze({
  id, displayName, tonicLetter, tonicAccidental, fifths,
  family: id.endsWith('major') ? 'major' : 'minor',
  shortName: `${tonicLetter}${tonicAccidental === 'natural' ? '' : ACCIDENTAL_SYMBOL[tonicAccidental]} ${id.endsWith('major') ? 'major' : 'minor'}`,
  keySignatureType: fifths === 0 ? null : fifths > 0 ? 'sharp' : 'flat',
  // Flashcard MEI is the engraving reference; its C-flat starts at written C4.
  // The trainer used C5 to keep the MIDI pitch within its keyboard range.
  keySignatureCount: Math.abs(fifths), recommendedStartOctave: 4,
}));
export const SCALE_FORMS = [
  { id: 'major', displayName: '長音階' }, { id: 'natural', displayName: '自然短音階' },
  { id: 'harmonic', displayName: '和声的短音階' },
  { id: 'melodic-ascending', displayName: '旋律的短音階（上行形）' },
  { id: 'melodic-descending', displayName: '旋律的短音階（下行形）' },
];
export function getKey(id) {
  const key = KEYS.find(key => key.id === id);
  if (!key) throw new RangeError(`Unknown key: ${id}`);
  return key;
}
export function keySignatureMap(keyOrId) {
  const key = typeof keyOrId === 'string' ? getKey(keyOrId) : keyOrId;
  const altered = (key.fifths > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, key.keySignatureCount);
  return Object.fromEntries(LETTERS.map(letter => [letter, altered.includes(letter) ? key.keySignatureType : 'natural']));
}
export function createNote(letter, accidental = 'natural', octave = 4, degree = 1) {
  if (!LETTERS.includes(letter) || !Object.hasOwn(OFFSET, accidental) || !Number.isInteger(octave)) throw new RangeError('Invalid spelled note');
  const midi = (octave + 1) * 12 + PITCH[letter] + OFFSET[accidental];
  return { letter, accidental, octave, degree, midi, pitchClass: ((midi % 12) + 12) % 12,
    displayName: letter + (accidental === 'natural' ? '' : ACCIDENTAL_SYMBOL[accidental]) };
}
export function getScale(keyId, scaleForm) {
  const key = getKey(keyId);
  const form = scaleForm ?? (key.family === 'major' ? 'major' : 'natural');
  if (!SCALE_FORMS.some(item => item.id === form) || (key.family === 'major') !== (form === 'major')) throw new RangeError('Scale form is incompatible with key');
  const signature = keySignatureMap(key);
  const start = LETTERS.indexOf(key.tonicLetter);
  const raised = form === 'harmonic' ? [7] : form === 'melodic-ascending' ? [6, 7] : [];
  const notes = Array.from({ length: 8 }, (_, index) => {
    const letter = LETTERS[(start + index) % 7];
    const offset = OFFSET[signature[letter]] + (raised.includes(index + 1) ? 1 : 0);
    const accidental = Object.keys(OFFSET).find(item => OFFSET[item] === offset);
    return createNote(letter, accidental, key.recommendedStartOctave + Math.floor((start + index) / 7), index + 1);
  });
  const direction = form === 'melodic-descending' ? 'descending' : 'ascending';
  return { ...key, keyId, form, direction, notes: direction === 'descending' ? notes.reverse() : notes };
}
export function getTriads(keyId, scaleForm) {
  const scale = getScale(keyId, scaleForm);
  // Chord degrees always run tonic to leading/subtonic degree, even when the
  // selected descending melodic form supplies the natural-minor pitch set.
  const base = [...scale.notes].sort((a, b) => a.degree - b.degree).slice(0, 7);
  return base.map((_, index) => {
    const notes = [0, 2, 4].map(step => {
      const position = index + step;
      const note = base[position % 7];
      return createNote(note.letter, note.accidental, note.octave + Math.floor(position / 7), position % 7 + 1);
    });
    const intervals = notes.slice(1).map(note => note.midi - notes[0].midi).join(',');
    const quality = { '4,7': 'major', '3,7': 'minor', '3,6': 'diminished', '4,8': 'augmented' }[intervals];
    if (!quality) throw new RangeError(`Unsupported triad intervals: ${intervals}`);
    const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index];
    const roman = quality === 'minor' ? numeral.toLowerCase() : quality === 'diminished' ? `${numeral.toLowerCase()}°` : quality === 'augmented' ? `${numeral}+` : numeral;
    return { degree: index + 1, notes, quality, roman, inversion: 'root-position' };
  });
}
/** Accidental state is per staff position (letter+octave), within one measure.
 * each-note repeats all alterations against the notation baseline for teaching.
 * State still supplies cancellations when a position returns to that baseline.
 * A barline event resets it to the key signature. No cross-octave carry.
 */
export function planAccidentals(events, keyOrId, notation = 'key-signature', policy = 'measure') {
  if (!['key-signature', 'accidentals-only'].includes(notation)) throw new RangeError('Invalid notation');
  if (!['measure', 'each-note'].includes(policy)) throw new RangeError('Invalid accidental policy');
  const signature = notation === 'key-signature' ? keySignatureMap(keyOrId) : Object.fromEntries(LETTERS.map(letter => [letter, 'natural']));
  const state = new Map();
  return events.map(event => {
    if (event.barline) state.clear();
    const notes = (event.notes ?? []).map(note => {
      const position = `${note.letter}:${note.octave}`;
      const previous = state.get(position) ?? signature[note.letter];
      const repeat = policy === 'each-note' && note.accidental !== signature[note.letter];
      const writtenAccidental = repeat || previous !== note.accidental ? note.accidental : null;
      state.set(position, note.accidental);
      return { ...note, writtenAccidental };
    });
    return { ...event, notes };
  });
}
export function buildExample(config) {
  if (config.kind === 'primary-triads' && getKey(config.key).family === 'minor') {
    if (config.scaleForm && config.scaleForm !== 'harmonic') throw new RangeError('Minor primary triads require harmonic form');
    config = { ...config, scaleForm: 'harmonic' };
  }
  const scale = getScale(config.key, config.scaleForm);
  let events;
  if (config.kind === 'scale') events = scale.notes.map(note => ({ degree: note.degree, notes: [note] }));
  else {
    const triads = getTriads(config.key, config.scaleForm);
    if (config.kind === 'diatonic-triads') events = triads;
    else if (config.kind === 'tonic-triad') events = triads.slice(0, 1);
    else if (config.kind === 'primary-triads') events = [triads[0], triads[3], triads[4]];
    else throw new RangeError('Unknown example kind');
  }
  return { key: getKey(config.key), form: scale.form, direction: scale.direction, kind: config.kind,
    events: planAccidentals(events, scale, config.notation, 'each-note'),
    explanation: config.kind === 'scale' ? '' : config.kind === 'primary-triads' && scale.family === 'minor' ? '短調の主要三和音は和声的短音階による i・iv・V です。' : '選択した音階の構成音を三度ずつ重ねた基本形です。音階固有和音の一覧は機能和声の指定ではありません。自然短音階・旋律的短音階の下行形では第5音上は短三和音（v）です。' };
}
/** Question views receive empty slots, never note, quality, or Roman answers. */
export function createDisplayModel(config) {
  if (config.mode !== 'question') return { ...buildExample(config), slotCount: ({scale:8,'diatonic-triads':7,'tonic-triad':1,'primary-triads':3})[config.kind] };
  const key = getKey(config.key);
  return { key, form: config.scaleForm, direction: config.scaleForm === 'melodic-descending' ? 'descending' : 'ascending', kind: config.kind,
    events: [], slotCount: ({scale:8,'diatonic-triads':7,'tonic-triad':1,'primary-triads':3})[config.kind], explanation: '' };
}
