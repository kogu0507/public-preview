// Accepted Human-review recipe: svg-score defs/use components.
// The selected key signature is composed from keysig0 / keysig1s..7s /
// keysig1f..7f on templateTheoryTrebleClef1500.
const G_CLEF_PATH = "M 322.006 668 L 357.006 836 Q 372.006 834 382.006 833 Q 392.006 832 397.006 832 Q 458.006 832 506.006 866.5 Q 554.006 901 582.506 957 Q 611.006 1013 611.006 1080 Q 611.006 1157 571.506 1218.5 Q 532.006 1280 453.006 1309 Q 458.006 1326 482.006 1451 Q 488.006 1481 491.006 1498.5 Q 494.006 1516 495.006 1529 Q 496.006 1542 496.006 1559 Q 496.006 1609 471.506 1648.5 Q 447.006 1688 405.506 1710 Q 364.006 1732 313.006 1732 Q 261.006 1732 221.006 1712.5 Q 181.006 1693 158.006 1658.5 Q 135.006 1624 135.006 1579 Q 135.006 1531 161.506 1499 Q 188.006 1467 237.006 1467 Q 279.006 1467 305.506 1497.5 Q 332.006 1528 332.006 1570 Q 332.006 1606 307.006 1633 Q 282.006 1660 242.006 1660 L 232.006 1660 Q 258.006 1699 314.006 1699 Q 383.006 1699 422.006 1654 Q 461.006 1609 461.006 1539 Q 461.006 1522 457.006 1493.5 Q 453.006 1465 443.006 1425 Q 433.006 1385 427.506 1359 Q 422.006 1333 420.006 1322 Q 386.006 1332 340.006 1332 Q 254.006 1332 172.006 1282 Q 92.006 1232 46.006 1150 Q 0.006 1068 0.006 973 Q 0.006 883 41.006 804 Q 82.006 725 142.506 659 Q 203.006 593 264.006 533 Q 250.006 480 241.006 428 Q 232.006 376 232.006 322 Q 232.006 275 238.506 233.5 Q 245.006 192 257.006 157 Q 270.006 117 291.006 81.5 Q 312.006 46 335.506 23 Q 359.006 0 377.006 0 Q 401.006 0 443.006 85 Q 464.006 128 474.006 178 Q 484.006 228 484.006 285 Q 484.006 356 465.006 426.5 Q 446.006 497 409.506 559 Q 373.006 621 322.006 668 Z M 414.006 1289 L 348.006 955 Q 321.006 961 297.006 980.5 Q 273.006 1000 258.506 1027.5 Q 244.006 1055 244.006 1086 Q 244.006 1111 257.006 1137.5 Q 270.006 1164 289.006 1180 Q 302.006 1192 315.006 1198 Q 330.006 1205 330.006 1211 Q 330.006 1214 320.006 1217 Q 282.006 1208 251.506 1183 Q 221.006 1158 203.506 1122.5 Q 186.006 1087 186.006 1047 Q 186.006 1004 203.506 964 Q 221.006 924 252.506 892 Q 284.006 860 324.006 844 L 295.006 693 Q 179.006 787 124.506 877.5 Q 70.006 968 70.006 1057 Q 70.006 1122 104.006 1178 Q 138.006 1234 197.006 1268.5 Q 256.006 1303 330.006 1303 Q 350.006 1303 370.506 1299 Q 391.006 1295 414.006 1289 Z M 291.006 508 Q 314.006 496 340.006 463.5 Q 366.006 431 390.006 389 Q 414.006 347 429.006 304.5 Q 444.006 262 444.006 228 Q 444.006 192 433.006 171 Q 422.006 150 395.006 150 Q 371.006 150 348.506 172 Q 326.006 194 308.506 230.5 Q 291.006 267 281.006 312 Q 271.006 357 271.006 404 Q 271.006 436 277.506 462 Q 284.006 488 291.006 508 Z M 379.006 951 L 445.006 1279 Q 543.006 1237 543.006 1107 Q 543.006 1064 521.006 1028.5 Q 499.006 993 462.006 972 Q 425.006 951 379.006 951 Z";
const SHARP_PATH = "M 0 477 L 47 463 L 47 320 L 0 332 L 0 232 L 47 219 L 47 23 L 78 23 L 78 211 L 145 195 L 145 0 L 176 0 L 176 187 L 225 176 L 225 275 L 176 289 L 176 432 L 225 420 L 225 523 L 176 535 L 176 723 L 145 723 L 145 543 L 78 561 L 78 756 L 47 756 L 47 568 L 0 580 L 0 477 Z M 78 455 L 145 439 L 145 295 L 78 312 L 78 455 Z";
const FLAT_PATH = "M 0 670 L 0 0 L 31 0 L 31 390 Q 68 353 115 353 Q 147 353 173 374.5 Q 199 396 199 437 Q 199 469 180 496 Q 161 523 129 550 L 60 609 Q 41 625 26 640.5 Q 11 656 0 670 Z M 31 435 L 31 603 Q 57 575 75 551.5 Q 93 528 103 510 Q 114 491 119.5 475 Q 125 459 125 445 Q 125 417 112 404.5 Q 99 392 84 392 Q 68 392 52.5 403.5 Q 37 415 31 435 Z";

const SHARP_Y = [0, 150, -50, 100, 250, 50, 200];
const FLAT_Y = [200, 50, 250, 100, 300, 150, 350];

export function recipeIdForSignature(signature) {
  const fifths = Math.max(-7, Math.min(7, Math.trunc(Number(signature) || 0)));
  if (fifths === 0) return "keysig0";
  return `keysig${Math.abs(fifths)}${fifths > 0 ? "s" : "f"}`;
}

function keySignatureDefs(prefix) {
  const defs = [`<g id="${prefix}-keysig0"/>`];
  for (let count = 1; count <= 7; count += 1) {
    defs.push(`<g id="${prefix}-keysig${count}s">${SHARP_Y.slice(0, count).map((y, index) => `<use href="#${prefix}-sharp" x="${index * 100}" y="${y}"/>`).join("")}</g>`);
    defs.push(`<g id="${prefix}-keysig${count}f">${FLAT_Y.slice(0, count).map((y, index) => `<use href="#${prefix}-flat" x="${index * 90}" y="${y}"/>`).join("")}</g>`);
  }
  return defs.join("");
}

export function renderKeySignatureSvg(signature, { idPrefix = "ks", title = "ト音記号の調号" } = {}) {
  const prefix = String(idPrefix).replace(/[^a-zA-Z0-9_-]/g, "-");
  const recipeId = recipeIdForSignature(signature);
  return `<svg class="rendered-notation" data-notation-recipe="${recipeId}" viewBox="0 0 1500 1000" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" xmlns="http://www.w3.org/2000/svg"><title id="${prefix}-title">${title}</title><desc id="${prefix}-desc">確立済みSVG recipeによるト音記号の調号</desc><defs><path id="${prefix}-oneLineStaff" d="M1 -4.8H0V4.8H1V-4.8Z"/><g id="${prefix}-fiveLineStaff">${[0,100,200,300,400].map((y) => `<use href="#${prefix}-oneLineStaff" x="0" y="${y}"/>`).join("")}</g><g id="${prefix}-gClef"><path transform="scale(.4) translate(0,-1080)" d="${G_CLEF_PATH}"/></g><g id="${prefix}-trebleClef"><use href="#${prefix}-gClef" x="0" y="300"/></g><g id="${prefix}-doubleBarline"><path transform="scale(.4) translate(-145,0)" d="M0 1000V0H37V1000H0ZM110 1000V0H147V1000H110Z"/></g><g id="${prefix}-sharp"><path transform="scale(.4) translate(-225,-378)" d="${SHARP_PATH}"/></g><g id="${prefix}-flat"><path transform="scale(.4) translate(-200,-475)" d="${FLAT_PATH}"/></g>${keySignatureDefs(prefix)}<g id="${prefix}-templateTheoryTrebleClef1500"><use href="#${prefix}-fiveLineStaff" x="0" y="0" transform="scale(1500,1)"/><use href="#${prefix}-trebleClef" x="50" y="0"/><use href="#${prefix}-doubleBarline" x="1500" y="0"/></g></defs><g fill="currentColor"><use href="#${prefix}-templateTheoryTrebleClef1500" x="0" y="300"/><use href="#${prefix}-${recipeId}" x="400" y="300"/></g></svg>`;
}
