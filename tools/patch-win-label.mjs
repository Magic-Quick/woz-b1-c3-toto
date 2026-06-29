/**
 * Save Toto — add WinValueLabel under WinPanel and wire SlotView.winLabel.
 *
 * OI-204: WIN — fixed visual label showing jackpot (10,000,000).
 * WinPanel was empty (no Label child). This patch is safe: only appends a
 * new node + cc.Label under WinPanel and sets SlotView.winLabel ref.
 * Does not touch positions of existing nodes.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

const FONT_UUID = '6122a923-0629-4c5e-a041-2e4a22a541af'; // Bodega Sans (same as BalanceLabel)

function findNode(name) {
    return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}
function findCompOnNode(nodeIdx, type) {
    const node = scene[nodeIdx];
    for (const c of node._components) {
        if (scene[c.__id__].__type__ === type) return c.__id__;
    }
    return -1;
}

const winPanelIdx = findNode('WinPanel');
if (winPanelIdx < 0) { console.error('WinPanel not found'); process.exit(1); }

// Skip if WinValueLabel already exists
if (findNode('WinValueLabel') >= 0) {
    console.log('WinValueLabel already exists — skipping.');
    process.exit(0);
}

const winPanel = scene[winPanelIdx];
const winPanelChildren = winPanel._children || [];

// 1. cc.Label component
const labelId = scene.length;
const label = {
    __type__: 'cc.Label',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: 0 }, // patched after node id known
    _enabled: true,
    __prefab: null,
    _customMaterial: null,
    _srcBlendFactor: 2,
    _dstBlendFactor: 4,
    _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
    _string: '10,000,000',
    _horizontalAlign: 1,
    _verticalAlign: 1,
    _actualFontSize: 40,
    _fontSize: 40,
    _fontFamily: 'Arial',
    _lineHeight: 48,
    _overflow: 0,
    _enableWrapText: true,
    _font: { __uuid__: FONT_UUID, __expectedType__: 'cc.TTFFont' },
    _isSystemFontUsed: false,
    _spacingX: 0,
    _isItalic: false,
    _isBold: false,
    _isUnderline: false,
    _underlineHeight: 2,
    _cacheMode: 0,
    _enableOutline: false,
    _outlineColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
    _outlineWidth: 2,
    _enableShadow: false,
    _shadowColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
    _shadowOffset: { __type__: 'cc.Vec2', x: 2, y: 2 },
    _shadowBlur: 2,
    _id: '',
};
scene.push(label);

// 2. UITransform component
const transformId = scene.length;
const transform = {
    __type__: 'cc.UITransform',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: 0 },
    _enabled: true,
    __prefab: null,
    _contentSize: { __type__: 'cc.Size', width: 320, height: 60 },
    _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    _id: '',
};
scene.push(transform);

// 3. Node
const nodeId = scene.length;
const node = {
    __type__: 'cc.Node',
    _name: 'WinValueLabel',
    _objFlags: 0,
    __editorExtras__: {},
    _parent: { __id__: winPanelIdx },
    _children: [],
    _active: true,
    _components: [
        { __id__: transformId },
        { __id__: labelId },
    ],
    _level: winPanel._level + 1,
    _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
    _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
    _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
    _mobility: 0,
    _layer: winPanel._layer,
    _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
    _id: '',
};
scene.push(node);

// Fix component node refs
label.node.__id__ = nodeId;
transform.node.__id__ = nodeId;

// Attach to WinPanel
winPanel._children = winPanel._children || [];
winPanel._children.push({ __id__: nodeId });

// Wire SlotView.winLabel
const slotView = scene.find(o => o && o.slotController && o.balanceLabel);
if (!slotView) {
    console.error('SaveTotoSlotView not found — winLabel NOT wired');
} else {
    slotView.winLabel = { __id__: labelId };
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`Added WinValueLabel#${nodeId} under WinPanel#${winPanelIdx}, winLabel -> label#${labelId}`);
