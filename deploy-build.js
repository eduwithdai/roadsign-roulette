/* 配信用（Artifact）の一式を作る。
   ・index.html から <!DOCTYPE>/<html>/<head>/<body> の外枠を外す（Artifact 側が付ける）
   ・日本語のファイル名は URL で化けることがあるので 半角の名前に置きかえる
   元のフォルダは いっさい書きかえない。出力は scratchpad/deploy/ の中だけ。 */
const fs = require("fs"), path = require("path");
const SRC = "C:/Users/nukad/Documents/Claude/Code/\u9053\u8def\u6a19\u8b58\u30eb\u30fc\u30ec\u30c3\u30c8";
const OUT = path.join(__dirname, "deploy");

fs.rmSync(OUT, { recursive: true, force: true });
["assets", "sound", "sets/roadsigns"].forEach(d =>
  fs.mkdirSync(path.join(OUT, d), { recursive: true }));

const cp = (from, to) => fs.copyFileSync(path.join(SRC, from), path.join(OUT, to));

/* ---- 画像・音 ---- */
/* app-icon は <link rel=icon> ごと外すので 要らない */
["arrow-left.png","btn-start-blank.png","machine.png",
 "plate.png","sparkle.png","title-blank.png"].forEach(f => cp("assets/"+f, "assets/"+f));
cp("assets/\u80cc\u666f.png", "assets/bg.png");
const pick = (dir, needle) => {
  const hit = fs.readdirSync(path.join(SRC, dir)).filter(f => f.includes(needle));
  if (hit.length !== 1) throw new Error(dir + " で " + needle + " が " + hit.length + " 件");
  return dir + "/" + hit[0];
};
/* 実際に sound/ に入っているファイルだけを 半角名に置きかえる。
   sets.js のコメントに出てくる「sound/なにか.mp3」のような 見本は そのまま。 */
const soundMap = {};                      // 決定ボタンを押す42.mp3 → start.mp3
[["ボタン", "start.mp3"],                  // 決定ボタンを押す42
 ["ドラム", "stop.mp3"],                   // スチールドラム02
 ["踏切",   "crossing.mp3"]                // 踏切
].forEach(([needle, en]) => {
  const rel = pick("sound", needle);       // "sound/○○.mp3"
  cp(rel, "sound/" + en);
  soundMap[rel.slice("sound/".length)] = en;
});

/* index.html と sets.js の どちらにも 音の名前が出てくるので 同じ関数でなおす。
   日本語の綴りを直書きすると取りちがえるため、実ファイル名から 置きかえる。 */
const fixSounds = (text, where) => {
  let out = text;
  for (const ja of Object.keys(soundMap)) out = out.split("sound/" + ja).join("sound/" + soundMap[ja]);
  for (const ja of Object.keys(soundMap))
    if (out.includes("sound/" + ja)) throw new Error("音の置換もれ: " + where + " / " + ja);
  return out;
};

/* ---- カードの絵。日本語名 → 半角名 ---- */
const SIGNS = [
  ["\u6b62\u307e\u308c.jpg",            "tomare.jpg"],
  ["\u6a2a\u65ad\u6b69\u9053.jpg",       "oudanhodou.jpg"],
  ["\u6a2a\u65ad\u6b69\u9053 (2).jpg",   "tsuugakuro.jpg"],
  ["\u6b69\u884c\u8005\u5c02\u7528.jpg",  "hokousha.jpg"],
  ["\u6a2a\u65ad\u7981\u6b62.webp",      "oudankinshi.webp"],
  ["\u901a\u884c\u6b62\u3081.webp",      "tsuukoudome.webp"],
  ["\u7acb\u3061\u5165\u308a\u7981\u6b62.jpg","tachiiri.jpg"],
  ["\u5de5\u4e8b\u4e2d.jpg",             "koujichuu.jpg"],
  ["\u3075\u307f\u304d\u308a.webp",      "fumikiri.webp"],
  ["110\u756a\u306e\u5bb6.gif",           "ie110.gif"]
];
SIGNS.forEach(([ja, en]) =>
  cp("sets/\u3069\u3046\u308d\u3072\u3087\u3046\u3057\u304d/"+ja, "sets/roadsigns/"+en));

/* ---- sets.js ---- */
let sets = fs.readFileSync(path.join(SRC, "sets.js"), "utf8");
sets = sets.replace('folder: "sets/\u3069\u3046\u308d\u3072\u3087\u3046\u3057\u304d/"',
                    'folder: "sets/roadsigns/"');
SIGNS.forEach(([ja, en]) => { sets = sets.split('file:"'+ja+'"').join('file:"'+en+'"'); });
if (sets.includes("\u3069\u3046\u308d\u3072\u3087\u3046\u3057\u304d/")) throw new Error("folder 置換もれ");
SIGNS.forEach(([ja]) => { if (sets.includes('file:"'+ja+'"')) throw new Error("file 置換もれ: "+ja); });
sets = fixSounds(sets, "sets.js");
fs.writeFileSync(path.join(OUT, "sets.js"), sets);

/* ---- index.html ---- */
let html = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
html = html.replace('assets/背景.png', 'assets/bg.png');
html = fixSounds(html, "index.html");

const lines = html.split(/\r?\n/);
const head = lines.findIndex(l => /^<head>/.test(l));
const title = lines.findIndex(l => /<title>/.test(l));
const styleAt = lines.findIndex(l => /^<style>/.test(l));
const headEnd = lines.findIndex(l => /^<\/head>/.test(l));
const bodyAt = lines.findIndex(l => /^<body>/.test(l));
const bodyEnd = lines.findIndex(l => /^<\/body>/.test(l));
if ([head,title,styleAt,headEnd,bodyAt,bodyEnd].some(i => i < 0)) throw new Error("外枠が見つからない");
const out = [lines[title]]                          // <title> は残す
  .concat(lines.slice(styleAt, headEnd))            // <style>…</style>
  .concat(lines.slice(bodyAt + 1, bodyEnd))         // 中身
  .join("\n");
if (/<!DOCTYPE|<html|<\/html>|<head>|<body>/i.test(out)) throw new Error("外枠が残っている");
fs.writeFileSync(path.join(OUT, "index.html"), out);

/* ---- 出したものを ならべる ---- */
const list = [];
(function walk(d, rel){
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r = rel ? rel + "/" + e.name : e.name;
    e.isDirectory() ? walk(path.join(d, e.name), r)
                    : list.push([r, fs.statSync(path.join(d, e.name)).size]);
  }
})(OUT, "");
list.sort();
list.forEach(([f, s]) => console.log(String(s).padStart(8) + "  " + f));
console.log("合計 " + list.length + " ファイル / " +
            (list.reduce((a, b) => a + b[1], 0) / 1048576).toFixed(2) + " MB");
