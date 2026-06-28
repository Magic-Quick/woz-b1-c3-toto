/**
 * Save Toto — attach explicit ColumnMoveEffect to current scene.
 *
 * Creates `System/ColumnMoveEffect` node with SaveTotoLinearMoveEffect(durationSec=2.6)
 * and wires SaveTotoBootstrap.columnMovementEffect to this component.
 *
 * Non-destructive patch: preserves layout and only appends missing node/components.
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
function findNodeByName(name) {
  return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}
function findComponentByType(type) {
  return scene.findIndex(o => o && o.__type__ === type);
}
function hasChild(parentId, childName) {
  const p = scene[parentId];
  return (p._children || []).some(c => scene[c.__id__]?._name === childName);
}
function addNode(name, parentId, pos = [0, 0, 0], layer = 1073741824, active = true) {
  const nodeId = scene.length;
  scene.push({
    __type__: 'cc.Node',
    _name: name,
    _objFlags: 0,
    __editorExtras__: {},
    _parent: parentId != null ? { __id__: parentId } : null,
    _children: [],
    _active: active,
    _components: [],
    _prefab: null,
    _lpos: { __type__: 'cc.Vec3', x: pos[0], y: pos[1], z: pos[2] },
    _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
    _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
    _mobility: 0,
    _layer: layer,
    _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
    _id: '',
  });
  if (parentId != null) scene[parentId]._children.push({ __id__: nodeId });
  return nodeId;
}
function addComponent(nodeId, type, props) {
  const compId = scene.length;
  scene.push({
    __type__: type,
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: nodeId },
    _enabled: true,
    __prefab: null,
    ...props,
    _id: '',
  });
  scene[nodeId]._components.push({ __id__: compId });
  return compId;
}

const SYSTEM_ID = findNodeByName('System');
if (SYSTEM_ID < 0) {
  console.error('System node not found');
  process.exit(1);
}
const BOOTSTRAP_TYPE = scriptType('assets/scripts/save-toto/controllers/SaveTotoBootstrap');
const LINEAR_TYPE = scriptType('assets/scripts/save-toto/Slot/ScrollEffects/SaveTotoLinearMoveEffect');
const bootstrapId = findComponentByType(BOOTSTRAP_TYPE);
if (bootstrapId < 0) {
  console.error('SaveTotoBootstrap component not found');
  process.exit(1);
}

let effectCompId = findComponentByType(LINEAR_TYPE);
if (effectCompId < 0) {
  // create node + UITransform + LinearMoveEffect
  let nodeId;
  if (!hasChild(SYSTEM_ID, 'ColumnMoveEffect')) {
    nodeId = addNode('ColumnMoveEffect', SYSTEM_ID, [0, 0, 0]);
    addComponent(nodeId, 'cc.UITransform', {
      _contentSize: { __type__: 'cc.Size', width: 100, height: 100 },
      _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    });
  } else {
    nodeId = (scene[SYSTEM_ID]._children || []).map(c => c.__id__).find(id => scene[id]?._name === 'ColumnMoveEffect');
  }
  effectCompId = addComponent(nodeId, LINEAR_TYPE, { durationSec: 2.6 });
  console.log('Added SaveTotoLinearMoveEffect -> System/ColumnMoveEffect, durationSec=2.6');
} else {
  scene[effectCompId].durationSec = 2.6;
  console.log('Updated existing SaveTotoLinearMoveEffect.durationSec=2.6');
}

scene[bootstrapId].columnMovementEffect = { __id__: effectCompId };
console.log('Wired SaveTotoBootstrap.columnMovementEffect ->', effectCompId);

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log('Done.');
