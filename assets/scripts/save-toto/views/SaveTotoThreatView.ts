/**
 * Save Toto — view threat-слоя.
 *
 * Огонь: делегирует SaveTotoFireAnimation.
 * Финальный payoff идёт staged-последовательностью:
 * 1) три открытых замка остаются видимыми,
 * 2) cage base меняется на cage-open,
 * 3) cage/locks исчезают, остаётся Toto full-body,
 * 4) threat-композиция уходит перед EndCard.
 */
import { _decorator, Component, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { SaveTotoThreatView as ISaveTotoThreatView } from '../interfaces/SaveTotoViews';
import { SaveTotoFireLevel } from '../types';
import { SaveTotoLockView } from './SaveTotoLockView';
import { SaveTotoFireAnimation } from '../animations/SaveTotoFireAnimation';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoThreatView')
export class SaveTotoThreatView extends Component implements ISaveTotoThreatView {
    private logger = createSaveTotoLogger('SaveTotoThreatView');
    private originalSiblingIndex: number | null = null;
    private originalCageParent: Node | null = null;
    private readonly baseNodeScales = new Map<Node, Vec3>();

    @property(Node)
    public fireNode: Node = null!;

    @property([SaveTotoLockView])
    public lockViews: SaveTotoLockView[] = [];

    @property(Node)
    public cageRoot: Node = null!;

    @property(Node)
    public cageSwingRoot: Node | null = null;

    @property(Node)
    public cageBaseNode: Node | null = null;

    @property(Node)
    public cageOpenNode: Node | null = null;

    @property(Node)
    public totoRoot: Node = null!;

    @property(Node)
    public totoFreedNode: Node | null = null;

    @property(Node)
    public locksRootNode: Node | null = null;

    @property(Node)
    public lightFxNode: Node | null = null;

    @property([Node])
    public fireFadeNodes: Node[] = [];

    private currentFireLevel: SaveTotoFireLevel = 4;
    private fireAnim: SaveTotoFireAnimation | null = null;

    onLoad(): void {
        this.fireAnim = this.fireNode?.getComponent(SaveTotoFireAnimation) || null;
        this.rememberBaseScale(this.cageRoot);
        this.rememberBaseScale(this.cageSwingRoot);
        this.rememberBaseScale(this.cageBaseNode);
        this.rememberBaseScale(this.cageOpenNode);
        this.rememberBaseScale(this.totoRoot);
        this.rememberBaseScale(this.totoFreedNode);
        this.rememberBaseScale(this.locksRootNode);
        this.rememberBaseScale(this.lightFxNode);

        this.initializePackshotNodes();

        if (this.fireAnim) {
            this.fireAnim.setLevel(this.currentFireLevel);
        } else {
            this.logger.warn('Diagnostic: SaveTotoFireAnimation is missing on fireNode. Fire level changes will not animate.');
        }
    }

    public setFireLevel(level: SaveTotoFireLevel): void {
        this.currentFireLevel = level;
        if (this.fireAnim) {
            this.fireAnim.setLevel(level);
        } else {
            this.logger.warn(`Diagnostic: setFireLevel(${level}) ignored because SaveTotoFireAnimation is not bound.`);
        }
    }

    public getFireLevel(): SaveTotoFireLevel {
        return this.currentFireLevel;
    }

    private delaySeconds(seconds: number): Promise<void> {
        if (!this.node?.isValid || seconds <= 0) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            tween(this.node)
                .delay(seconds)
                .call(finish)
                .start();
        });
    }

    public setTutorialFxPaused(paused: boolean): void {
        if (!this.fireAnim) return;
        if (paused) {
            this.fireAnim.pauseAnimation();
        } else {
            this.fireAnim.resumeAnimation();
        }
    }

    public beginTutorialPresentation(overlayNode: Node): void {
        const overlayParent = overlayNode?.parent;
        if (!overlayNode || !overlayParent || !this.cageRoot?.isValid) {
            this.logger.warn('Diagnostic: unable to raise CageRoot for tutorial presentation.');
            return;
        }

        if (this.originalSiblingIndex === null) {
            this.originalSiblingIndex = this.cageRoot.getSiblingIndex();
            this.originalCageParent = this.cageRoot.parent;
        }

        const cageWorldPosition = this.cageRoot.worldPosition.clone();
        overlayParent.addChild(this.cageRoot);
        this.cageRoot.setWorldPosition(cageWorldPosition);

        const targetIndex = Math.min(overlayParent.children.length - 1, overlayNode.getSiblingIndex() + 1);
        this.cageRoot.setSiblingIndex(targetIndex);
        this.logger.info(`beginTutorialPresentation siblingIndex=${targetIndex}`);
    }

    public endTutorialPresentation(): void {
        if (this.originalSiblingIndex === null || !this.cageRoot?.isValid || !this.originalCageParent?.isValid) {
            return;
        }

        const cageWorldPosition = this.cageRoot.worldPosition.clone();
        this.originalCageParent.addChild(this.cageRoot);
        this.cageRoot.setWorldPosition(cageWorldPosition);
        this.cageRoot.setSiblingIndex(this.originalSiblingIndex);
        this.logger.info(`endTutorialPresentation siblingIndex=${this.originalSiblingIndex}`);
        this.originalSiblingIndex = null;
        this.originalCageParent = null;
    }

    public async playLockTutorialHint(): Promise<void> {
        const locks = this.lockViews.filter((view) => !!view && view.node?.isValid);
        if (locks.length === 0) {
            this.logger.warn('Diagnostic: no lockViews available for tutorial hint.');
            return;
        }

        this.logger.info('playLockTutorialHint start');

        for (const lockView of locks) {
            await lockView.playTutorialHighlight();
            await this.delaySeconds(0.5);
        }

        await Promise.all(locks.map((lockView) => lockView.playTutorialHighlight()));
        this.logger.info('playLockTutorialHint done');
    }

    public async removeLock(index: number): Promise<void> {
        const view = this.lockViews[index];
        if (!view) return;
        await view.playOpenAndRemove();
    }

    public async playPackshotTransition(): Promise<void> {
        this.logger.info('playPackshotTransition start');
        this.setFireLevel(0);

        const fireTargets = this.fireFadeNodes.length > 0 ? this.fireFadeNodes : [this.fireNode];
        await Promise.all([
            this.fadeTargets(fireTargets, 0, 0.32, true),
            this.delaySeconds(0.18),
        ]);

        try {
            await this.transitionToOpenCage();
        } catch (e) {
            this.logger.warn(`transitionToOpenCage error: ${e}`);
        }
        await this.delaySeconds(0.18);
        try {
            await this.transitionToFreedToto();
        } catch (e) {
            this.logger.warn(`transitionToFreedToto error: ${e}`);
        }
        await this.delaySeconds(0.24);
        try {
            await this.fadeThreatCompositionOut();
        } catch (e) {
            this.logger.warn(`fadeThreatCompositionOut error: ${e}`);
        }

        this.logger.info('playPackshotTransition done');
    }

    public async playTotoFreed(): Promise<void> {
        await this.transitionToFreedToto();
    }

    private rememberBaseScale(node: Node | null): void {
        if (!node || !node.isValid || this.baseNodeScales.has(node)) return;
        this.baseNodeScales.set(node, node.scale.clone());
    }

    private scaled(node: Node | null, factor: number = 1): Vec3 {
        if (!node) {
            return new Vec3(factor, factor, 1);
        }
        const base = this.baseNodeScales.get(node) || node.scale.clone();
        return new Vec3(base.x * factor, base.y * factor, base.z);
    }

    private ensureOpacity(node: Node | null): UIOpacity | null {
        if (!node || !node.isValid) return null;
        const existing = node.getComponent(UIOpacity);
        if (existing) return existing;
        // Не добавляем UIOpacity на неактивные ноды — onEnable не вызовется,
        // компонент останется незарегистрированным в render system.
        // UIOpacity будет создан при активации ноды в transition-методах.
        if (!node.active) return null;
        return node.addComponent(UIOpacity);
    }

    private initializePackshotNodes(): void {
        this.resetVisualNode(this.cageRoot, true, 255, 1);
        this.resetVisualNode(this.cageSwingRoot, true, 255, 1);
        this.resetVisualNode(this.cageBaseNode, true, 255, 1);
        this.resetVisualNode(this.totoRoot, true, 255, 1);
        this.resetVisualNode(this.locksRootNode, true, 255, 1);
        this.resetVisualNode(this.cageOpenNode, false, 0, 0.96);
        this.resetVisualNode(this.totoFreedNode, false, 0, 0.94);
        this.resetVisualNode(this.lightFxNode, false, 0, 1);
    }

    private resetVisualNode(node: Node | null, active: boolean, opacity: number, scaleFactor: number): void {
        if (!node || !node.isValid) return;
        node.active = active;
        node.setScale(this.scaled(node, scaleFactor));
        const nodeOpacity = this.ensureOpacity(node);
        if (nodeOpacity) {
            nodeOpacity.opacity = opacity;
        }
    }

    private async transitionToOpenCage(): Promise<void> {
        if (!this.cageBaseNode || !this.cageOpenNode) {
            this.logger.warn('Diagnostic: cageBaseNode/cageOpenNode missing. Skipping open-cage stage.');
            return;
        }

        this.cageOpenNode.active = true;
        this.cageOpenNode.setScale(this.scaled(this.cageOpenNode, 0.96));
        const cageBaseOpacity = this.ensureOpacity(this.cageBaseNode);
        const cageOpenOpacity = this.ensureOpacity(this.cageOpenNode);
        if (!cageBaseOpacity || !cageOpenOpacity) {
            return;
        }
        cageOpenOpacity.opacity = 0;

        await Promise.all([
            this.tweenOpacity(cageBaseOpacity, 0, 0.28),
            this.tweenOpacity(cageOpenOpacity, 255, 0.28),
            this.tweenScale(this.cageOpenNode, 1, 0.28),
        ]);

        this.cageBaseNode.active = false;
    }

    private async transitionToFreedToto(): Promise<void> {
        if (!this.totoFreedNode) {
            this.logger.warn('Diagnostic: totoFreedNode missing. Skipping freed Toto stage.');
            return;
        }

        this.totoFreedNode.active = true;
        this.totoFreedNode.setScale(this.scaled(this.totoFreedNode, 0.94));
        const totoFreedOpacity = this.ensureOpacity(this.totoFreedNode);
        if (!totoFreedOpacity) {
            return;
        }
        totoFreedOpacity.opacity = 0;

        const fades: Promise<void>[] = [
            this.tweenOpacity(totoFreedOpacity, 255, 0.32),
            this.tweenScale(this.totoFreedNode, 1, 0.32),
        ];

        const nodesToHide = [this.cageOpenNode, this.totoRoot, this.locksRootNode];
        for (const node of nodesToHide) {
            const opacity = this.ensureOpacity(node);
            if (opacity) {
                fades.push(this.tweenOpacity(opacity, 0, 0.32));
            }
        }

        await Promise.all(fades);

        nodesToHide.forEach((node) => {
            if (node?.isValid) {
                node.active = false;
            }
        });
    }

    private async fadeThreatCompositionOut(): Promise<void> {
        const fades: Promise<void>[] = [];
        const totoFreedOpacity = this.ensureOpacity(this.totoFreedNode);
        if (this.totoFreedNode && totoFreedOpacity) {
            fades.push(this.tweenOpacity(totoFreedOpacity, 0, 0.28));
            fades.push(this.tweenScale(this.totoFreedNode, 1.04, 0.28));
        }
        const cageRootOpacity = this.ensureOpacity(this.cageRoot);
        if (cageRootOpacity) {
            fades.push(this.tweenOpacity(cageRootOpacity, 0, 0.28));
        }

        if (fades.length > 0) {
            await Promise.all(fades);
        }

        if (this.totoFreedNode?.isValid) {
            this.totoFreedNode.active = false;
        }
        if (this.cageRoot?.isValid) {
            this.cageRoot.active = false;
        }
    }

    private tweenOpacity(opacity: UIOpacity, to: number, duration: number): Promise<void> {
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(opacity);
            tween(opacity)
                .to(duration, { opacity: to }, { easing: 'sineInOut' })
                .call(() => resolve())
                .start();
        });
    }

    private tweenScale(node: Node | null, factor: number, duration: number): Promise<void> {
        if (!node || !node.isValid) return Promise.resolve();
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(node);
            tween(node)
                .to(duration, { scale: this.scaled(node, factor) }, { easing: 'sineInOut' })
                .call(() => resolve())
                .start();
        });
    }

    private async fadeTargets(targets: Node[], toOpacity: number, duration: number, deactivateAfter: boolean): Promise<void> {
        const validTargets = targets.filter((target): target is Node => !!target && target.isValid);
        if (validTargets.length === 0) return;

        await Promise.all(validTargets.map(async (target) => {
            const opacity = this.ensureOpacity(target);
            if (!opacity) return;
            await this.tweenOpacity(opacity, toOpacity, duration);
            if (deactivateAfter) {
                target.active = false;
            }
        }));
    }
}
