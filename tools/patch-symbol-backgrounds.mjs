/**
 * Save Toto — add symbols_bg background to each slot symbol prefab.
 *
 * Inserts a "Background" child node (Sprite with symbols_bg) into the root
 * of every SaveTotoSymbol*.prefab, BEFORE the existing "View" child so it
 * renders behind the symbol image. Also clears SlotView.winLabel ref
 * (WinValueLabel removed; WinPanel gradient is baked into the panel sprite).
 *
 * Safe, idempotent: skips prefabs that already contain a "Background" node.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const PREFAB_DIR = path.join(ROOT, 'assets/prefabs/save-toto/slot');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const SYMBOLS_BG_SF_UUID = '48b972a7-1fd4-4a0a-aaa9-a81c7614cfb8@f9941';
const SYMBOLS = ['Oz', 'Key', 'Drop', 'Basket', 'Toto'];
const BG_W = 176;
const BG_H = 142;

function makeBackgroundBlock(rootNodeIdx) {
    // cc.UITransform
    const transform = {
        __type__: 'cc.UITransform',
        _name: '',
        _objFlags: 0,
        __editorExtras: {},
        node: { __id__: 0 }, // patched
        _enabled: true,
        __prefab: null,
        _contentSize: { __type__: 'cc.Size', width: BG_W, height: BG_H },
        _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
        _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
        _id: '',
    };
    const sprite = {
        __type__: 'cc.Sprite',
        _name: '',
        _objFlags: 0,
        __editorExtras: {},
        node: { __id__: 0 }, // patched
        _enabled: true,
        __prefab: null,
        _customMaterial: null,
        _srcBlendFactor: 2,
        _dstBlendFactor: 4,
        _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
        _spriteFrame: { __uuid__: SYMBOLS_BG_SF_UUID, __expectedType__: 'cc.SpriteFrame' },
        _type: 0,
        _fillType: 0,
        _sizeMode: 0,
        _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 },
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: true,
        _useGrayscale: false,
        _atlas: null,
        _id: '',
    };
    // cc.PrefabInfo (required for prefab child nodes)
    const prefabInfo = {
        __type__: 'cc.PrefabInfo',
        _name: '',
        _objFlags: 0,
        __editorExtras: {},
        node: { __id__: 0 }, // patched
        _enabled: true,
        __prefab: null,
        fileId: '',
        sync: { __id__: 0 }, // patched to prefabInfo itself
        _id: '',
    };
    const node = {
        __type__: 'cc.Node',
        _name: 'Background',
        _objFlags: 0,
        __editorExtras: {},
        _parent: { __id__: rootNodeIdx },
        _children: [],
        _active: true,
        _components: [],
        _prefab: { __id__: 0 }, // patched to prefabInfo
        _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
        _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
        _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
        _mobility: 0,
        _layer: 33554432,
        _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
        _id: '',
    };
    return { node, transform, sprite, prefabInfo };
}

let totalAdded = 0;

for (const sym of SYMBOLS) {
    const file = path.join(PREFAB_DIR, `SaveTotoSymbol${sym}.prefab`);
    if (!fs.existsSync(file)) {
        console.warn(`Skip ${sym}: prefab not found`);
        continue;
    }
    const prefab = JSON.parse(fs.readFileSync(file, 'utf8'));

    // root node is the cc.Node with _parent null
    const rootIdx = prefab.findIndex(o => o && o.__type__ === 'cc.Node' && o._parent === null);
    if (rootIdx < 0) {
        console.warn(`Skip ${sym}: root node not found`);
        continue;
    }
    const rootNode = prefab[rootIdx];

    // idempotency: skip if Background already a child
    const hasBg = (rootNode._children || []).some(c => {
        const child = prefab[c.__id__];
        return child && child._name === 'Background';
    });
    if (hasBg) {
        console.log(`${sym}: Background already present — skip`);
        continue;
    }

    // Build the block at the end of the prefab array
    const start = prefab.length;
    const block = makeBackgroundBlock(rootIdx);
    prefab.push(block.transform);
    prefab.push(block.sprite);
    prefab.push(block.prefabInfo);
    prefab.push(block.node);

    const transformIdx = start;
    const spriteIdx = start + 1;
    const prefabInfoIdx = start + 2;
    const nodeIdx = start + 3;

    // Patch refs
    block.transform.node.__id__ = nodeIdx;
    block.sprite.node.__id__ = nodeIdx;
    block.prefabInfo.node.__id__ = nodeIdx;
    block.prefabInfo.sync.__id__ = prefabInfoIdx;
    block.node._prefab.__id__ = prefabInfoIdx;
    block.node._components = [{ __id__: transformIdx }, { __id__: spriteIdx }];

    // Insert Background BEFORE View in children so it renders behind
    rootNode._children = rootNode._children || [];
    rootNode._children.unshift({ __id__: nodeIdx });

    fs.writeFileSync(file, JSON.stringify(prefab, null, 2));
    console.log(`${sym}: added Background#${nodeIdx} (bg ${BG_W}x${BG_H}) before View`);
    totalAdded++;
}

// Clear SlotView.winLabel (WinValueLabel removed by user; gradient baked in WinPanel)
if (fs.existsSync(SCENE)) {
    const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));
    const slotView = scene.find(o => o && o.slotController && o.balanceLabel);
    if (slotView && slotView.winLabel && slotView.winLabel.__id__ != null) {
        slotView.winLabel = null;
        fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
        console.log('Cleared SlotView.winLabel (WinValueLabel removed, gradient baked in WinPanel)');
    } else {
        console.log('SlotView.winLabel already null — scene untouched');
    }
}

console.log(`Done. Added ${totalAdded} backgrounds.`);
