/**
 * Save Toto — attach phase-2 event-driven animation components to current scene.
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

const LOCK_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoLockOpenRemoveAnimation');
const BASKET_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoBasketSelectedAnimation');
const PACKSHOT_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoPackshotIntroAnimation');
const CTA_PULSE_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoCtaPulseAnimation');

let added = 0;

for (const name of ['LockLeft', 'LockCenter', 'LockRight']) {
  const nodeId = findNodeByName(name);
  if (nodeId >= 0 && !hasComponent(nodeId, LOCK_ANIM)) {
    addCustomComponent(nodeId, LOCK_ANIM, {
      scaleUpMultiplier: 0.25,
      scaleUpDurationSec: 0.12,
      dropDistance: 120,
      removeDurationSec: 0.25,
    });
    console.log(`Added LockOpenRemoveAnimation -> ${name}`);
    added++;
  }
}

for (let i = 1; i <= 6; i++) {
  const basketName = `Basket_${String(i).padStart(2, '0')}`;
  const nodeId = findNodeByName(basketName);
  if (nodeId >= 0 && !hasComponent(nodeId, BASKET_ANIM)) {
    const glowChild = (scene[nodeId]._children || []).map(c => c.__id__).find(id => scene[id]?._name === 'Glow');
    addCustomComponent(nodeId, BASKET_ANIM, {
      glow: glowChild != null ? { __id__: glowChild } : null,
      peakScaleMultiplier: 0.18,
      scaleUpDurationSec: 0.16,
      scaleDownDurationSec: 0.18,
      glowInDurationSec: 0.12,
      glowHoldDurationSec: 0.3,
      glowOutDurationSec: 0.2,
    });
    console.log(`Added BasketSelectedAnimation -> ${basketName}`);
    added++;
  }
}

{
  const cageRootId = findNodeByName('CageRoot');
  const lightFxId = findNodeByName('LightFx');
  if (cageRootId >= 0 && !hasComponent(cageRootId, PACKSHOT_ANIM)) {
    addCustomComponent(cageRootId, PACKSHOT_ANIM, {
      lightFxNode: lightFxId >= 0 ? { __id__: lightFxId } : null,
      bumpScale: 1.05,
      settleScale: 0.92,
      bumpDurationSec: 0.2,
      fadeDurationSec: 0.4,
    });
    console.log('Added PackshotIntroAnimation -> CageRoot');
    added++;
  }
}

{
  const ctaButtonId = findNodeByName('CtaButton');
  if (ctaButtonId >= 0 && !hasComponent(ctaButtonId, CTA_PULSE_ANIM)) {
    addCustomComponent(ctaButtonId, CTA_PULSE_ANIM, {
      scaleMultiplier: 0.08,
      halfDurationSec: 0.4,
    });
    console.log('Added CtaPulseAnimation -> CtaButton');
    added++;
  }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`Done. Added ${added} phase-2 animation components.`);
