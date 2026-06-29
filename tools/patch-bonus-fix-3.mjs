/**
 * Save Toto — patch 3: key uuid refresh, LockRight mirror, EndCard overlay + claim button.
 *
 * 1. LockView ×3: keySpriteFrame -> текущий symbol-key uuid (после переименования).
 * 2. LockRight: mirror=true (open-lock отражён по X).
 * 3. EndOverlay sprite -> endcard-bg.webp (Secondary_BG_Color).
 * 4. PlayNowButton sprite -> claim.webp; удалить дочерний CtaLabel (claim имеет зашитый текст).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SCENE = path.join(ROOT, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(SCENE, 'utf8'));

function sfUuid(relNoExt, ext) {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, relNoExt + '.' + ext + '.meta'), 'utf8'));
    return meta.uuid + '@f9941';
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

const KEY_SF_UUID = sfUuid('assets/art/slot/symbol-key', 'png');
const BG_SF = sfUuid('assets/art/backgrounds/endcard-bg', 'webp');
const CLAIM_SF = sfUuid('assets/art/ui/claim', 'webp');

let changes = [];

// === 1. LockView keySpriteFrame refresh (uuid изменился после переименования) ===
['LockLeft', 'LockCenter', 'LockRight'].forEach(name => {
    const lock = findNode(name);
    if (lock < 0) return;
    const node = scene[lock];
    for (const c of node._components) {
        const comp = scene[c.__id__];
        if (comp && comp.lockId !== undefined && comp.keySpriteFrame !== undefined) {
            comp.keySpriteFrame = { __uuid__: KEY_SF_UUID, __expectedType__: 'cc.SpriteFrame' };
            changes.push(`keySpriteFrame refresh -> ${name}`);
        }
    }
});

// === 2. LockRight mirror ===
{
    const lr = findNode('LockRight');
    if (lr >= 0) {
        for (const c of scene[lr]._components) {
            const comp = scene[c.__id__];
            if (comp && comp.lockId !== undefined && comp.keySpriteFrame !== undefined) {
                comp.mirror = true;
                changes.push('LockRight mirror=true');
            }
        }
    }
}

// === 3. EndOverlay sprite -> endcard-bg ===
{
    const eo = findNode('EndOverlay');
    if (eo >= 0) {
        const spIdx = findCompIdx(eo, 'cc.Sprite');
        if (spIdx >= 0) {
            scene[spIdx]._spriteFrame = { __uuid__: BG_SF, __expectedType__: 'cc.SpriteFrame' };
            changes.push('EndOverlay sprite -> endcard-bg');
        }
    }
}

// === 4. PlayNowButton sprite -> claim; удалить CtaLabel ===
{
    const pnb = findNode('PlayNowButton');
    if (pnb >= 0) {
        const spIdx = findCompIdx(pnb, 'cc.Sprite');
        if (spIdx >= 0) {
            scene[spIdx]._spriteFrame = { __uuid__: CLAIM_SF, __expectedType__: 'cc.SpriteFrame' };
            changes.push('PlayNowButton sprite -> claim');
        }
        // Удалить дочерний CtaLabel
        const before = scene[pnb]._children.length;
        scene[pnb]._children = scene[pnb]._children.filter(c => {
            const child = scene[c.__id__];
            return !(child && child._name === 'CtaLabel');
        });
        if (scene[pnb]._children.length < before) {
            changes.push('PlayNowButton CtaLabel removed (claim has baked text)');
        }
    }
}

fs.writeFileSync(SCENE, JSON.stringify(scene, null, 2));
changes.forEach(c => console.log('  ' + c));
console.log('Done. ' + changes.length + ' changes.');
