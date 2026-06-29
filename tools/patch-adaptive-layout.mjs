/**
 * Save Toto — привязать SaveTotoAdaptiveLayout к Canvas.
 * gameLayers = [ThreatLayer, SlotLayer, HudLayer, FxLayer]
 * logoNode = Logo, spinButtonNode = SpinButton
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
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, relTsNoExt + '.ts.meta'), 'utf8'));
    return compressUuid(m.uuid);
}
function findNode(name) {
    return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}
function findCompIdx(nodeIdx, type) {
    const node = scene[nodeIdx];
    for (const c of node._components) {
        if (scene[c.__id__].__type__ === type) return c.__id__;
    }
    return -1;
}

const ADAPT = scriptType('assets/scripts/save-toto/adapters/SaveTotoAdaptiveLayout');
const canvas = findNode('Canvas');
let changes = [];

// Проверить есть ли уже компонент
if (findCompIdx(canvas, ADAPT) < 0) {
    const threat = findNode('ThreatLayer');
    const slot = findNode('SlotLayer');
    const hud = findNode('HudLayer');
    const fx = findNode('FxLayer');
    const logo = findNode('Logo');
    const spin = findNode('SpinButton');

    const compId = scene.length;
    scene.push({
        __type__: ADAPT, _name: '', _objFlags: 0, __editorExtras__: {},
        node: { __id__: canvas }, _enabled: true, __prefab: null,
        gameLayers: [
            { __id__: threat },
            { __id__: slot },
            { __id__: hud },
            { __id__: fx },
        ],
        logoNode: { __id__: logo },
        spinButtonNode: { __id__: spin },
        landscapeScale: 1.4,
        landscapeLogoX: -700, landscapeLogoY: 0, landscapeLogoScale: 0.8,
        landscapeSpinX: 650, landscapeSpinY: 0, landscapeSpinScale: 0.8,
        _id: '',
    });
    scene[canvas]._components.push({ __id__: compId });
    changes.push('SaveTotoAdaptiveLayout -> Canvas');
    changes.push(`gameLayers: [ThreatLayer, SlotLayer, HudLayer, FxLayer]`);
    changes.push(`logoNode -> Logo, spinButtonNode -> SpinButton`);
} else {
    changes.push('SaveTotoAdaptiveLayout already present — skip');
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
