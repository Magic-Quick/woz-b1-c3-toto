/**
 * Save Toto — view threat-слоя (implements SaveTotoThreatView).
 *
 * Огонь: делегирует SaveTotoFireAnimation (idle pulse + level-driven height/opacity).
 * Packshot transition: клетка полностью исчезает (opacity 0), Тото остаётся непрозрачным
 * и переходит в happy-анимацию. Packshot overlay добавляется отдельно (EndCardLayer).
 */
import { _decorator, Component, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoThreatView as ISaveTotoThreatView } from '../interfaces/SaveTotoViews';
import { SaveTotoFireLevel } from '../types';
import { SaveTotoLockView } from './SaveTotoLockView';
import { SaveTotoPackshotIntroAnimation } from '../animations/SaveTotoPackshotIntroAnimation';
import { SaveTotoFireAnimation } from '../animations/SaveTotoFireAnimation';
import { SaveTotoAutoFloat } from '../animations/SaveTotoAutoFloat';

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

    /** Полный Тото (toto-full) — показывается после исчезновения клетки вместо assembled body+head+tongue. */
    @property(Node)
    public totoFullNode: Node | null = null;

    private currentFireLevel: SaveTotoFireLevel = 3;
    private fireAnim: SaveTotoFireAnimation | null = null;

    onLoad(): void {
        if (this.lightFxNode) this.lightFxNode.active = false;
        this.fireAnim = this.fireNode?.getComponent(SaveTotoFireAnimation) || null;
        if (this.fireAnim) {
            this.fireAnim.setLevel(3);
        } else {
            this.setFireLevelFallback(3);
        }
    }

    public setFireLevel(level: SaveTotoFireLevel): void {
        this.currentFireLevel = level;
        if (this.fireAnim) {
            this.fireAnim.setLevel(level);
            return;
        }
        this.setFireLevelFallback(level);
    }

    /** Legacy fallback если SaveTotoFireAnimation не привязан. */
    private setFireLevelFallback(level: SaveTotoFireLevel): void {
        if (!this.fireNode) return;
        const t = level / 3;
        const scaleX = 1.0;
        const scaleY = 0.4 + t * 0.6;
        const opacityVal = level === 0 ? 0 : 90 + t * 165;
        const op = this.fireNode.getComponent(UIOpacity) || this.fireNode.addComponent(UIOpacity);
        tween(this.fireNode)
            .to(0.4, { scale: new Vec3(scaleX, scaleY, 1) }, { easing: 'sineInOut' })
            .start();
        tween(op)
            .to(0.4, { opacity: opacityVal }, { easing: 'sineInOut' })
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
        // Огонь гаснет.
        this.setFireLevel(0);

        // Packshot-intro bump на cage (если есть компонент).
        const packshotAnimation = this.cageRoot?.getComponent(SaveTotoPackshotIntroAnimation);
        if (packshotAnimation) {
            await packshotAnimation.play();
        }

        // Клетка (CageBase) полностью исчезает; Тото (TotoRoot) остаётся непрозрачным.
        // ВАЖНО: fade только CageBase, НЕ cageRoot — TotoRoot его потомок.
        const cageBase = this.cageRoot?.getChildByName('CageSwingRoot')?.getChildByName('CageBase') ?? null;
        const cageSwing = this.cageRoot?.getChildByName('CageSwingRoot') ?? null;
        const fadeTarget = cageBase || cageSwing;
        if (fadeTarget) {
            const cageOp = fadeTarget.getComponent(UIOpacity) || fadeTarget.addComponent(UIOpacity);
            await new Promise<void>((resolve) => {
                tween(cageOp)
                    .to(0.5, { opacity: 0 }, { easing: 'sineIn' })
                    .call(() => {
                        fadeTarget.active = false;
                        resolve();
                    })
                    .start();
            });
        }

        // Swap: скрыть assembled TotoRoot (body+head+tongue с вырезами под клетку),
        // показать toto-full (целый Тото без вырезов).
        if (this.totoFullNode && this.totoRoot) {
            this.totoRoot.active = false;
            this.totoFullNode.active = true;
            const op = this.totoFullNode.getComponent(UIOpacity) || this.totoFullNode.addComponent(UIOpacity);
            op.opacity = 0;
            await new Promise<void>((resolve) => {
                tween(op)
                    .to(0.3, { opacity: 255 }, { easing: 'sineOut' })
                    .call(() => resolve())
                    .start();
            });
        }

        // LightFx вспышка для вау-эффекта перехода.
        if (this.lightFxNode) {
            this.lightFxNode.active = true;
            const lop = this.lightFxNode.getComponent(UIOpacity) || this.lightFxNode.addComponent(UIOpacity);
            lop.opacity = 0;
            await new Promise<void>((resolve) => {
                tween(lop)
                    .to(0.25, { opacity: 220 })
                    .to(0.35, { opacity: 0 })
                    .call(() => { this.lightFxNode.active = false; resolve(); })
                    .start();
            });
        }
    }

    public async playTotoFreed(): Promise<void> {
        // Happy bounce на toto-full (если swap произошёл) или на assembled TotoRoot.
        const target = (this.totoFullNode && this.totoFullNode.active) ? this.totoFullNode : this.totoRoot;
        if (!target) return;
        const base = target.scale.clone();
        tween(target)
            .to(0.25, { scale: new Vec3(base.x * 1.1, base.y * 1.1, 1) }, { easing: 'sineOut' })
            .to(0.2, { scale: new Vec3(base.x * 0.96, base.y * 0.96, 1) }, { easing: 'sineIn' })
            .to(0.22, { scale: new Vec3(base.x * 1.05, base.y * 1.05, 1) }, { easing: 'sineOut' })
            .to(0.2, { scale: base }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
    }
}
