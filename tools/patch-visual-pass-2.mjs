/**
 * Save Toto — patch 2: dimmer transform, LockFxRoot active, assembled EndTotoRoot,
 * FireSprite anchor bottom (visual: low fixed, top lowers).
 *
 * OI-512 (dimmer), OI-515 (key flight root active), OI-516 (assembled packshot Toto),
 * OI-514 (fire anchor bottom).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

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
function sfUuid(relPngNoExt) {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, relPngNoExt + '.png.meta'), 'utf8'));
    return meta.uuid + '@f9941';
}
function newNode(parentIdx, name, x, y, layer, children) {
    const nodeId = scene.length;
    scene.push({
        __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {},
        _parent: { __id__: parentIdx }, _children: children || [],
        _active: true, _components: [],
        _level: scene[parentIdx]._level + 1,
        _lpos: { __type__: 'cc.Vec3', x, y, z: 0 },
        _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
        _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
        _mobility: 0, _layer: layer,
        _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
    });
    return nodeId;
}
function newUITransform(nodeIdx, w, h, ax, ay) {
    const id = scene.length;
    scene.push({
        __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
        node: { __id__: nodeIdx }, _enabled: true, __prefab: null,
        _contentSize: { __type__: 'cc.Size', width: w, height: h },
        _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
        _anchorPoint: { __type__: 'cc.Vec2', x: ax, y: ay }, _id: '',
    });
    return id;
}
function newSprite(nodeIdx, sfUuidVal) {
    const id = scene.length;
    scene.push({
        __type__: 'cc.Sprite', _name: '', _objFlags: 0, __editorExtras__: {},
        node: { __id__: nodeIdx }, _enabled: true, __prefab: null,
        _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _spriteFrame: { __uuid__: sfUuidVal, __expectedType__: 'cc.SpriteFrame' },
        _type: 0, _fillType: 0, _sizeMode: 0,
        _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
        _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
    });
    return id;
}

let changes = [];

// === 1. BonusDimmer: ensure UITransform (code also sets size, but scene needs base) ===
{
    const bd = findNode('BonusDimmer');
    if (bd >= 0) {
        if (findCompIdx(bd, 'cc.UITransform') < 0) {
            const tid = newUITransform(bd, 960, 480, 0.5, 0.5);
            scene[bd]._components.push({ __id__: tid });
            changes.push('BonusDimmer UITransform added');
        }
        scene[bd]._active = false; // управляется кодом
        // position over reels
        scene[bd]._lpos = { __type__: 'cc.Vec3', x: 0, y: 130, z: 0 };
        changes.push('BonusDimmer positioned over reels');
    }
}

// === 2. LockFxRoot: active=true (иначе ключи не рендерятся) ===
{
    const lfx = findNode('LockFxRoot');
    if (lfx >= 0) {
        scene[lfx]._active = true;
        changes.push('LockFxRoot active=true (key flight render root)');
    }
}

// === 3. EndTotoRoot → assembled Toto (body+head+tongue) ===
{
    const et = findNode('EndTotoRoot');
    if (et >= 0) {
        const layer = scene[et]._layer;
        // Remove existing Sprite component (was single toto-body).
        const spriteCompIdx = findCompIdx(et, 'cc.Sprite');
        if (spriteCompIdx >= 0) {
            // Remove the component object + reference.
            scene[et]._components = scene[et]._components.filter(c => c.__id__ !== spriteCompIdx);
            scene[spriteCompIdx] = null; // nullify, keep array stable
            changes.push('EndTotoRoot single sprite removed');
        }
        // Ensure UITransform (container).
        if (findCompIdx(et, 'cc.UITransform') < 0) {
            const tid = newUITransform(et, 400, 700, 0.5, 0.5);
            scene[et]._components.push({ __id__: tid });
        }
        // Clear existing children if any.
        scene[et]._children = [];

        const bodySf = sfUuid('assets/art/characters/toto-body');
        const headSf = sfUuid('assets/art/characters/toto-head');
        const tongueSf = sfUuid('assets/art/characters/toto-tongue');

        // Body
        const bodyId = newNode(et, 'EndTotoBody', 43.651, -68.594, layer);
        const bodyTr = newUITransform(bodyId, 310, 565, 0.5, 0.5);
        const bodySp = newSprite(bodyId, bodySf);
        scene[bodyId]._components = [{ __id__: bodyTr }, { __id__: bodySp }];

        // Head
        const headId = newNode(et, 'EndTotoHead', 0, 50, layer);
        const headTr = newUITransform(headId, 301, 403, 0.5, 0.5);
        const headSp = newSprite(headId, headSf);
        scene[headId]._components = [{ __id__: headTr }, { __id__: headSp }];

        // Tongue
        const tongueId = newNode(et, 'EndTotoTongue', 0, -120, layer);
        const tongueTr = newUITransform(tongueId, 60, 64, 0.5, 0.5);
        const tongueSp = newSprite(tongueId, tongueSf);
        scene[tongueId]._components = [{ __id__: tongueTr }, { __id__: tongueSp }];

        scene[et]._children = [
            { __id__: bodyId },
            { __id__: headId },
            { __id__: tongueId },
        ];
        changes.push('EndTotoRoot assembled Toto (body+head+tongue)');
    }
}

// === 4. FireSprite: anchor bottom (0.5, 0) — visual low fixed, top lowers on scale ===
{
    const fire = findNode('FireSprite');
    if (fire >= 0) {
        const trIdx = findCompIdx(fire, 'cc.UITransform');
        if (trIdx >= 0) {
            const tr = scene[trIdx];
            const oldH = tr._contentSize.height;
            tr._anchorPoint = { __type__: 'cc.Vec2', x: 0.5, y: 0 };
            // Сдвинуть позицию вниз на halfH, чтобы низ остался визуально там же.
            const p = scene[fire]._lpos;
            scene[fire]._lpos = { __type__: 'cc.Vec3', x: p.x, y: p.y - oldH / 2, z: p.z };
            changes.push('FireSprite anchor bottom (top lowers, low fixed)');
        }
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
