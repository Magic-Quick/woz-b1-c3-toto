/**
 * Save Toto — recenter current basket positions in scene.
 *
 * Current generated positions are shifted right; this patch aligns the 3×2 bonus
 * grid to centered coordinates:
 *   row 1: x = -308, 0, 308 ; y = 123
 *   row 2: x = -308, 0, 308 ; y = -123
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

function findNodeByName(name) {
  return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}

const positions = [
  [-308, 123], [0, 123], [308, 123],
  [-308, -123], [0, -123], [308, -123],
];

for (let i = 1; i <= 6; i++) {
  const nodeId = findNodeByName(`Basket_${String(i).padStart(2, '0')}`);
  if (nodeId < 0) continue;
  const [x, y] = positions[i - 1];
  scene[nodeId]._lpos.x = x;
  scene[nodeId]._lpos.y = y;
  console.log(`Basket_${String(i).padStart(2, '0')} -> (${x}, ${y})`);
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log('Done. Bonus basket grid recentered.');
