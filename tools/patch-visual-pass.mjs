/**
 * Save Toto — сводный patch: OI-511/512/fire/key-flight/light.
 *
 * 1. SaveTotoFireAnimation -> FireSprite (idle pulse + level height/opacity)
 * 2. LockView ×3: openLockSpriteFrame + keySpriteFrame + keyFlightRoot(=LockFxRoot)
 * 3. BonusView: dimmerNode = BonusDimmer
 * 4. WinPanel: Light child (circular rotation) + SaveTotoCircularLightAnimation
 * 5. Toto prefab: Light child under root (inactive, light.png) for scatter blink
 *
 * Safe: only appends missing components/nodes. Idempotent.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const TOTO_PREFAB = path.join(ROOT, 'assets/prefabs/save-toto/slot/SaveTotoSymbolToto.prefab');
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
function sfUuid(relPngNoExt) {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, relPngNoExt + '.png.meta'), 'utf8'));
    return meta.uuid + '@f9941';
}

const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
const FIRE_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoFireAnimation');
const CIRC_LIGHT = scriptType('assets/scripts/save-toto/animations/SaveTotoCircularLightAnimation');
const OPEN_LOCK_SF = sfUuid('assets/art/scene/locks/open-lock');
const KEY_SF = sfUuid('assets/art/slot/symbol-key');
const LIGHT_SF = sfUuid('assets/art/scene/light');

function findNode(name) {
    return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}
function findCompOnNode(nodeIdx, compType) {
    const node = scene[nodeIdx];
    for (const c of node._components) {
        if (scene[c.__id__].__type__ === compType) return c.__id__;
    }
    return -1;
}
function hasComponent(nodeId, compType) {
    return findCompOnNode(nodeId, compType) >= 0;
}
function addCustomComponent(nodeId, compType, props) {
    const compId = scene.length;
    scene.push({
        __type__: compType, _name: '', _objFlags: 0, __editorExtras__: {},
        node: { __id__: nodeId }, _enabled: true, __prefab: null,
        ...props, _id: '',
    });
    scene[nodeId]._components.push({ __id__: compId });
    return compId;
}

let changes = [];

// === 1. SaveTotoFireAnimation on FireSprite ===
{
    const fire = findNode('FireSprite');
    if (fire >= 0 && !hasComponent(fire, FIRE_ANIM)) {
        addCustomComponent(fire, FIRE_ANIM, {
            baseScaleX: 1, maxScaleY: 1, idleAmplitude: 0.06,
            idleHalfDurationSec: 0.35, levelTransitionSec: 0.45,
            maxOpacity: 255, minOpacity: 90,
        });
        changes.push('SaveTotoFireAnimation -> FireSprite');
    }
}

// === 2. LockView wiring ×3 ===
{
    const lockFx = findNode('LockFxRoot');
    ['LockLeft', 'LockCenter', 'LockRight'].forEach(name => {
        const lock = findNode(name);
        if (lock < 0) return;
        // find SaveTotoLockView component on lock node
        const node = scene[lock];
        let lvId = -1;
        for (const c of node._components) {
            const comp = scene[c.__id__];
            if (comp.__type__ && comp.lockId !== undefined && comp.openLockSpriteFrame !== undefined) {
                lvId = c.__id__; break;
            }
            // detect by having lockId field
            if (comp.lockId !== undefined) { lvId = c.__id__; break; }
        }
        if (lvId < 0) {
            // find by scanning: SaveTotoLockView type
            const lvType = scriptType('assets/scripts/save-toto/views/SaveTotoLockView');
            lvId = findCompOnNode(lock, lvType);
        }
        if (lvId >= 0) {
            const lv = scene[lvId];
            lv.openLockSpriteFrame = { __uuid__: OPEN_LOCK_SF, __expectedType__: 'cc.SpriteFrame' };
            lv.keySpriteFrame = { __uuid__: KEY_SF, __expectedType__: 'cc.SpriteFrame' };
            if (lockFx >= 0) lv.keyFlightRoot = { __id__: lockFx };
            changes.push(`LockView wiring -> ${name}`);
        } else {
            changes.push(`!! LockView NOT FOUND on ${name}`);
        }
    });
}

// === 3. BonusView dimmerNode ===
{
    const bonusRoot = findNode('BonusRoot');
    const dimmer = findNode('BonusDimmer');
    if (bonusRoot >= 0 && dimmer >= 0) {
        // find SaveTotoBonusView on BonusRoot
        const bvType = scriptType('assets/scripts/save-toto/views/SaveTotoBonusView');
        const bvid = findCompOnNode(bonusRoot, bvType);
        if (bvid >= 0) {
            scene[bvid].dimmerNode = { __id__: dimmer };
            changes.push('BonusView.dimmerNode -> BonusDimmer');
        }
    }
}

// === 4. WinPanel Light child (circular) ===
{
    const wp = findNode('WinPanel');
    if (wp >= 0) {
        const hasLight = (scene[wp]._children || []).some(c => scene[c.__id__]?._name === 'Light');
        if (!hasLight) {
            // UITransform + Sprite(light) + SaveTotoCircularLightAnimation
            const transformId = scene.length;
            scene.push({
                __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _contentSize: { __type__: 'cc.Size', width: 600, height: 600 },
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
                rotationDurationSec: 6.0, scaleMultiplier: 1.0, _id: '',
            });
            const nodeId = scene.length;
            scene.push({
                __type__: 'cc.Node', _name: 'Light', _objFlags: 0, __editorExtras__: {},
                _parent: { __id__: wp }, _children: [], _active: true,
                _components: [{ __id__: transformId }, { __id__: spriteId }, { __id__: circId }],
                _level: scene[wp]._level + 1,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0, _layer: scene[wp]._layer,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
            });
            scene[transformId].node.__id__ = nodeId;
            scene[spriteId].node.__id__ = nodeId;
            scene[circId].node.__id__ = nodeId;
            // Insert Light BEFORE existing children so it renders behind WinPanel content.
            scene[wp]._children = scene[wp]._children || [];
            scene[wp]._children.unshift({ __id__: nodeId });
            changes.push('WinPanel Light (circular) added behind');
        } else {
            changes.push('WinPanel Light already present — skip');
        }
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));

// === 5. Toto prefab: Light child (inactive, light.png) ===
{
    if (fs.existsSync(TOTO_PREFAB)) {
        const prefab = JSON.parse(fs.readFileSync(TOTO_PREFAB, 'utf8'));
        const rootIdx = prefab.findIndex(o => o && o.__type__ === 'cc.Node' && o._parent === null);
        const rootNode = prefab[rootIdx];
        const hasLight = (rootNode._children || []).some(c => prefab[c.__id__]?._name === 'Light');
        if (!hasLight) {
            const transformId = prefab.length;
            prefab.push({
                __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _contentSize: { __type__: 'cc.Size', width: 200, height: 200 },
                _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
            });
            const spriteId = prefab.length;
            prefab.push({
                __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
                _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
                _spriteFrame: { __uuid__: LIGHT_SF, __expectedType__: 'cc.SpriteFrame' },
                _type: 0, _fillType: 0, _sizeMode: 0,
                _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
                _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
            });
            const prefabInfoId = prefab.length;
            prefab.push({
                __type__: 'cc.PrefabInfo', _name: '', _objFlags: 0, __editorExtras: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                fileId: '', sync: { __id__: 0 }, _id: '',
            });
            const nodeId = prefab.length;
            prefab.push({
                __type__: 'cc.Node', _name: 'Light', _objFlags: 0, __editorExtras__: {},
                _parent: { __id__: rootIdx }, _children: [],
                _active: false,
                _components: [], _prefab: { __id__: prefabInfoId },
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0, _layer: 33554432,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
            });
            prefab[transformId].node.__id__ = nodeId;
            prefab[spriteId].node.__id__ = nodeId;
            prefab[prefabInfoId].node.__id__ = nodeId;
            prefab[prefabInfoId].sync.__id__ = prefabInfoId;
            prefab[nodeId]._components = [{ __id__: transformId }, { __id__: spriteId }];
            // Light renders BEHIND View (inserted before existing children).
            rootNode._children = rootNode._children || [];
            rootNode._children.unshift({ __id__: nodeId });
            fs.writeFileSync(TOTO_PREFAB, JSON.stringify(prefab, null, 2));
            changes.push('Toto prefab Light child added (inactive)');
        } else {
            changes.push('Toto prefab Light already present — skip');
        }
    }
}

changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
