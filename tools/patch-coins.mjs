/**
 * Save Toto — patch: coin animation container + fountain container + wiring.
 *
 * 1. CoinFxRoot: attach SaveTotoCoinAnimation (coinSpriteFrame=money-dollar-coin, targetNode=BalanceLabel).
 * 2. EndCardLayer: attach SaveTotoCoinFountain (coinSpriteFrame=money-dollar-coin).
 * 3. StateMachine: coinAnimation -> CoinFxRoot, coinFountain -> EndCardLayer.
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
function sfUuid(relNoExt, ext) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, relNoExt + '.' + ext + '.meta'), 'utf8'));
    return m.uuid + '@f9941';
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
function hasComponent(nodeId, compType) {
    return findCompIdx(nodeId, compType) >= 0;
}
function addCustomComponent(nodeId, compType, props) {
    const compId = scene.length;
    scene.push({
        __type__: compType, _name: '', _objFlags: 0, __editorExtras__: {},
        node: { __id__: nodeId }, _enabled: true, __prefab: null,
        ...props, _id: '',
    });
    scene[nodeId]._components.push({ __id__: compId });
    return compId;
}

const COIN_ANIM = scriptType('assets/scripts/save-toto/animations/SaveTotoCoinAnimation');
const COIN_FOUNTAIN = scriptType('assets/scripts/save-toto/animations/SaveTotoCoinFountain');
const COIN_SF = sfUuid('assets/art/fx/money/money-dollar-coin', 'webp');
const SM_TYPE = scriptType('assets/scripts/save-toto/controllers/SaveTotoStateMachine');

let changes = [];

// === 1. CoinFxRoot: SaveTotoCoinAnimation ===
{
    const cfx = findNode('CoinFxRoot');
    const bal = findNode('BalanceLabel');
    if (cfx >= 0 && bal >= 0) {
        if (!hasComponent(cfx, COIN_ANIM)) {
            addCustomComponent(cfx, COIN_ANIM, {
                coinSpriteFrame: { __uuid__: COIN_SF, __expectedType__: 'cc.SpriteFrame' },
                targetNode: { __id__: bal },
                coinCount: 10, coinSize: 50, flightDuration: 0.6,
                sourceSpreadX: 200, sourceSpreadY: 100,
            });
            changes.push('SaveTotoCoinAnimation -> CoinFxRoot (target=BalanceLabel)');
        }
        // Активировать CoinFxRoot (иначе монеты не рендерятся).
        scene[cfx]._active = true;
        changes.push('CoinFxRoot active=true');
    }
}

// === 2. EndCardLayer: SaveTotoCoinFountain ===
{
    const ec = findNode('EndCardLayer');
    if (ec >= 0) {
        if (!hasComponent(ec, COIN_FOUNTAIN)) {
            addCustomComponent(ec, COIN_FOUNTAIN, {
                coinSpriteFrame: { __uuid__: COIN_SF, __expectedType__: 'cc.SpriteFrame' },
                coinSize: 60, spawnInterval: 0.08, coinsPerBurst: 3,
                velocityY: 600, velocityXSpread: 800, gravity: 1200, lifetime: 2.5,
            });
            changes.push('SaveTotoCoinFountain -> EndCardLayer');
        }
    }
}

// === 3. StateMachine: coinAnimation + coinFountain wiring ===
{
    const sm = findCompIdx(findNode('StateMachine'), SM_TYPE);
    if (sm >= 0) {
        const cfx = findNode('CoinFxRoot');
        const ec = findNode('EndCardLayer');
        if (cfx >= 0) scene[sm].coinAnimation = { __id__: findCompIdx(cfx, COIN_ANIM) };
        if (ec >= 0) scene[sm].coinFountain = { __id__: findCompIdx(ec, COIN_FOUNTAIN) };
        changes.push('StateMachine.coinAnimation + coinFountain wired');
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
