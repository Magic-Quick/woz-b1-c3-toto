/**
 * Save Toto — точечный патч viewport clipping для Slot/Columns.
 *
 * Добавляет на node `Columns` компоненты `cc.Mask` + `cc.Graphics`,
 * как в reference slot-game template. Это ограничивает видимость
 * колонок до viewport и скрывает остальные 7 из 10 элементов.
 *
 * Не регенерирует сцену и не трогает ручные правки layout.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

const columnsId = scene.findIndex(o => o.__type__ === 'cc.Node' && o._name === 'Columns');
if (columnsId < 0) {
  console.error('Columns node not found');
  process.exit(1);
}
const columnsNode = scene[columnsId];
const componentIds = (columnsNode._components || []).map(c => c.__id__);
const hasMask = componentIds.some(id => scene[id]?.__type__ === 'cc.Mask');
const hasGraphics = componentIds.some(id => scene[id]?.__type__ === 'cc.Graphics');

let added = 0;
if (!hasMask) {
  const maskId = scene.length;
  scene.push({
    __type__: 'cc.Mask',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: columnsId },
    _enabled: true,
    __prefab: null,
    _type: 0,
    _inverted: false,
    _segments: 64,
    _alphaThreshold: 0.1,
    _id: '',
  });
  columnsNode._components.push({ __id__: maskId });
  added++;
  console.log('Added cc.Mask to Columns -> id', maskId);
}

if (!hasGraphics) {
  const graphicsId = scene.length;
  scene.push({
    __type__: 'cc.Graphics',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: columnsId },
    _enabled: true,
    __prefab: null,
    _customMaterial: null,
    _srcBlendFactor: 2,
    _dstBlendFactor: 4,
    _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
    _lineWidth: 1,
    _strokeColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
    _lineJoin: 2,
    _lineCap: 0,
    _fillColor: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 0 },
    _miterLimit: 10,
    _id: '',
  });
  columnsNode._components.push({ __id__: graphicsId });
  added++;
  console.log('Added cc.Graphics to Columns -> id', graphicsId);
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
console.log(`Done. added=${added} mask=${!hasMask} graphics=${!hasGraphics}`);
