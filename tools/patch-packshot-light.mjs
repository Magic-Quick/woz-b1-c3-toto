/**
 * Save Toto — packshot: Light за Тото, лого выше, EndWinLabel убран, win-banner добавлен.
 *
 * 1. EndLight node под EndCardLayer (перед EndTotoRoot, рендер позади Тото):
 *    light.png + большой размер + SaveTotoCircularLightAnimation (вращение).
 * 2. EndLogo: поднять выше (y 500 -> 700).
 * 3. EndWinLabel: inactive (убрать "10,000,000").
 * 4. WinBanner node (Group 1, "2,000,000 free credit") на месте EndWinLabel.
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
function sfUuid(relNoExt, ext) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, relNoExt + '.' + ext + '.meta'), 'utf8'));
    return m.uuid + '@f9941';
}

const LIGHT_SF = sfUuid('assets/art/scene/light', 'png');
const WINBANNER_SF = sfUuid('assets/art/ui/win-banner', 'webp');
const CIRC_LIGHT = scriptType('assets/scripts/save-toto/animations/SaveTotoCircularLightAnimation');

let changes = [];

const ec = findNode('EndCardLayer');
const layer = scene[ec]._layer;

// === 1. EndLight за Тото ===
{
    if (findNode('EndLight') < 0) {
        const transformId = scene.length;
        scene.push({
            __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _contentSize: { __type__: 'cc.Size', width: 1400, height: 1400 },
            _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
        });
        const spriteId = scene.length;
        scene.push({
            __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
            _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
            _spriteFrame: { __uuid__: LIGHT_SF, __expectedType__: 'cc.SpriteFrame' },
            _type: 0, _fillType: 0, _sizeMode: 0,
            _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
            _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
        });
        const circId = scene.length;
        scene.push({
            __type__: CIRC_LIGHT, _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            rotationDurationSec: 8.0, scaleMultiplier: 1.0, _id: '',
        });
        const nodeId = scene.length;
        scene.push({
            __type__: 'cc.Node', _name: 'EndLight', _objFlags: 0, __editorExtras__: {},
            _parent: { __id__: ec }, _children: [], _active: true,
            _components: [{ __id__: transformId }, { __id__: spriteId }, { __id__: circId }],
            _level: scene[ec]._level + 1,
            _lpos: { __type__: 'cc.Vec3', x: 0, y: 100, z: 0 },
            _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
            _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _mobility: 0, _layer: layer,
            _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
        });
        scene[transformId].node.__id__ = nodeId;
        scene[spriteId].node.__id__ = nodeId;
        scene[circId].node.__id__ = nodeId;
        // Вставить ПЕРЕД EndTotoRoot (позади Тото).
        const totoIdx = scene[ec]._children.findIndex(c => scene[c.__id__]._name === 'EndTotoRoot');
        if (totoIdx >= 0) scene[ec]._children.splice(totoIdx, 0, { __id__: nodeId });
        else scene[ec]._children.push({ __id__: nodeId });
        changes.push('EndLight added (big, behind Toto, circular rotation)');
    } else {
        console.log('EndLight already present — skip');
    }
}

// === 2. EndLogo выше (500 -> 700) ===
{
    const logo = findNode('EndLogo');
    if (logo >= 0) {
        scene[logo]._lpos = { __type__: 'cc.Vec3', x: 0, y: 700, z: 0 };
        changes.push('EndLogo pos.y -> 700 (raised)');
    }
}

// === 3. EndWinLabel inactive ===
{
    const wl = findNode('EndWinLabel');
    if (wl >= 0) {
        scene[wl]._active = false;
        changes.push('EndWinLabel inactive (removed)');
    }
}

// === 4. WinBanner node (Group 1) ===
{
    if (findNode('WinBanner') < 0) {
        const transformId = scene.length;
        scene.push({
            __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _contentSize: { __type__: 'cc.Size', width: 1316, height: 608 },
            _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
        });
        const spriteId = scene.length;
        scene.push({
            __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
            node: { __id__: 0 }, _enabled: true, __prefab: null,
            _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
            _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
            _spriteFrame: { __uuid__: WINBANNER_SF, __expectedType__: 'cc.SpriteFrame' },
            _type: 0, _fillType: 0, _sizeMode: 0,
            _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
            _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
        });
        const nodeId = scene.length;
        scene.push({
            __type__: 'cc.Node', _name: 'WinBanner', _objFlags: 0, __editorExtras__: {},
            _parent: { __id__: ec }, _children: [], _active: true,
            _components: [{ __id__: transformId }, { __id__: spriteId }],
            _level: scene[ec]._level + 1,
            _lpos: { __type__: 'cc.Vec3', x: 0, y: -250, z: 0 },
            _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
            _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _mobility: 0, _layer: layer,
            _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
        });
        scene[transformId].node.__id__ = nodeId;
        scene[spriteId].node.__id__ = nodeId;
        scene[ec]._children.push({ __id__: nodeId });
        changes.push('WinBanner added (Group 1, "2,000,000 free credit") at y=-250');
    } else {
        console.log('WinBanner already present — skip');
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
