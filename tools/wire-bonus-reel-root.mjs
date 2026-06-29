/**
 * Save Toto — wire BonusView.reelRoot in current scene.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

const BONUS_VIEW_TYPE = 'b7226+SQplPoZWGNREzDQom';
const bonusView = scene.find(o => o && o.__type__ === BONUS_VIEW_TYPE);
const reelRootId = scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === 'ReelRoot');
if (!bonusView) {
  console.error('SaveTotoBonusView component not found');
  process.exit(1);
}
if (reelRootId < 0) {
  console.error('ReelRoot node not found');
  process.exit(1);
}
bonusView.reelRoot = { __id__: reelRootId };
fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log('Wired SaveTotoBonusView.reelRoot -> ReelRoot#' + reelRootId);
