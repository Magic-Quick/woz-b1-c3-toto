/**
 * Save Toto — генератор сцены и symbol-prefabs.
 *
 * Источник данных: .plbx/game-design/scene-blueprint.json + SCENE_SETUP.md.
 * Читает UUID из .meta файлов (скрипты, спрайты, шрифты) и собирает:
 *   - assets/scene.scene: полная иерархия по blueprint + script components + explicit wiring
 *   - assets/prefabs/save-toto/slot/SaveTotoSymbol{Oz,Key,Drop,Basket,Toto}.prefab
 *
 * Правила (AGENTS.md): .meta НЕ создаются вручную (Cocos генерирует при импорте);
 * ElementConfiguration.elementType.prefab оставлены null — wiring prefab-ссылок
 * выполняется в Cocos inspector после импорта .prefab (OI-505).
 *
 * UUID-сжатие для custom __type__ валидировано эмпирически против reference slot-game.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const UI_LAYER = 33554432;

function compressUuid(u) {
  let s = u.replace(/-/g, '');
  if (s.length !== 32) return u;
  let out = s.slice(0, 5);
  let bits = '';
  for (let i = 5; i < s.length; i++) bits += parseInt(s[i], 16).toString(2).padStart(4, '0');
  while (bits.length % 6 !== 0) bits += '0';
  for (let i = 0; i < bits.length; i += 6) out += BASE64[parseInt(bits.slice(i, i + 6), 2)];
  return out;
}

// ── Чтение UUID-карт из .meta ──
function readMeta(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function scriptType(relPath) {
  const m = readMeta(path.join(ROOT, 'assets/scripts/save-toto', relPath + '.ts.meta'));
  return compressUuid(m.uuid);
}
function spriteRef(relFromArt) {
  const m = readMeta(path.join(ROOT, 'assets/art', relFromArt + '.meta'));
  const sub = Object.keys(m.subMetas).find(s => m.subMetas[s].importer === 'sprite-frame') || Object.keys(m.subMetas)[0];
  return { __uuid__: `${m.uuid}@${sub}`, __expectedType__: 'cc.SpriteFrame' };
}
/** Прочитать UUID prefab-ассета, если он импортирован (.prefab.meta существует). */
function prefabUuidIfExists(name) {
  const p = path.join(ROOT, `assets/prefabs/save-toto/slot/${name}.prefab.meta`);
  if (!fs.existsSync(p)) return null;
  return readMeta(p).uuid;
}
/** Prefab-ссылка для @property(Prefab). */
function prefabRef(uuid) { return { __uuid__: uuid, __expectedType__: 'cc.Prefab' }; }

// ── Builder ──
class Builder {
  constructor() { this.objs = []; }
  add(obj) { this.objs.push(obj); return this.objs.length - 1; }
  node(name, parentId, pos = [0, 0, 0], layer = UI_LAYER, active = true) {
    const id = this.add({
      __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {},
      _parent: parentId != null ? { __id__: parentId } : null,
      _children: [], _active: active, _components: [], _prefab: null,
      _lpos: { __type__: 'cc.Vec3', x: pos[0], y: pos[1], z: pos[2] },
      _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
      _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
      _mobility: 0, _layer: layer, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
    });
    if (parentId != null) this.objs[parentId]._children.push({ __id__: id });
    return id;
  }
  comp(type, nodeId, extra = {}) {
    const id = this.add({ __type__: type, _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: nodeId }, _enabled: true, __prefab: null, ...extra });
    this.objs[nodeId]._components.push({ __id__: id });
    return id;
  }
  uiTransform(nodeId, w, h, ax = 0.5, ay = 0.5) {
    return this.comp('cc.UITransform', nodeId, {
      _contentSize: { __type__: 'cc.Size', width: w, height: h },
      _anchorPoint: { __type__: 'cc.Vec2', x: ax, y: ay }, _id: '',
    });
  }
  sprite(nodeId, sf, sizeMode = 0, color = [255, 255, 255, 255]) {
    return this.comp('cc.Sprite', nodeId, {
      _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
      _color: { __type__: 'cc.Color', r: color[0], g: color[1], b: color[2], a: color[3] },
      _spriteFrame: sf, _type: 0, _fillType: 0, _sizeMode: sizeMode,
      _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0,
      _isTrimmedMode: true, _useGrayscale: false, _atlas: null, _id: '',
    });
  }
  label(nodeId, str, fontSize = 40, fontUuid = null, color = [255, 255, 255, 255]) {
    return this.comp('cc.Label', nodeId, {
      _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4,
      _color: { __type__: 'cc.Color', r: color[0], g: color[1], b: color[2], a: color[3] },
      _string: str, _horizontalAlign: 1, _verticalAlign: 1, _actualFontSize: fontSize, _fontSize: fontSize,
      _fontFamily: 'Arial', _lineHeight: fontSize + 4, _overflow: 0, _enableWrapText: true,
      _font: fontUuid ? { __uuid__: fontUuid } : null, _isSystemFontUsed: !fontUuid, _spacingX: 0, _id: '',
    });
  }
  button(nodeId, interactable = true) {
    return this.comp('cc.Button', nodeId, {
      clickEvents: [], _interactable: interactable, _transition: 1,
      _normalColor: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
      _hoverColor: { __type__: 'cc.Color', r: 211, g: 211, b: 211, a: 255 },
      _pressedColor: { __type__: 'cc.Color', r: 124, g: 124, b: 124, a: 255 },
      _disabledColor: { __type__: 'cc.Color', r: 124, g: 124, b: 124, a: 255 },
      _normalSprite: null, _hoverSprite: null, _pressedSprite: null, _disabledSprite: null,
      _duration: 0.1, _zoomScale: 1.1, _target: { __id__: nodeId }, _id: '',
    });
  }
  opacity(nodeId, a = 255) {
    return this.comp('cc.UIOpacity', nodeId, { _opacity: a, _id: '' });
  }
  custom(type, nodeId, props = {}) { return this.comp(type, nodeId, { ...props, _id: '' }); }
  ref(id) { return { __id__: id }; }
}

// ── Symbol prefab generator (mirrors reference SlotElement_2 structure) ──
function rid() { return Array.from({ length: 22 }, () => BASE64[Math.floor(Math.random() * 64)]).join(''); }
function buildSymbolPrefab(name, outPath, iconSpriteUuid, symbolId) {
  const objs = [];
  const push = (o) => { objs.push(o); return objs.length - 1; };
  const fileId = () => Array.from({ length: 22 }, () => BASE64[Math.floor(Math.random() * 64)]).join('');
  // 0: Prefab
  push({ __type__: 'cc.Prefab', _name: name, _objFlags: 0, __editorExtras__: {}, _native: '', data: { __id__: 1 }, optimizationPolicy: 0, persistent: false });
  // 1: root node
  push({ __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {}, _parent: null, _children: [{ __id__: 2 }], _active: true, _components: [{ __id__: 8 }, { __id__: 10 }], _prefab: { __id__: 12 }, _lpos: v3(0,0,0), _lrot: q(), _lscale: v3(1,1,1), _mobility: 0, _layer: UI_LAYER, _euler: v3(0,0,0), _id: '' });
  // 2: View (icon) node
  push({ __type__: 'cc.Node', _name: 'View', _objFlags: 0, __editorExtras__: {}, _parent: { __id__: 1 }, _children: [], _active: true, _components: [{ __id__: 3 }, { __id__: 5 }], _prefab: { __id__: 7 }, _lpos: v3(0,0,0), _lrot: q(), _lscale: v3(1,1,1), _mobility: 0, _layer: UI_LAYER, _euler: v3(0,0,0), _id: '' });
  // 3: UITransform(View)
  push({ __type__: 'cc.UITransform', _name:'', _objFlags:0, __editorExtras__:{}, node:{__id__:2}, _enabled:true, __prefab:{__id__:4}, _contentSize:{__type__:'cc.Size',width:176,height:142}, _anchorPoint:{__type__:'cc.Vec2',x:0.5,y:0.5}, _id:'' });
  // 4: CompPrefabInfo
  push({ __type__: 'cc.CompPrefabInfo', fileId: fileId() });
  // 5: Sprite(View) — icon
  push({ __type__: 'cc.Sprite', _name:'', _objFlags:0, __editorExtras__:{}, node:{__id__:2}, _enabled:true, __prefab:{__id__:6}, _customMaterial:null, _srcBlendFactor:2, _dstBlendFactor:4, _color:{__type__:'cc.Color',r:255,g:255,b:255,a:255}, _spriteFrame:{__uuid__:iconSpriteUuid,__expectedType__:'cc.SpriteFrame'}, _type:0, _fillType:0, _sizeMode:1, _fillCenter:{__type__:'cc.Vec2',x:0,y:0}, _fillStart:0, _fillRange:0, _isTrimmedMode:true, _useGrayscale:false, _atlas:null, _id:'' });
  // 6: CompPrefabInfo
  push({ __type__: 'cc.CompPrefabInfo', fileId: fileId() });
  // 7: PrefabInfo(View)
  push({ __type__: 'cc.PrefabInfo', root:{__id__:1}, asset:{__id__:0}, fileId:fileId(), instance:null, targetOverrides:null, nestedPrefabInstanceRoots:null });
  // 8: UITransform(root)
  push({ __type__: 'cc.UITransform', _name:'', _objFlags:0, __editorExtras__:{}, node:{__id__:1}, _enabled:true, __prefab:{__id__:9}, _contentSize:{__type__:'cc.Size',width:176,height:142}, _anchorPoint:{__type__:'cc.Vec2',x:0.5,y:0.5}, _id:'' });
  // 9: CompPrefabInfo
  push({ __type__: 'cc.CompPrefabInfo', fileId: fileId() });
  // 10: SaveTotoSlotElement (custom)
  push({ __type__: scriptType('Slot/Elements/SaveTotoSlotElement'), _name:'', _objFlags:0, __editorExtras__:{}, node:{__id__:1}, _enabled:true, __prefab:{__id__:11}, picture:{__id__:5}, id: symbolId, _id:'' });
  // 11: CompPrefabInfo
  push({ __type__: 'cc.CompPrefabInfo', fileId: fileId() });
  // 12: PrefabInfo(root)
  push({ __type__: 'cc.PrefabInfo', root:{__id__:1}, asset:{__id__:0}, fileId:fileId(), instance:null, targetOverrides:null });
  fs.writeFileSync(outPath, JSON.stringify(objs, null, 2));
}
const v3 = (x,y,z) => ({ __type__:'cc.Vec3', x, y, z });
const q = () => ({ __type__:'cc.Quat', x:0, y:0, z:0, w:1 });

// ── Main scene build ──
function buildScene() {
  const b = new Builder();
  // 0: SceneAsset, 1: Scene — created with children placeholder
  b.add({ __type__: 'cc.SceneAsset', _name: 'scene', _objFlags: 0, __editorExtras__: {}, _native: '', scene: { __id__: 1 } });
  b.add({ __type__: 'cc.Scene', _name: 'scene', _objFlags: 0, __editorExtras__: {}, _parent: null, _children: [], _active: true, _components: [], _prefab: null, _lpos: v3(0,0,0), _lrot: q(), _lscale: v3(1,1,1), _mobility: 0, _layer: 1073741824, _euler: v3(0,0,0), autoReleaseAssets: false, _globals: null, _id: '1350710a-5ac6-48f4-8123-d77bc580e466' });
  const sceneId = 1;

  // Canvas
  const canvas = b.node('Canvas', sceneId, [540, 960, 0], UI_LAYER);
  b.uiTransform(canvas, 1080, 1920);
  b.comp('cc.Canvas', canvas, { _cameraComponent: null, _alignCanvasWithScreen: true, _id: '' }); // camera set later
  b.comp('cc.Widget', canvas, { _alignFlags: 45, _target: null, _left: 0, _right: 0, _top: 0, _bottom: 0, _horizontalCenter: 0, _verticalCenter: 0, _isAbsLeft: true, _isAbsRight: true, _isAbsTop: true, _isAbsBottom: true, _isAbsHorizontalCenter: true, _isAbsVerticalCenter: true, _originalWidth: 0, _originalHeight: 0, _alignMode: 2, _lockFlags: 0, _id: '' });
  // Camera
  const cam = b.node('Camera', canvas, [0, 0, 1000], 1073741824);
  const camComp = b.comp('cc.Camera', cam, { _projection: 0, _priority: 0, _fov: 45, _fovAxis: 0, _orthoHeight: 960, _near: 0, _far: 2000, _color: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 }, _depth: 1, _stencil: 0, _clearFlags: 7, _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 }, _aperture: 19, _shutter: 7, _iso: 0, _screenScale: 1, _visibility: 1108344832, _targetTexture: null, _postProcess: null, _usePostProcess: false, _cameraType: -1, _trackingType: 0, _id: '' });
  b.objs[canvas + 0]; // link camera to canvas: set Canvas._cameraComponent
  // find Canvas component id (2nd comp on canvas)
  const canvasComps = b.objs[canvas]._components;
  const canvasCompId = canvasComps[1].__id__;
  b.objs[canvasCompId]._cameraComponent = { __id__: camComp };

  // ── Layers ──
  const bgLayer = b.node('BackgroundLayer', canvas, [0, 0, 0]); b.uiTransform(bgLayer, 1080, 1920);
  const threatLayer = b.node('ThreatLayer', canvas, [0, 0, 0]); b.uiTransform(threatLayer, 1080, 1920);
  const slotLayer = b.node('SlotLayer', canvas, [0, 0, 0]); b.uiTransform(slotLayer, 1080, 1920);
  const hudLayer = b.node('HudLayer', canvas, [0, 0, 0]); b.uiTransform(hudLayer, 1080, 1920);
  const fxLayer = b.node('FxLayer', canvas, [0, 0, 0]); b.uiTransform(fxLayer, 1080, 1920);
  const endCardLayer = b.node('EndCardLayer', canvas, [0, 0, 0], UI_LAYER, false); b.uiTransform(endCardLayer, 1080, 1920);

  // BackgroundLayer > BackgroundImage
  const bgImg = b.node('BackgroundImage', bgLayer, [0, 0, 0]); b.uiTransform(bgImg, 2315, 2313); b.sprite(bgImg, spriteRef('backgrounds/background.png'), 0);

  // ── ThreatLayer ──
  const logo = b.node('Logo', threatLayer, [-360, 720, 0]); b.uiTransform(logo, 395, 296); b.sprite(logo, spriteRef('logos/logo_woz_slots.png'), 1);
  const cageRoot = b.node('CageRoot', threatLayer, [60, 470, 0]); b.uiTransform(cageRoot, 620, 880);
  const cageSwing = b.node('CageSwingRoot', cageRoot, [0, 0, 0]); b.uiTransform(cageSwing, 620, 880);
  const cageBase = b.node('CageBase', cageSwing, [0, 0, 0]); b.uiTransform(cageBase, 740, 1200); b.sprite(cageBase, spriteRef('scene/cage.png'), 0);
  const totoRoot = b.node('TotoRoot', cageSwing, [70, -40, 0]); b.uiTransform(totoRoot, 300, 440);
  const totoBody = b.node('TotoBody', totoRoot, [0, 0, 0]); b.uiTransform(totoBody, 378, 672); b.sprite(totoBody, spriteRef('characters/toto-body.png'), 1);
  const totoHead = b.node('TotoHead', totoRoot, [0, 200, 0]); b.uiTransform(totoHead, 301, 403); b.sprite(totoHead, spriteRef('characters/toto-head.png'), 1);
  const totoTongue = b.node('TotoTongue', totoHead, [0, -120, 0]); b.uiTransform(totoTongue, 60, 64); b.sprite(totoTongue, spriteRef('characters/toto-tongue.png'), 1);
  const locksRoot = b.node('LocksRoot', cageSwing, [-60, -320, 0]); b.uiTransform(locksRoot, 620, 210);
  // Locks (SaveTotoLockView + Sprite)
  const lockIds = [];
  const lockData = [['LockLeft', 'left', -180, spriteRef('scene/locks/lock-left.png')], ['LockCenter', 'center', 0, spriteRef('scene/locks/lock-center.png')], ['LockRight', 'right', 180, spriteRef('scene/locks/lock-right.png')]];
  for (const [lname, lkid, lx, lsf] of lockData) {
    const ln = b.node(lname, locksRoot, [lx, 0, 0]); b.uiTransform(ln, 185, 280); b.sprite(ln, lsf, 1); b.opacity(ln, 255);
    b.custom(scriptType('views/SaveTotoLockView'), ln, { lockId: lkid });
    lockIds.push(ln);
  }
  const openLockFx = b.node('OpenLockFxRoot', cageSwing, [0, 0, 0], UI_LAYER, false); b.uiTransform(openLockFx, 326, 431); b.sprite(openLockFx, spriteRef('scene/locks/open-lock.png'), 1);
  const fireRoot = b.node('FireRoot', threatLayer, [0, 170, 0]); b.uiTransform(fireRoot, 900, 360);
  const fireSprite = b.node('FireSprite', fireRoot, [0, 0, 0]); b.uiTransform(fireSprite, 1085, 593); b.sprite(fireSprite, spriteRef('scene/fire.png'), 0); b.opacity(fireSprite, 255);
  const lightFx = b.node('LightFx', fireRoot, [0, 0, 0], UI_LAYER, false); b.uiTransform(lightFx, 815, 703); b.sprite(lightFx, spriteRef('scene/light.png'), 1);
  // ThreatView component (on threatLayer)
  // NOTE: lockViews must reference SaveTotoLockView COMPONENTS, not nodes (Cocos 3.x no auto-convert).
  const lockViewCompIds = [];
  for (const ln of lockIds) {
    const lv = b.objs[ln]._components.find(c => b.objs[c.__id__].__type__ === scriptType('views/SaveTotoLockView')).__id__;
    lockViewCompIds.push(lv);
  }
  const threatViewComp = b.custom(scriptType('views/SaveTotoThreatView'), threatLayer, {
    fireNode: b.ref(fireSprite), lockViews: lockViewCompIds.map(id => b.ref(id)),
    cageRoot: b.ref(cageRoot), totoRoot: b.ref(totoRoot), lightFxNode: b.ref(lightFx),
  });

  // ── SlotLayer ──
  const winBalRoot = b.node('WinBalanceRoot', slotLayer, [0, 95, 0]); b.uiTransform(winBalRoot, 960, 190);
  const balPanel = b.node('BalancePanel', winBalRoot, [-280, 0, 0]); b.uiTransform(balPanel, 258, 91); b.sprite(balPanel, spriteRef('ui/balance.png'), 0);
  const balLabel = b.node('BalanceLabel', balPanel, [10, 0, 0]); b.uiTransform(balLabel, 180, 60); b.label(balLabel, '555000', 36);
  const balLabelComp = b.objs[balLabel]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Label').__id__;
  const winPanel = b.node('WinPanel', winBalRoot, [120, 0, 0]); b.uiTransform(winPanel, 554, 382); b.sprite(winPanel, spriteRef('ui/win.png'), 0);
  const winTitle = b.node('WinTitleLabel', winPanel, [0, 120, 0]); b.uiTransform(winTitle, 300, 60); b.label(winTitle, 'WIN', 48);
  const winValue = b.node('WinValueLabel', winPanel, [0, -40, 0]); b.uiTransform(winValue, 400, 60); b.label(winValue, '10,000,000', 44);
  const winValueLabelComp = b.objs[winValue]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Label').__id__;

  // Slot root with SaveTotoSlotController
  const slotRoot = b.node('Slot', slotLayer, [0, -430, 0]); b.uiTransform(slotRoot, 960, 490);
  const reelRoot = b.node('ReelRoot', slotRoot, [0, 0, 0]); b.uiTransform(reelRoot, 1020, 480);
  const reelFrame = b.node('ReelFrame', reelRoot, [0, 0, 0]); b.uiTransform(reelFrame, 1254, 638); b.sprite(reelFrame, spriteRef('slot/reel.png'), 0);
  const columnsNode = b.node('Columns', reelRoot, [0, 0, 0]); b.uiTransform(columnsNode, 880, 430);
  const columnNodeIds = [];
  for (let i = 0; i < 5; i++) {
    const cx = -352 + i * 176;
    const cn = b.node(`Column_${i + 1}`, columnsNode, [cx, 0, 0]); b.uiTransform(cn, 176, 430);
    b.custom(scriptType('Slot/SaveTotoSlotColumn'), cn, {});
    columnNodeIds.push(cn);
  }
  // BonusRoot with SaveTotoBonusView
  const bonusRoot = b.node('BonusRoot', slotRoot, [0, 50, 0], UI_LAYER, false); b.uiTransform(bonusRoot, 960, 560);
  b.node('BonusDimmer', bonusRoot, [0, 0, 0]); // dimmer (no transform size needed; minimal)
  const instr = b.node('InstructionLabel', bonusRoot, [0, 220, 0]); b.uiTransform(instr, 600, 50); b.label(instr, 'Pick a basket to free Toto', 36);
  const basketGrid = b.node('BasketGrid', bonusRoot, [0, -20, 0]); b.uiTransform(basketGrid, 828, 456);
  const basketNodeIds = [];
  const bw = 260, bh = 210, hg = 48, vg = 36;
  const startX = -(2 * bw + 2 * hg) / 2 + bw / 2;
  const startY = vg / 2 + bh / 2;
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const bx = startX + col * (bw + hg);
    const by = startY - row * (bh + vg);
    const bn = b.node(`Basket_${String(i + 1).padStart(2, '0')}`, basketGrid, [bx, by, 0]); b.uiTransform(bn, 144, 140);
    b.sprite(bn, spriteRef('slot/symbol-basket.png'), 1); b.button(bn, true); b.opacity(bn, 255);
    const glow = b.node('Glow', bn, [0, 0, 0]); b.uiTransform(glow, 200, 200); b.sprite(glow, spriteRef('scene/light.png'), 1); b.opacity(glow, 0);
    const rwdLbl = b.node('RewardLabel', bn, [0, 90, 0]); b.uiTransform(rwdLbl, 200, 50); b.label(rwdLbl, '', 40); b.objs[b.objs.length - 1]; // label inactive set via... label node active default true; code hides in onLoad
    b.custom(scriptType('views/SaveTotoBasketView'), bn, { basketIndex: i, basketButton: null, rewardLabel: null, glow: null });
    // wire basketView internal refs (button/label/glow components on this node/children)
    const btnComp = b.objs[bn]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Button').__id__;
    const lblComp = b.objs[rwdLbl]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Label').__id__;
    const glowComp = b.objs[glow]._components.find(c => b.objs[c.__id__].__type__ === 'cc.UIOpacity').__id__;
    const basketViewComp = b.objs[bn]._components.find(c => b.objs[c.__id__].__type__ === scriptType('views/SaveTotoBasketView')).__id__;
    b.objs[basketViewComp].basketButton = b.ref(btnComp);
    b.objs[basketViewComp].rewardLabel = b.ref(lblComp);
    b.objs[basketViewComp].glow = b.ref(glow);
    basketNodeIds.push(bn);
  }
  // NOTE: basketViews must reference SaveTotoBasketView COMPONENTS, not nodes.
  const basketViewCompIds = [];
  for (const bn of basketNodeIds) {
    const bv = b.objs[bn]._components.find(c => b.objs[c.__id__].__type__ === scriptType('views/SaveTotoBasketView')).__id__;
    basketViewCompIds.push(bv);
  }
  const bonusViewComp = b.custom(scriptType('views/SaveTotoBonusView'), bonusRoot, {
    bonusRoot: b.ref(bonusRoot), basketViews: basketViewCompIds.map(id => b.ref(id)), instructionLabel: b.ref(instr),
  });
  // SaveTotoSlotController on slotRoot
  const slotCtrlComp = b.custom(scriptType('Slot/SaveTotoSlotController'), slotRoot, {
    columns: columnNodeIds.map(id => b.ref(id)), startIntervalSec: 0.1, totalElementsPerColumn: 10,
    defaultVisibleElementsCount: 3, elementSpacing: 142, startY: -142,
  });
  // SaveTotoSlotView — place on slotLayer (logical); refs slotController/balance/win
  const slotViewComp = b.custom(scriptType('views/SaveTotoSlotView'), slotLayer, {
    slotController: b.ref(slotCtrlComp), balanceLabel: b.ref(balLabelComp), winLabel: b.ref(winValueLabelComp),
  });

  // ── HudLayer ──
  const spinBtnNode = b.node('SpinButton', hudLayer, [0, -815, 0]); b.uiTransform(spinBtnNode, 509, 168); b.sprite(spinBtnNode, spriteRef('ui/spin.png'), 1); b.button(spinBtnNode, false);
  const spinLabel = b.node('SpinLabel', spinBtnNode, [0, 0, 0]); b.uiTransform(spinLabel, 200, 60); b.label(spinLabel, 'SPIN', 48);
  b.custom(scriptType('controllers/SaveTotoSpinButtonController'), spinBtnNode, { spinButton: null });
  const spinBtnComp = b.objs[spinBtnNode]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Button').__id__;
  const spinBtnCtrlComp = b.objs[spinBtnNode]._components.find(c => b.objs[c.__id__].__type__ === scriptType('controllers/SaveTotoSpinButtonController')).__id__;
  b.objs[spinBtnCtrlComp].spinButton = b.ref(spinBtnComp);
  const ctaBtnNode = b.node('CtaButton', hudLayer, [0, -815, 0], UI_LAYER, false); b.uiTransform(ctaBtnNode, 509, 168); b.sprite(ctaBtnNode, spriteRef('ui/spin.png'), 1); b.button(ctaBtnNode, false);
  const ctaLabel = b.node('CtaLabel', ctaBtnNode, [0, 0, 0]); b.uiTransform(ctaLabel, 300, 60); b.label(ctaLabel, 'PLAY NOW', 48);
  const ctaBtnComp = b.objs[ctaBtnNode]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Button').__id__;
  const hudViewComp = b.custom(scriptType('views/SaveTotoHudView'), hudLayer, {
    spinButtonNode: b.ref(spinBtnNode), spinButton: b.ref(spinBtnComp), ctaButtonNode: b.ref(ctaBtnNode), ctaButton: b.ref(ctaBtnComp),
  });

  // ── FxLayer ──
  b.node('LockFxRoot', fxLayer, [0, 0, 0], UI_LAYER, false);
  b.node('CoinFxRoot', fxLayer, [0, 0, 0], UI_LAYER, false);
  b.node('FloatingRewardRoot', fxLayer, [0, 0, 0], UI_LAYER, false);

  // ── EndCardLayer ──
  const endOverlay = b.node('EndOverlay', endCardLayer, [0, 0, 0]); b.uiTransform(endOverlay, 1080, 1920); b.comp('cc.Sprite', endOverlay, { _customMaterial:null,_srcBlendFactor:2,_dstBlendFactor:4,_color:{__type__:'cc.Color',r:0,g:0,b:0,a:200},_spriteFrame:null,_type:0,_fillType:0,_sizeMode:0,_fillCenter:{__type__:'cc.Vec2',x:0,y:0},_fillStart:0,_fillRange:0,_isTrimmedMode:true,_useGrayscale:false,_atlas:null,_id:'' });
  const endLogo = b.node('EndLogo', endCardLayer, [0, 500, 0]); b.uiTransform(endLogo, 395, 296); b.sprite(endLogo, spriteRef('logos/logo_woz_slots.png'), 1);
  const endToto = b.node('EndTotoRoot', endCardLayer, [0, 100, 0]); b.uiTransform(endToto, 378, 672); b.sprite(endToto, spriteRef('characters/toto-body.png'), 1);
  const endWin = b.node('EndWinLabel', endCardLayer, [0, -250, 0]); b.uiTransform(endWin, 700, 80); b.label(endWin, '10,000,000', 64);
  const endWinLabelComp = b.objs[endWin]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Label').__id__;
  const playNow = b.node('PlayNowButton', endCardLayer, [0, -700, 0]); b.uiTransform(playNow, 509, 168); b.sprite(playNow, spriteRef('ui/spin.png'), 1); b.button(playNow, false);
  const playNowLabel = b.node('CtaLabel', playNow, [0, 0, 0]); b.uiTransform(playNowLabel, 300, 60); b.label(playNowLabel, 'PLAY NOW', 48);
  const playNowBtnComp = b.objs[playNow]._components.find(c => b.objs[c.__id__].__type__ === 'cc.Button').__id__;
  const endCardViewComp = b.custom(scriptType('views/SaveTotoEndCardView'), endCardLayer, {
    root: b.ref(endCardLayer), endTotoRoot: b.ref(endToto), endWinLabel: b.ref(endWinLabelComp), playNowButton: b.ref(playNowBtnComp),
  });

  // ── System nodes (under scene) ──
  const sys = b.node('System', sceneId, [0, 0, 0], 1073741824); b.uiTransform(sys, 100, 100);
  const bootstrapNode = b.node('SaveTotoBootstrap', sys, [0, 0, 0]); b.uiTransform(bootstrapNode, 100, 100);
  const gameConfigNode = b.node('GameConfig', sys, [0, 0, 0]); b.uiTransform(gameConfigNode, 100, 100);
  const stateMachineNode = b.node('StateMachine', sys, [0, 0, 0]); b.uiTransform(stateMachineNode, 100, 100);
  const elemConfigNode = b.node('ElementConfiguration', sys, [0, 0, 0]); b.uiTransform(elemConfigNode, 100, 100);
  const forcedMgrNode = b.node('ForcedSpawnManager', sys, [0, 0, 0]); b.uiTransform(forcedMgrNode, 100, 100);
  const spinsNode = b.node('SpinsController', sys, [0, 0, 0]); b.uiTransform(spinsNode, 100, 100);
  const rewardNode = b.node('RewardController', sys, [0, 0, 0]); b.uiTransform(rewardNode, 100, 100);
  const ctaScreenNode = b.node('CTAScreen', sys, [0, 0, 0]); b.uiTransform(ctaScreenNode, 100, 100);
  const winAnimCfgNode = b.node('WinAnimationConfiguration', sys, [0, 0, 0]); b.uiTransform(winAnimCfgNode, 100, 100);

  // System components
  const gameConfigComp = b.custom(scriptType('config/SaveTotoGameConfig'), gameConfigNode, {});
  const spinsCtrlComp = b.custom(scriptType('controllers/SaveTotoSpinsController'), spinsNode, { valueLabel: null, initialValue: 1 });
  const rewardCtrlComp = b.custom(scriptType('controllers/SaveTotoRewardController'), rewardNode, { valueLabel: null, initialValue: 0 });
  const elemConfigComp = b.custom(scriptType('Slot/Elements/SaveTotoElementConfiguration'), elemConfigNode, { elementTypes: [], bonusElementTypes: [], columnVisibleConfig: [], randomizeNonVisibleElements: true });
  // ElementConfiguration prefab-wiring: выполняется, когда 5 symbol-prefabs импортированы (есть .meta).
  // Если .meta отсутствуют — остаётся пустым; повторный запуск build-scene.mjs после Cocos refresh заполнит ссылки (OI-505).
  const prefabNames = ['SaveTotoSymbolOz', 'SaveTotoSymbolKey', 'SaveTotoSymbolDrop', 'SaveTotoSymbolBasket', 'SaveTotoSymbolToto'];
  const prefabUuids = prefabNames.map(n => prefabUuidIfExists(n));
  if (prefabUuids.every(Boolean)) {
    // regular elementTypes: Oz(0), Key(1), Drop(2), Basket(3)
    const regular = [[0, prefabUuids[0], 1, 10], [1, prefabUuids[1], 1, 10], [2, prefabUuids[2], 1, 10], [3, prefabUuids[3], 1, 10]];
    const etIds = regular.map(([id, pu, w, val]) => b.add({ __type__: 'SaveTotoElementType', id, prefab: prefabRef(pu), weight: w, value: val }));
    b.objs[elemConfigComp].elementTypes = etIds.map(id => b.ref(id));
    // bonusElementTypes: Toto(4) — scatter
    const betId = b.add({ __type__: 'SaveTotoBonusElementType', id: 4, prefab: prefabRef(prefabUuids[4]), weight: 1, value: 0, isScatter: true, isWild: false, maxCountPerColumn: 1, maxColumnsCount: 3 });
    b.objs[elemConfigComp].bonusElementTypes = [b.ref(betId)];
    console.log('ElementConfiguration: symbol prefabs wired (5).');
  } else {
    console.log('ElementConfiguration: prefab .meta not found — wiring deferred (run again after Cocos refresh). See OI-505.');
  }
  const forcedMgrComp = b.custom(scriptType('Slot/managers/SaveTotoForcedSpawnManager'), forcedMgrNode, { rulesInspector: [], preventRandomWins: true });
  const ctaScreenComp = b.custom(scriptType('Slot/SaveTotoCTAScreen'), ctaScreenNode, { rewardAmount: null, ctaNode: b.ref(endCardLayer) });
  const winAnimCfgComp = b.custom(scriptType('Slot/Animations/SaveTotoWinAnimationConfiguration'), winAnimCfgNode, {});
  const stateMachineComp = b.custom(scriptType('controllers/SaveTotoStateMachine'), stateMachineNode, {
    gameConfig: b.ref(gameConfigComp), slotController: b.ref(slotCtrlComp), slotView: b.ref(slotViewComp),
    threatView: b.ref(threatViewComp), bonusView: b.ref(bonusViewComp), hudView: b.ref(hudViewComp),
    endCardView: b.ref(endCardViewComp), spinsController: b.ref(spinsCtrlComp),
    spinButtonController: b.ref(spinBtnCtrlComp), rewardController: b.ref(rewardCtrlComp),
    ctaButton: b.ref(playNowBtnComp),
  });
  const bootstrapComp = b.custom(scriptType('controllers/SaveTotoBootstrap'), bootstrapNode, {
    stateMachine: b.ref(stateMachineComp), gameConfig: b.ref(gameConfigComp), slotController: b.ref(slotCtrlComp),
    spinsController: b.ref(spinsCtrlComp), spinButtonController: b.ref(spinBtnCtrlComp),
    rewardController: b.ref(rewardCtrlComp), elementConfiguration: b.ref(elemConfigComp),
    winAnimationConfiguration: b.ref(winAnimCfgComp), columnMovementEffect: null,
    forcedManagerNode: b.ref(forcedMgrNode), ctaScreen: b.ref(ctaScreenComp), vfxSpawner: null,
  });

  // ── SceneGlobals (preserved from backup, with __id__ remapping) ──
  // Globals block — contiguous slice; internal __id__ refs must be offset to new indices.
  const bak = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/scene.scene.bak'), 'utf8'));
  const globalsStart = bak.findIndex(o => o.__type__ === 'cc.SceneGlobals');
  if (globalsStart >= 0) {
    // Determine the extent of the globals block: SceneGlobals + all objects it references
    // (they are contiguous in Cocos-exported scenes: SceneGlobals, AmbientInfo, ShadowsInfo,
    // SkyboxInfo, FogInfo, OctreeInfo, SkinInfo, LightProbeInfo, PostSettingsInfo).
    const GLOBALS_KEYS = ['ambient', 'shadows', '_skybox', 'fog', 'octree', 'skin', 'lightProbeInfo', 'postSettings'];
    const referencedIds = GLOBALS_KEYS.map(k => bak[globalsStart][k].__id__);
    const globalsEnd = Math.max(...referencedIds) + 1; // exclusive
    const globalsBlock = bak.slice(globalsStart, globalsEnd);
    const offset = b.objs.length - globalsStart;
    // Fix Scene._globals to point at the new SceneGlobals index.
    b.objs[sceneId]._globals = { __id__: b.objs.length };
    // Remap internal __id__ references inside each globals object.
    for (const obj of globalsBlock) {
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object' && '__id__' in v) {
          v.__id__ += offset;
        }
      }
    }
    for (const g of globalsBlock) b.objs.push(g);
  }

  return b.objs;
}

// ── Run ──
const sceneObjs = buildScene();
fs.writeFileSync(path.join(ROOT, 'assets/scene.scene'), JSON.stringify(sceneObjs, null, 2));
console.log('scene written:', sceneObjs.length, 'objects');

// Symbol prefabs
const symbols = [
  ['SaveTotoSymbolOz', 'slot/symbol-oz.png', 0],
  ['SaveTotoSymbolKey', 'slot/symbol-key.png', 1],
  ['SaveTotoSymbolDrop', 'slot/symbol-drop.png', 2],
  ['SaveTotoSymbolBasket', 'slot/symbol-basket.png', 3],
  ['SaveTotoSymbolToto', 'slot/symbol-toto.png', 4],
];
for (const [name, art, id] of symbols) {
  const sf = spriteRef(art);
  const out = path.join(ROOT, `assets/prefabs/save-toto/slot/${name}.prefab`);
  buildSymbolPrefab(name, out, `${sf.__uuid__}`, id);
  console.log('prefab written:', name);
}
console.log('done');
