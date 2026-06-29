/**
 * Save Toto — заменить assembled Toto на toto-full в финале (EndTotoRoot) и бонусе (ThreatView swap).
 *
 * 1. EndTotoRoot: убрать 3 детей (body+head+tongue), оставить один Sprite с toto-full.
 * 2. CageSwingRoot: добавить TotoFull узел (inactive, toto-full sprite) рядом с TotoRoot.
 * 3. ThreatView: привязать totoFullNode -> TotoFull.
 *
 * ТРЕБУЕТ: assets/art/characters/toto-full.png.meta (создаётся Cocos при reload).
 * Если meta нет — инструкция.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const META = path.join(ROOT, 'assets/art/characters/toto-full.png.meta');

if (!fs.existsSync(META)) {
    console.error('!!! toto-full.png.meta НЕ найден.');
    console.error('    Перезагрузите Cocos Creator — он создаст meta при импорте toto-full.png.');
    console.error('    Затем запустите этот скрипт снова: node tools/patch-toto-full.mjs');
    process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const TOTO_FULL_SF = meta.uuid + '@f9941';
const sm = meta.subMetas?.f9941?.userData;
const NATIVE_W = sm?.rawWidth ?? 400;
const NATIVE_H = sm?.rawHeight ?? 600;
console.log(`toto-full: ${NATIVE_W}x${NATIVE_H}, sf=${TOTO_FULL_SF.slice(0, 8)}…`);

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

let changes = [];

// === 1. EndTotoRoot -> один toto-full sprite ===
{
    const et = findNode('EndTotoRoot');
    if (et >= 0) {
        const node = scene[et];
        // Удалить дочерние assembled parts.
        node._children = [];
        // Убедиться что есть Sprite, поставить toto-full.
        let spIdx = findCompIdx(et, 'cc.Sprite');
        if (spIdx < 0) {
            spIdx = scene.length;
            scene.push({
                __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: et }, _enabled: true, __prefab: null,
                _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
                _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
                _spriteFrame: { __uuid__: TOTO_FULL_SF, __expectedType__: 'cc.SpriteFrame' },
                _type: 0, _fillType: 0, _sizeMode: 0,
                _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
                _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
            });
            node._components.push({ __id__: spIdx });
        } else {
            scene[spIdx]._spriteFrame = { __uuid__: TOTO_FULL_SF, __expectedType__: 'cc.SpriteFrame' };
        }
        // UITransform размер = native toto-full.
        let trIdx = findCompIdx(et, 'cc.UITransform');
        if (trIdx >= 0) {
            scene[trIdx]._contentSize = { __type__: 'cc.Size', width: NATIVE_W, height: NATIVE_H };
        }
        changes.push('EndTotoRoot -> single toto-full sprite');
    }
}

// === 2. CageSwingRoot: добавить TotoFull узел (inactive) ===
{
    const csw = findNode('CageSwingRoot');
    if (csw >= 0) {
        const layer = scene[csw]._layer;
        const has = (scene[csw]._children || []).some(c => scene[c.__id__]?._name === 'TotoFull');
        if (has) {
            console.log('TotoFull already under CageSwingRoot — skip');
        } else {
            const transformId = scene.length;
            scene.push({
                __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _contentSize: { __type__: 'cc.Size', width: NATIVE_W, height: NATIVE_H },
                _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
            });
            const spriteId = scene.length;
            scene.push({
                __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
                _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
                _spriteFrame: { __uuid__: TOTO_FULL_SF, __expectedType__: 'cc.SpriteFrame' },
                _type: 0, _fillType: 0, _sizeMode: 0,
                _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
                _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
            });
            const nodeId = scene.length;
            scene.push({
                __type__: 'cc.Node', _name: 'TotoFull', _objFlags: 0, __editorExtras__: {},
                _parent: { __id__: csw }, _children: [],
                _active: false,
                _components: [{ __id__: transformId }, { __id__: spriteId }],
                _level: scene[csw]._level + 1,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0, _layer: layer,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
            });
            scene[transformId].node.__id__ = nodeId;
            scene[spriteId].node.__id__ = nodeId;
            scene[csw]._children = scene[csw]._children || [];
            scene[csw]._children.push({ __id__: nodeId });
            changes.push('TotoFull node added under CageSwingRoot (inactive, toto-full sprite)');
        }
    }
}

// === 3. ThreatView: totoFullNode -> TotoFull ===
{
    const tvType = scriptType('assets/scripts/save-toto/views/SaveTotoThreatView');
    const tl = findNode('ThreatLayer');
    const tvid = findCompIdx(tl, tvType);
    if (tvid >= 0) {
        const tf = findNode('TotoFull');
        if (tf >= 0) {
            scene[tvid].totoFullNode = { __id__: tf };
            changes.push('ThreatView.totoFullNode -> TotoFull');
        }
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
