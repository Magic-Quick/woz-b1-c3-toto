/**
 * Save Toto — view одного замка (для SaveTotoLock.prefab).
 *
 * MVP: без key flight (OI-105). Анимация снятия замка — scale-up + fade-out + drop.
 * Tween-реализация; должна мигрировать на .anim clip `lock_open_remove_*.anim`
 * (ANIMATION_STRATEGY.md §5) через Animation component без изменения контракта.
 */

import { _decorator, Component, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoLockId } from '../types';
import { SaveTotoLockViewLike } from '../controllers/SaveTotoLockUnlockController';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoLockView')
export class SaveTotoLockView extends Component implements SaveTotoLockViewLike {
    @property
    public lockId: SaveTotoLockId = 'left';

    public async playOpenAndRemove(): Promise<void> {
        const node = this.node;
        if (!node || !node.isValid) return;

        const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);

        return new Promise<void>((resolve) => {
            tween(node)
                .to(0.12, { scale: new Vec3(1.25, 1.25, 1.25) })
                .call(() => {
                    tween(opacity)
                        .to(0.25, { opacity: 0 })
                        .start();
                })
                .to(0.25, { position: new Vec3(node.position.x, node.position.y - 120, node.position.z) })
                .call(() => {
                    node.active = false;
                    resolve();
                })
                .start();
        });
    }
}
