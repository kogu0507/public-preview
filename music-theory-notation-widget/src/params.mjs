import { getKey, SCALE_FORMS } from './theory.mjs';
export const DEFAULT_CONFIG = Object.freeze({ kind: 'scale', key: 'g-major', scaleForm: 'major', notation: 'key-signature', mode: 'reference', labels: 'none', degreeStyle: 'quality', hints: 'none', inversion: 'root', context: 'standalone', embed: false, source: '' });
export const PARAM_OPTIONS = Object.freeze({
  kind: ['scale', 'diatonic-triads', 'tonic-triad', 'primary-triads'],
  scaleForm: SCALE_FORMS.map(form => form.id), notation: ['key-signature', 'accidentals-only'],
  mode: ['reference', 'question', 'answer'], labels: ['none', 'note-names', 'degrees'],
  degreeStyle: ['quality', 'upper'],
  // Combinations are canonical literals; accept no reordered or repeated tokens.
  hints: ['none', 'clef', 'key-signature', 'notes', 'clef,key-signature', 'clef,notes', 'key-signature,notes', 'all'],
  inversion: ['root'],
  context: ['standalone', 'article'],
});
const PARAMETERS = Object.keys(DEFAULT_CONFIG);
function validate(input, errors) {
  const config = { ...DEFAULT_CONFIG, ...input };
  const problem = (code, param, message) => errors.push({ code, param, message });
  for (const param of Object.keys(input)) if (!PARAMETERS.includes(param)) problem('unknown', param, `Unknown parameter: ${param}`);
  for (const [param, choices] of Object.entries(PARAM_OPTIONS)) if (!choices.includes(config[param])) problem('invalid', param, `Invalid ${param}: ${config[param]}`);
  let key;
  try { key = getKey(config.key); } catch { problem('invalid', 'key', `Invalid key: ${config.key}`); }
  if (!Object.hasOwn(input, 'scaleForm') && key) config.scaleForm = key.family === 'major' ? 'major' : config.kind === 'primary-triads' ? 'harmonic' : 'natural';
  if (key && PARAM_OPTIONS.scaleForm.includes(config.scaleForm) && (key.family === 'major') !== (config.scaleForm === 'major')) problem('incompatible', 'scaleForm', 'Scale form is incompatible with key');
  if (key?.family === 'minor' && config.kind === 'primary-triads' && config.scaleForm !== 'harmonic') problem('incompatible', 'scaleForm', 'Minor primary triads require harmonic form');
  if (typeof config.embed !== 'boolean') problem('invalid', 'embed', 'embed must be 0 or 1');
  if (typeof config.source !== 'string' || (config.source !== '' && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(config.source))) problem('invalid', 'source', 'source must be a safe lowercase ID (1–64 characters)');
  return config;
}
export function parseParams(search = '') {
  const errors = [];
  const input = {};
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search).replace(/^\?/, ''));
  for (const [param, value] of params) {
    if (Object.hasOwn(input, param)) { errors.push({ code: 'duplicate', param, message: `Duplicate parameter: ${param}` }); continue; }
    Object.defineProperty(input, param, { value, enumerable: true, configurable: true, writable: true });
  }
  if (Object.hasOwn(input, 'embed')) input.embed = input.embed === '1' ? true : input.embed === '0' ? false : input.embed;
  const config = validate(input, errors);
  return { config: errors.length ? null : config, errors };
}
export function normalizeConfig(input = {}) {
  const errors = [];
  const config = validate(input, errors);
  if (errors.length) throw new RangeError(errors.map(error => error.message).join('; '));
  return config;
}
export function serializeParams(input) {
  const config = normalizeConfig(input);
  const params = new URLSearchParams();
  for (const param of PARAMETERS) if (param !== 'source' || config.source) params.set(param, param === 'embed' ? config.embed ? '1' : '0' : config[param]);
  return `?${params.toString()}`;
}
