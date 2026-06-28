/**
 * Save Toto — attach idle animation components to current scene.
 *
 * Adds:
 * - SaveTotoAutoPulse to SpinButton and Basket_01..06
 * - SaveTotoAutoFloat to TotoHead and TotoTongue
 *
 * Safe, non-destructive patch: preserves current scene layout and only appends
 * missing custom components.
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
function hasComponent(nodeId, compType) {
  const node = scene[nodeId];
  return (node._components || []).some(c => scene[c.__id__]?.__type__ === compType);
}
function addCustomComponent(nodeId, compType, props) {
  const compId = scene.length;
  scene.push({
    __type__: compType,
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

const AUTO_PULSE = scriptType('assets/scripts/save-toto/animations/SaveTotoAutoPulse');
const AUTO_FLOAT = scriptType('assets/scripts/save-toto/animations/SaveTotoAutoFloat');

let added = 0;

// SpinButton pulse
{
  const nodeId = findNodeByName('SpinButton');
  if (nodeId >= 0 && !hasComponent(nodeId, AUTO_PULSE)) {
    addCustomComponent(nodeId, AUTO_PULSE, {
      scaleMultiplier: 0.08,
      halfDurationSec: 0.4,
      initialDelaySec: 0,
      playOnEnable: true,
    });
    console.log('Added AutoPulse -> SpinButton');
    added++;
  }
}

// Baskets pulse with slight stagger
for (let i = 1; i <= 6; i++) {
  const name = `Basket_${String(i).padStart(2, '0')}`;
  const nodeId = findNodeByName(name);
  if (nodeId >= 0 && !hasComponent(nodeId, AUTO_PULSE)) {
    addCustomComponent(nodeId, AUTO_PULSE, {
      scaleMultiplier: 0.05,
      halfDurationSec: 0.55,
      initialDelaySec: (i - 1) * 0.04,
      playOnEnable: true,
    });
    console.log(`Added AutoPulse -> ${name}`);
    added++;
  }
}

// Toto head float
{
  const nodeId = findNodeByName('TotoHead');
  if (nodeId >= 0 && !hasComponent(nodeId, AUTO_FLOAT)) {
    addCustomComponent(nodeId, AUTO_FLOAT, {
      yOffset: 6,
      rotationZDeg: 2.5,
      halfDurationSec: 0.9,
      initialDelaySec: 0,
      playOnEnable: true,
    });
    console.log('Added AutoFloat -> TotoHead');
    added++;
  }
}

// Toto tongue float (faster, smaller)
{
  const nodeId = findNodeByName('TotoTongue');
  if (nodeId >= 0 && !hasComponent(nodeId, AUTO_FLOAT)) {
    addCustomComponent(nodeId, AUTO_FLOAT, {
      yOffset: 4,
      rotationZDeg: 4,
      halfDurationSec: 0.7,
      initialDelaySec: 0.15,
      playOnEnable: true,
    });
    console.log('Added AutoFloat -> TotoTongue');
    added++;
  }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`Done. Added ${added} idle animation components.`);
