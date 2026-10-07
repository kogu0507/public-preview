# Bundled Noto fonts

Official sources: Google Fonts `ofl/notomusic`, `ofl/notosansjp`, `ofl/notoserifjp`. See manifest.json for exact source filenames, source SHA-256, output SHA-256, sizes and coverage. Preserve all three *-OFL.txt notices when copying this directory.

Noto Music contains the five accidental glyphs. JP subsets cover shipped app source/index text and Latin repertoire; variable weights are preserved. Arbitrary learner memo characters outside the subset intentionally use normal fallback fonts. There are no runtime requests to Google Fonts.

Regeneration is an authoring task, not a required app build step. Download these exact source filenames and each package's OFL.txt from `https://raw.githubusercontent.com/google/fonts/main/ofl/<package>/` into a source directory:

- notomusic: NotoMusic-Regular.ttf, save license as notomusic-OFL.txt
- notosansjp: NotoSansJP[wght].ttf, save license as notosansjp-OFL.txt
- notoserifjp: NotoSerifJP[wght].ttf, save license as notoserifjp-OFL.txt

With fonttools 4.66.1 and brotli 1.2.0 available to Python:

```powershell
python scripts/subset-fonts.py C:/path/to/source-fonts
npm test
```

Review source hash changes, keep source packages outside the repository, and rerun browser font/layout checks. Source files currently needed by the shipped copy are read from index.html and src/*.js; if future copy lives in nested source directories or CSS content strings, extend the authoring utility accordingly. fonts.test.js checks current source-wide Japanese coverage so missed regeneration fails rather than silently falling back.

Total WOFF2 bytes: 284972 (about 278 KiB). Music 3004; Sans JP 118796; Serif JP 163172.
