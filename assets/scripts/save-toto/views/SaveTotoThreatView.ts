/**
 * Save Toto — view threat-слоя (implements SaveTotoThreatView).
 *
 * Packshot transition по возможности делегируется компоненту
 * SaveTotoPackshotIntroAnimation на CageRoot; при его отсутствии используется tween fallback.
 */

import { _decorator, Component, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoThreatView as ISaveTotoThreatView } from '../interfaces/SaveTotoViews';
import { SaveTotoFireLevel } from '../types';
import { SaveTotoLockView } from './SaveTotoLockView';
import { SaveTotoPackshotIntroAnimation } from '../animations/SaveTotoPackshotIntroAnimation';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoThreatView')
export class SaveTotoThreatView extends Component implements ISaveTotoThreatView {
    @property(Node)
    public fireNode: Node = null!;

    @property([SaveTotoLockView])
    public lockViews: SaveTotoLockView[] = [];

    @property(Node)
    public cageRoot: Node = null!;

    @property(Node)
    public totoRoot: Node = null!;

    @property(Node)
    public lightFxNode: Node = null!;

    private currentFireLevel: SaveTotoFireLevel = 3;

    onLoad(): void {
        if (this.lightFxNode) this.lightFxNode.active = false;
        this.setFireLevel(3);
    }

    public setFireLevel(level: SaveTotoFireLevel): void {
        this.currentFireLevel = level;
        if (!this.fireNode) return;

        const t = level / 3;
        const scale = 0.4 + t * 0.6;
        const opacityVal = level === 0 ? 0 : 80 + t * 175;

        const op = this.fireNode.getComponent(UIOpacity) || this.fireNode.addComponent(UIOpacity);
        tween(this.fireNode)
            .to(0.35, { scale: new Vec3(scale, scale, scale) }, { easing: 'sineInOut' })
            .start();
        tween(op)
            .to(0.35, { opacity: opacityVal }, { easing: 'sineInOut' })
            .start();
    }

    public getFireLevel(): SaveTotoFireLevel {
        return this.currentFireLevel;
    }

    public async removeLock(index: number): Promise<void> {
        const view = this.lockViews[index];
        if (!view) return;
        await view.playOpenAndRemove();
    }

    public async playPackshotTransition(): Promise<void> {
        const packshotAnimation = this.cageRoot?.getComponent(SaveTotoPackshotIntroAnimation);
        if (packshotAnimation) {
            await packshotAnimation.play();
            return;
        }

        return new Promise<void>((resolve) => {
            if (this.lightFxNode) {
                this.lightFxNode.active = true;
                const op = this.lightFxNode.getComponent(UIOpacity) || this.lightFxNode.addComponent(UIOpacity);
                op.opacity = 0;
                tween(op).to(0.4, { opacity: 255 }).start();
            }
            if (this.cageRoot) {
                const op = this.cageRoot.getComponent(UIOpacity) || this.cageRoot.addComponent(UIOpacity);
                tween(this.cageRoot)
                    .to(0.2, { scale: new Vec3(1.05, 1.05, 1.05) })
                    .call(() => {
                        tween(op).to(0.4, { opacity: 110 }).start();
                    })
                    .to(0.4, { scale: new Vec3(0.92, 0.92, 0.92) })
                    .call(() => resolve())
                    .start();
            } else {
                resolve();
            }
        });
    }

    public async playTotoFreed(): Promise<void> {
        if (!this.totoRoot) return;
        return new Promise<void>((resolve) => {
            tween(this.totoRoot)
                .to(0.25, { scale: new Vec3(1.2, 1.2, 1.2) }, { easing: 'backOut' })
                .to(0.25, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }
}
