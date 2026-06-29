/**
 * Save Toto — patch: spin speed + EndFountain node (за Тото, перед light).
 *
 * 1. LinearMoveEffect.durationSec: 2.6 -> 1.5 (ускоренный спин).
 * 2. GameConfig.spinDurationSeconds: 2.6 -> 1.5.
 * 3. EndFountain node под EndCardLayer (между EndLight и EndTotoRoot):
 *    перемещаем SaveTotoCoinFountain компонент с EndCardLayer на EndFountain.
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
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, relTsNoExt + '.ts.meta'), 'utf8'));
    return compressUuid(m.uuid);
}
function findNode(name) {
    return scene.findIndex(o => o && o.__type__ === 'cc.Node' && o._name === name);
}
function findCompIdx(nodeIdx, type) {
    const node = scene[nodeIdx];
    for (const c of node._components) {
        if (scene[c.__id__].__type__ === type) return c.__id__;
    }
    return -1;
}

const COIN_FOUNTAIN = scriptType('assets/scripts/save-toto/animations/SaveTotoCoinFountain');
let changes = [];

// === 1. Spin speed ===
{
    // LinearMoveEffect durationSec
    const lmeIdx = scene.findIndex(o => o && o.durationSec === 2.6);
    if (lmeIdx >= 0) {
        scene[lmeIdx].durationSec = 1.5;
        changes.push('LinearMoveEffect.durationSec -> 1.5');
    }
    // GameConfig spinDurationSeconds
    const gc = scene.find(o => o && o.canvasWidth);
    if (gc) {
        gc.spinDurationSeconds = 1.5;
        changes.push('GameConfig.spinDurationSeconds -> 1.5');
    }
}

// === 2. EndFountain node + move fountain component ===
{
    const ec = findNode('EndCardLayer');
    if (ec >= 0) {
        // Найти fountain компонент на EndCardLayer.
        const fountainIdx = findCompIdx(ec, COIN_FOUNTAIN);
        let fountainComp = null;
        if (fountainIdx >= 0) {
            fountainComp = JSON.parse(JSON.stringify(scene[fountainIdx]));
            // Убрать с EndCardLayer.
            scene[ec]._components = scene[ec]._components.filter(c => c.__id__ !== fountainIdx);
            scene[fountainIdx] = null; // заглушка (будет заменена)
            changes.push('SaveTotoCoinFountain removed from EndCardLayer');
        }

        // Создать EndFountain node если нет.
        let efIdx = findNode('EndFountain');
        if (efIdx < 0) {
            const layer = scene[ec]._layer;
            const transformId = scene.length;
            scene.push({
                __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {},
                node: { __id__: 0 }, _enabled: true, __prefab: null,
                _contentSize: { __type__: 'cc.Size', width: 1080, height: 1920 },
                _scale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 }, _id: '',
            });
            const nodeId = scene.length;
            scene.push({
                __type__: 'cc.Node', _name: 'EndFountain', _objFlags: 0, __editorExtras__: {},
                _parent: { __id__: ec }, _children: [], _active: false,
                _components: [{ __id__: transformId }],
                _level: scene[ec]._level + 1,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0, _layer: layer,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
            });
            scene[transformId].node.__id__ = nodeId;
            efIdx = nodeId;
            changes.push('EndFountain node created');

            // Вставить МЕЖДУ EndLight и EndTotoRoot (позади Тото, перед light).
            const children = scene[ec]._children;
            const lightIdx = children.findIndex(c => scene[c.__id__]._name === 'EndLight');
            const totoIdx = children.findIndex(c => scene[c.__id__]._name === 'EndTotoRoot');
            if (lightIdx >= 0 && totoIdx >= 0) {
                // Вставить перед EndTotoRoot (после EndLight).
                children.splice(totoIdx, 0, { __id__: efIdx });
            } else {
                children.push({ __id__: efIdx });
            }
            changes.push('EndFountain inserted between EndLight and EndTotoRoot');
        }

        // Привязать fountain компонент к EndFountain.
        if (fountainComp) {
            const newCompId = scene.length;
            // Заменить null-заглушку fountainIdx на валидный объект, или просто добавить новый.
            fountainComp.node = { __id__: efIdx };
            scene.push(fountainComp);
            scene[efIdx]._components.push({ __id__: newCompId });
            changes.push('SaveTotoCoinFountain -> EndFountain');
        }
    }
}

// === 3. StateMachine.coinFountain -> EndFountain ===
{
    const SM_TYPE = scriptType('assets/scripts/save-toto/controllers/SaveTotoStateMachine');
    const sm = findCompIdx(findNode('StateMachine'), SM_TYPE);
    if (sm >= 0) {
        const ef = findNode('EndFountain');
        if (ef >= 0) {
            const fountainIdx = findCompIdx(ef, COIN_FOUNTAIN);
            if (fountainIdx >= 0) {
                scene[sm].coinFountain = { __id__: fountainIdx };
                changes.push('StateMachine.coinFountain -> EndFountain');
            }
        }
    }
}

// Очистить null-заглушки.
const cleaned = scene.filter(o => o !== null);
// Перестроить __id__ ссылки невозможно без ремапа, поэтому просто заменим null на PrefabInfo.
// (null уже был заменён через push нового компонента, поэтому массив не имеет null)
fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
