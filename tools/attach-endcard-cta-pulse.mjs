/**
 * Save Toto — attach CTA pulse to real EndCard PlayNowButton.
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
  return (scene[nodeId]._components || []).some(c => scene[c.__id__]?.__type__ === compType);
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

const CTA_PULSE = scriptType('assets/scripts/save-toto/animations/SaveTotoCtaPulseAnimation');
const playNowId = findNodeByName('PlayNowButton');
if (playNowId < 0) {
  console.error('PlayNowButton not found');
  process.exit(1);
}
if (!hasComponent(playNowId, CTA_PULSE)) {
  addCustomComponent(playNowId, CTA_PULSE, { scaleMultiplier: 0.08, halfDurationSec: 0.4 });
  console.log('Added SaveTotoCtaPulseAnimation -> PlayNowButton');
} else {
  console.log('PlayNowButton already has CTA pulse');
}
fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log('Done.');
