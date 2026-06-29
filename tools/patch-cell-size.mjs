/**
 * Save Toto — подогнать размер ячеек (Background в symbol prefabs) под новые
 * Column_* (150×380) и elementSpacing.
 *
 * Background: ширина = Column width (150), высота = 150 * (170/221) ≈ 115 (native aspect).
 * elementSpacing: 3 видимых ряда в высоту колонны 380 → 127.
 *
 * Идемпотентно: только меняет _contentSize Background + elementSpacing в GameConfig.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const PREFAB_DIR = path.join(ROOT, 'assets/prefabs/save-toto/slot');
const SCENE = path.join(ROOT, 'assets/scene.scene');

const BG_W = 150;
const BG_H = 115;        // 150 * 170/221 ≈ 115.4
const ELEMENT_SPACING = 127; // 3 ряда в 380
const SYMBOLS = ['Oz', 'Key', 'Drop', 'Basket', 'Toto'];

let changed = 0;
for (const sym of SYMBOLS) {
    const file = path.join(PREFAB_DIR, `SaveTotoSymbol${sym}.prefab`);
    if (!fs.existsSync(file)) continue;
    const prefab = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Background node
    const bgIdx = prefab.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === 'Background');
    if (bgIdx < 0) { console.warn(`${sym}: Background not found`); continue; }
    const trIdx = prefab.findIndex(o => o && o.__type__ === 'cc.UITransform' && o.node && o.node.__id__ === bgIdx);
    if (trIdx < 0) { console.warn(`${sym}: Background UITransform not found`); continue; }
    prefab[trIdx]._contentSize = { __type__: 'cc.Size', width: BG_W, height: BG_H };
    fs.writeFileSync(file, JSON.stringify(prefab, null, 2));
    console.log(`${sym}: Background -> ${BG_W}x${BG_H}`);
    changed++;
}

// GameConfig.elementSpacing
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
const gc = scene.find(o => o && o.canvasWidth);
if (gc) {
    gc.elementSpacing = ELEMENT_SPACING;
    fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
    console.log(`GameConfig.elementSpacing -> ${ELEMENT_SPACING}`);
}

console.log(`Done. ${changed} prefabs updated.`);
