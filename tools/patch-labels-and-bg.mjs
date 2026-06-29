/**
 * Save Toto — покрасить RewardLabel/CtaLabel/EndWinLabel в золотой (#FFCC00)
 * и привязать SaveTotoAdaptiveBackground к BackgroundImage.
 *
 * Золотой = BalanceLabel color (255, 204, 0, 255).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function compressUuid(u) {
    const s = u.replace(/-/g, '');
    if (s.length !== 32) return u;
    let out = s.slice(0, 5);
    let bits = '';
    for (let i = 5; i < s.length; i++) bits += parseInt(s[i], 16).toString(2).padStart(4, '0');
    while (bits.length % 6 !== 0) bits += '0';
    for (let i = 0; i < bits.length; i += 6) out += BASE64[parseInt(bits.slice(i, i + 6), 2)];
    return out;
}
function scriptType(relTsNoExt) {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, relTsNoExt + '.ts.meta'), 'utf8'));
    return compressUuid(meta.uuid);
}

const GOLD = { __type__: 'cc.Color', r: 255, g: 204, b: 0, a: 255 };
const ADAPT_BG = scriptType('assets/scripts/save-toto/adapters/SaveTotoAdaptiveBackground');

let changes = [];

// === 1. Покрасить RewardLabel ×6 + CtaLabel ×2 + EndWinLabel в золотой ===
const GOLD_LABELS = ['RewardLabel', 'CtaLabel', 'EndWinLabel'];
for (const lbl of scene) {
    if (!lbl || lbl.__type__ !== 'cc.Label') continue;
    // find owning node
    const nodeIdx = lbl.node?.__id__;
    if (nodeIdx == null) continue;
    const node = scene[nodeIdx];
    if (!node || !node._name) continue;
    if (GOLD_LABELS.includes(node._name)) {
        if (lbl._color.r !== 255 || lbl._color.g !== 204 || lbl._color.b !== 0) {
            lbl._color = JSON.parse(JSON.stringify(GOLD));
            changes.push(`gold -> ${node._name}`);
        }
    }
}

// === 2. SaveTotoAdaptiveBackground -> BackgroundImage ===
{
    const bg = scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === 'BackgroundImage');
    if (bg >= 0) {
        const has = scene[bg]._components.some(c => scene[c.__id__]?.__type__ === ADAPT_BG);
        if (!has) {
            const compId = scene.length;
            scene.push({
                __type__: ADAPT_BG, _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: bg }, _enabled: true, __prefab: null,
                targetNode: null, _id: '',
            });
            scene[bg]._components.push({ __id__: compId });
            changes.push('SaveTotoAdaptiveBackground -> BackgroundImage');
        }
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
