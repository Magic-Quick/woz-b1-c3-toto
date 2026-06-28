/**
 * Save Toto — точечный патч component-ref в scene.scene.
 *
 * Build-скрипт ошибочно указывал @property(Component) поля на NODES вместо
 * COMPONENTS. Cocos 3.x не авто-конвертирует node→component при десериализации,
 * поэтому поля были бы null при runtime. Этот патч пере-targetит ссылки на
 * нужный компонент на той же ноде, НЕ затрагивая ручные правки расстановки.
 *
 * Затронутые поля:
 *   - SlotView.balanceLabel       (node → cc.Label)
 *   - ThreatView.lockViews[3]     (node → SaveTotoLockView)
 *   - BonusView.basketViews[6]    (node → SaveTotoBasketView)
 *   - EndCardView.endWinLabel     (node → cc.Label)
 *
 * winLabel оставлен null (узел удалён; поле сделано optional в коде).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');

// Compressed type UUIDs (from .meta)
const TYPES = {
  SlotView: '95adadwkqNNpqP0rKY9nziS',
  ThreatView: '0870c4bToFKg7y+ha3HeVJ1',
  BonusView: 'b7226+SQplPoZWGNREzDQom',
  EndCardView: '8dbd88Vm0lKaZO3vNWviFbc',
  SaveTotoLockView: '33ed4alETFBXJbyISDa7qNx',
  SaveTotoBasketView: '6c4853x/otB8LNeyROHJLMJ',
};

const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

/** Найти первый компонент заданного типа на ноде. */
function findComponentOnNode(nodeId, compType) {
  const node = scene[nodeId];
  if (!node || !node._components) return null;
  for (const c of node._components) {
    const comp = scene[c.__id__];
    if (comp && comp.__type__ === compType) return c.__id__;
  }
  return null;
}

let patched = 0;

// --- SlotView.balanceLabel: node → cc.Label ---
for (const o of scene) {
  if (o.__type__ !== TYPES.SlotView) continue;
  if (o.balanceLabel && o.balanceLabel.__id__ != null) {
    const target = scene[o.balanceLabel.__id__];
    if (target && target.__type__ === 'cc.Node') {
      const lblId = findComponentOnNode(o.balanceLabel.__id__, 'cc.Label');
      if (lblId != null) { o.balanceLabel = { __id__: lblId }; patched++; console.log('SlotView.balanceLabel -> cc.Label', lblId); }
    }
  }
}

// --- ThreatView.lockViews[3]: node → SaveTotoLockView ---
for (const o of scene) {
  if (o.__type__ !== TYPES.ThreatView) continue;
  if (Array.isArray(o.lockViews)) {
    for (let i = 0; i < o.lockViews.length; i++) {
      const target = scene[o.lockViews[i].__id__];
      if (target && target.__type__ === 'cc.Node') {
        const compId = findComponentOnNode(o.lockViews[i].__id__, TYPES.SaveTotoLockView);
        if (compId != null) { o.lockViews[i] = { __id__: compId }; patched++; console.log(`ThreatView.lockViews[${i}] -> SaveTotoLockView`, compId); }
      }
    }
  }
}

// --- BonusView.basketViews[6]: node → SaveTotoBasketView ---
for (const o of scene) {
  if (o.__type__ !== TYPES.BonusView) continue;
  if (Array.isArray(o.basketViews)) {
    for (let i = 0; i < o.basketViews.length; i++) {
      const target = scene[o.basketViews[i].__id__];
      if (target && target.__type__ === 'cc.Node') {
        const compId = findComponentOnNode(o.basketViews[i].__id__, TYPES.SaveTotoBasketView);
        if (compId != null) { o.basketViews[i] = { __id__: compId }; patched++; console.log(`BonusView.basketViews[${i}] -> SaveTotoBasketView`, compId); }
      }
    }
  }
}

// --- EndCardView.endWinLabel: node → cc.Label ---
for (const o of scene) {
  if (o.__type__ !== TYPES.EndCardView) continue;
  if (o.endWinLabel && o.endWinLabel.__id__ != null) {
    const target = scene[o.endWinLabel.__id__];
    if (target && target.__type__ === 'cc.Node') {
      const lblId = findComponentOnNode(o.endWinLabel.__id__, 'cc.Label');
      if (lblId != null) { o.endWinLabel = { __id__: lblId }; patched++; console.log('EndCardView.endWinLabel -> cc.Label', lblId); }
    }
  }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`\nDone. Retargeted ${patched} component refs.`);
