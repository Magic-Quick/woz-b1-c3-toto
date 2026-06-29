/**
 * Save Toto — подогнать размеры символов (View) под Background 150×115.
 *
 * Для каждого символа: View = contain-fit(nativeW, nativeH, 150, 115)
 * с сохранением aspect ratio. Root UITransform = 150×115 (= Background).
 *
 * Native sizes:
 *   oz     94×127    -> 85×115
 *   key   144×130   -> 127×115
 *   drop  140×148   -> 109×115
 *   basket 144×140  -> 118×115
 *   toto  222×169   -> 150×114
 *
 * Идемпотентно.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const PREFAB_DIR = path.join(ROOT, 'assets/prefabs/save-toto/slot');

const BG_W = 150;
const BG_H = 115;

// native sizes (из meta)
const NATIVE = {
    Oz: [94, 127],
    Key: [144, 130],
    Drop: [140, 148],
    Basket: [144, 140],
    Toto: [222, 169],
};

function containFit(nw, nh, bw, bh) {
    const s = Math.min(bw / nw, bh / nh);
    return [Math.round(nw * s), Math.round(nh * s)];
}

function setNodeSize(prefab, nodeName, w, h) {
    const nodeIdx = prefab.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === nodeName);
    if (nodeIdx < 0) return false;
    const trIdx = prefab.findIndex(o => o && o.__type__ === 'cc.UITransform' && o.node && o.node.__id__ === nodeIdx);
    if (trIdx < 0) return false;
    prefab[trIdx]._contentSize = { __type__: 'cc.Size', width: w, height: h };
    return true;
}

let changed = 0;
for (const sym of Object.keys(NATIVE)) {
    const file = path.join(PREFAB_DIR, `SaveTotoSymbol${sym}.prefab`);
    if (!fs.existsSync(file)) continue;
    const prefab = JSON.parse(fs.readFileSync(file, 'utf8'));

    const [nw, nh] = NATIVE[sym];
    const [vw, vh] = containFit(nw, nh, BG_W, BG_H);

    // Root UITransform = Background size (контейнер).
    const rootIdx = prefab.findIndex(o => o && o.__type__ === 'cc.Node' && o._parent === null);
    const rootTrIdx = prefab.findIndex(o => o && o.__type__ === 'cc.UITransform' && o.node && o.node.__id__ === rootIdx);
    if (rootTrIdx >= 0) {
        prefab[rootTrIdx]._contentSize = { __type__: 'cc.Size', width: BG_W, height: BG_H };
    }

    // View (символ) = contain-fit.
    setNodeSize(prefab, 'View', vw, vh);

    fs.writeFileSync(file, JSON.stringify(prefab, null, 2));
    console.log(`${sym}: View ${vw}x${vh} (native ${nw}x${nh}, fit into ${BG_W}x${BG_H})`);
    changed++;
}

console.log(`Done. ${changed} prefabs updated.`);
