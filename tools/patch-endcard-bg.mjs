/**
 * Save Toto — EndCard adaptive background node + remove darkening EndOverlay.
 *
 * 1. Create "EndBackground" node under EndCardLayer (first child, behind everything):
 *    UITransform (native 2179×1373) + Sprite(endcard-bg) + SaveTotoAdaptiveBackground (cover-fit).
 * 2. Remove darkening: EndOverlay -> inactive (no longer dims).
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
function findNode(name) {
    return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}

const BG_SF = '3d341862-1434-404a-afc5-14a82d56dc52@f9941';
const ADAPT_BG = scriptType('assets/scripts/save-toto/adapters/SaveTotoAdaptiveBackground');
const BG_NATIVE_W = 2179;
const BG_NATIVE_H = 1373;

let changes = [];

// === 1. Create EndBackground under EndCardLayer ===
{
    const ec = findNode('EndCardLayer');
    if (ec < 0) { console.error('EndCardLayer not found'); process.exit(1); }
    const ecNode = scene[ec];

    // Idempotency: skip if EndBackground already exists
    const has = (ecNode._children || []).some(c => scene[c.__id__]?._name === 'EndBackground');
    if (has) {
        console.log('EndBackground already present — skip creation');
    } else {
        const layer = ecNode._layer;
        // UITransform
        const transformId = scene.length;
        scene.push({
            __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _contentSize: { __type__: 'cc.Size', width: BG_NATIVE_W, height: BG_NATIVE_H },
            _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
        });
        // Sprite
        const spriteId = scene.length;
        scene.push({
            __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
            _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
            _spriteFrame: { __uuid__: BG_SF, __expectedType__: 'cc.SpriteFrame' },
            _type: 0, _fillType: 0, _sizeMode: 0,
            _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
            _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
        });
        // SaveTotoAdaptiveBackground
        const adaptId = scene.length;
        scene.push({
            __type__: ADAPT_BG, _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            targetNode: null, _id: '',
        });
        // Node
        const nodeId = scene.length;
        scene.push({
            __type__: 'cc.Node', _name: 'EndBackground', _objFlags: 0, __editorExtras__: {},
            _parent: { __id__: ec }, _children: [], _active: true,
            _components: [
                { __id__: transformId },
                { __id__: spriteId },
                { __id__: adaptId },
            ],
            _level: ecNode._level + 1,
            _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
            _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _mobility: 0, _layer: layer,
            _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
        });
        scene[transformId].node.__id__ = nodeId;
        scene[spriteId].node.__id__ = nodeId;
        scene[adaptId].node.__id__ = nodeId;

        // Insert as FIRST child so it renders behind everything.
        ecNode._children = ecNode._children || [];
        ecNode._children.unshift({ __id__: nodeId });
        changes.push('EndBackground created (endcard-bg + adaptive cover-fit) under EndCardLayer');
    }
}

// === 2. Remove darkening: EndOverlay -> inactive ===
{
    const eo = findNode('EndOverlay');
    if (eo >= 0) {
        scene[eo]._active = false;
        changes.push('EndOverlay inactive (darkening removed)');
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
