// Drive-authoritative assets: core-v0.6 supplies vertical semantics; the accepted
// legacy visual profile supplies glyph paths and its x=400, sharp-gap=100,
// flat-gap=90 registration. This avoids mixing v0.6's generated-glyph anchors
// with the legacy path origins used here.
const G_CLEF_PATH = "M322.006 668L357.006 836Q372.006 834 397.006 832Q458.006 832 506.006 866.5Q554.006 901 582.506 957Q611.006 1013 611.006 1080Q611.006 1157 571.506 1218.5Q532.006 1280 453.006 1309Q458.006 1326 482.006 1451Q496.006 1521 496.006 1559Q496.006 1609 471.506 1648.5Q447.006 1688 405.506 1710Q364.006 1732 313.006 1732Q261.006 1732 221.006 1712.5Q181.006 1693 158.006 1658.5Q135.006 1624 135.006 1579Q135.006 1531 161.506 1499Q188.006 1467 237.006 1467Q279.006 1467 305.506 1497.5Q332.006 1528 332.006 1570Q332.006 1606 307.006 1633Q282.006 1660 242.006 1660H232.006Q258.006 1699 314.006 1699Q383.006 1699 422.006 1654Q461.006 1609 461.006 1539Q461.006 1510 443.006 1425Q425.006 1340 420.006 1322Q386.006 1332 340.006 1332Q254.006 1332 172.006 1282Q92.006 1232 46.006 1150Q.006 1068 .006 973Q.006 883 41.006 804Q82.006 725 142.506 659Q203.006 593 264.006 533Q250.006 480 241.006 428Q232.006 376 232.006 322Q232.006 275 238.506 233.5Q245.006 192 257.006 157Q270.006 117 291.006 81.5Q312.006 46 335.506 23Q359.006 0 377.006 0Q401.006 0 443.006 85Q484.006 168 484.006 285Q484.006 356 465.006 426.5Q446.006 497 409.506 559Q373.006 621 322.006 668ZM414.006 1289L348.006 955Q321.006 961 297.006 980.5Q273.006 1000 258.506 1027.5Q244.006 1055 244.006 1086Q244.006 1111 257.006 1137.5Q270.006 1164 289.006 1180Q302.006 1192 315.006 1198Q330.006 1205 330.006 1211Q330.006 1214 320.006 1217Q282.006 1208 251.506 1183Q221.006 1158 203.506 1122.5Q186.006 1087 186.006 1047Q186.006 1004 203.506 964Q221.006 924 252.506 892Q284.006 860 324.006 844L295.006 693Q179.006 787 124.506 877.5Q70.006 968 70.006 1057Q70.006 1122 104.006 1178Q138.006 1234 197.006 1268.5Q256.006 1303 330.006 1303Q370.006 1303 414.006 1289ZM291.006 508Q314.006 496 340.006 463.5Q366.006 431 390.006 389Q414.006 347 429.006 304.5Q444.006 262 444.006 228Q444.006 192 433.006 171Q422.006 150 395.006 150Q371.006 150 348.506 172Q326.006 194 308.506 230.5Q291.006 267 281.006 312Q271.006 357 271.006 404Q271.006 466 291.006 508ZM379.006 951L445.006 1279Q543.006 1237 543.006 1107Q543.006 1064 521.006 1028.5Q499.006 993 462.006 972Q425.006 951 379.006 951Z";
const SHARP_PATH = "M0 477L47 463V320L0 332V232L47 219V23H78V211L145 195V0H176V187L225 176V275L176 289V432L225 420V523L176 535V723H145V543L78 561V756H47V568L0 580V477ZM78 455L145 439V295L78 312V455Z";
const FLAT_PATH = "M0 670V0H31V390Q68 353 115 353Q147 353 173 374.5Q199 396 199 437Q199 469 180 496Q161 523 129 550L60 609Q22 641 0 670ZM31 435V603Q57 575 75 551.5Q93 528 103 510Q125 473 125 445Q125 417 112 404.5Q99 392 84 392Q68 392 52.5 403.5Q37 415 31 435Z";

const SHARP_LINES = [0, 1.5, -0.5, 1, 2.5, 0.5, 2];
const FLAT_LINES = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];

export function keySignaturePositions(fifths) {
  const count = Math.abs(Math.max(-7, Math.min(7, Math.trunc(Number(fifths) || 0))));
  const lines = fifths > 0 ? SHARP_LINES : FLAT_LINES;
  return lines.slice(0, count).map((line, index) => ({
    type: fifths > 0 ? "sharp" : "flat",
    x: 400 + index * (fifths > 0 ? 100 : 90),
    y: 300 + line * 100,
  }));
}

export function renderKeySignatureSvg(fifths, { idPrefix = "ks", title = "ト音記号の調号" } = {}) {
  const positions = keySignaturePositions(fifths);
  const safePrefix = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, "-");
  const uses = positions.map(({ type, x, y }) => `<use href="#${safePrefix}-${type}" transform="translate(${x} ${y})"/>`).join("");
  return `<svg class="rendered-notation" viewBox="0 0 1000 1000" role="img" aria-labelledby="${safePrefix}-title ${safePrefix}-desc" xmlns="http://www.w3.org/2000/svg"><title id="${safePrefix}-title">${title}</title><desc id="${safePrefix}-desc">ト音記号の五線譜に配置された調号</desc><defs><path id="${safePrefix}-g-clef" d="${G_CLEF_PATH}"/><g id="${safePrefix}-treble-clef"><use href="#${safePrefix}-g-clef" transform="scale(.4) translate(0,-1080)"/></g><path id="${safePrefix}-sharp-path" d="${SHARP_PATH}"/><g id="${safePrefix}-sharp"><use href="#${safePrefix}-sharp-path" transform="scale(.4) translate(-225,-378)"/></g><path id="${safePrefix}-flat-path" d="${FLAT_PATH}"/><g id="${safePrefix}-flat"><use href="#${safePrefix}-flat-path" transform="scale(.4) translate(-200,-475)"/></g></defs><g fill="none" stroke="currentColor" stroke-width="8">${[300,400,500,600,700].map((y) => `<path d="M80 ${y}H920"/>`).join("")}</g><g fill="currentColor"><use href="#${safePrefix}-treble-clef" transform="translate(50 300)"/>${uses}</g></svg>`;
}
