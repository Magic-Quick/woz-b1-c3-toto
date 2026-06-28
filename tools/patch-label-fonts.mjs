/**
 * Save Toto — точечный патч шрифтов cc.Label в scene.scene.
 *
 * Не регенерирует сцену (сохраняет ручные правки расстановки ассетов).
 * Для каждого cc.Label:
 *   - если _font уже назначен (пользователем) — НЕ трогает;
 *   - если _font = null — устанавливает Bodega Sans Black.ttf + _isSystemFontUsed=false.
 *
 * По умолчанию использует "Bodega Sans Black.ttf". Через аргумент можно задать другой
 * TTF из assets/fonts/bodegasans/ (например "Bodega Sans Black Oldstyle.ttf").
 *
 * Usage: node tools/patch-label-fonts.mjs [\"<ttf filename>\"]
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const FONT_DIR = path.join(ROOT, 'assets/fonts/bodegasans');

const targetTtf = process.argv[2] || 'Bodega Sans Black.ttf';
const fontMetaPath = path.join(FONT_DIR, targetTtf + '.meta');
if (!fs.existsSync(fontMetaPath)) {
  console.error('TTF meta not found:', fontMetaPath);
  console.error('Available:', fs.readdirSync(FONT_DIR).filter(f => f.endsWith('.ttf')));
  process.exit(1);
}
const fontUuid = JSON.parse(fs.readFileSync(fontMetaPath, 'utf8')).uuid;
console.log('Target font:', targetTtf, '->', fontUuid);

const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
let patched = 0;
let skipped = 0;
const fontRef = { __uuid__: fontUuid, __expectedType__: 'cc.TTFFont' };

for (const obj of scene) {
  if (obj.__type__ !== 'cc.Label') continue;
  const str = obj._string ?? '';
  if (obj._font && obj._font.__uuid__) {
    // Уже назначен пользователем — пропускаем, сохраняем выбор.
    console.log(`  keep  "${str}" -> ${obj._font.__uuid__}`);
    skipped++;
    continue;
  }
  obj._font = { ...fontRef };
  obj._isSystemFontUsed = false;
  console.log(`  patch "${str}" -> ${targetTtf}`);
  patched++;
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`\nDone. patched=${patched} kept=${skipped} total labels=${patched + skipped}`);
