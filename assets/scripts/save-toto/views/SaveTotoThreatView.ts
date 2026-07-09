/**
 * Save Toto — view threat-слоя.
 *
 * Огонь: делегирует SaveTotoFireAnimation.
 * Финальный payoff идёт staged-последовательностью:
 * 1) огонь гаснет + три открытых замка исчезают,
 * 2) закрытая клетка меняется на открытую + Toto-body меняется на Toto-full-body,
 * 3) открытая клетка исчезает — остаётся только собака,
 * 4) собака + CageRoot уходят перед EndCard.
 */
import { _decorator, Component, Node, tween, Tween, UIOpacity, Vec3, TweenEasing } from 'cc';
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

        // Stage 0: Cage anticipation — subtle tremble before the cage opens.
        await this.playCageAnticipation();

        // Stage 1+2 overlap: fire/locks fade while cage+toto swap begins.
        const fireTargets = this.fireFadeNodes.length > 0 ? this.fireFadeNodes : [this.fireNode];
        const fireFadePromise = Promise.all([
            this.fadeTargets(fireTargets, 0, 0.35, true),
            this.fadeOutLocks(0.35),
        ]);

        // Start cage swap shortly after fire begins fading (overlap, not dead gap).
        await this.delaySeconds(0.12);
        try {
            await this.transitionCageAndTotoSwap();
        } catch (e) {
            this.logger.warn(`transitionCageAndTotoSwap error: ${e}`);
        }

        // Ensure fire fade completed before continuing.
        await fireFadePromise;

        // Stage 2.5: Toto joy bounce — the "freed!" celebration moment.
        try {
            await this.playTotoJoyBounce();
        } catch (e) {
            this.logger.warn(`playTotoJoyBounce error: ${e}`);
        }

        // Stage 3: Open cage drifts upward and fades out — only the dog remains.
        try {
            await this.fadeOutOpenCage();
        } catch (e) {
            this.logger.warn(`fadeOutOpenCage error: ${e}`);
        }

        // Stage 4: Toto floats upward to freedom + cage root fades out.
        await this.delaySeconds(0.1);
        try {
            await this.fadeThreatCompositionOut();
        } catch (e) {
            this.logger.warn(`fadeThreatCompositionOut error: ${e}`);
        }

        this.logger.info('playPackshotTransition done');
    }

    public async playTotoFreed(): Promise<void> {
        await this.transitionCageAndTotoSwap();
    }

    /**
     * Stage 0: Subtle cage tremble — anticipation before the cage opens.
     * A quick squash/stretch cycle that signals "something is about to happen".
     */
    private async playCageAnticipation(): Promise<void> {
        if (!this.cageSwingRoot || !this.cageSwingRoot.isValid) return;
        const base = this.scaled(this.cageSwingRoot, 1);
        await new Promise<void>((resolve) => {
            tween(this.cageSwingRoot)
                .to(0.08, { scale: new Vec3(base.x * 1.015, base.y * 0.985, base.z) }, { easing: 'sineOut' })
                .to(0.08, { scale: new Vec3(base.x * 0.99, base.y * 1.01, base.z) }, { easing: 'sineInOut' })
                .to(0.09, { scale: base.clone() }, { easing: 'sineOut' })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * Stage 2.5: Toto jumps for joy — a quick hop upward + scale pop, then
     * settle back down. This is the "Toto is free!" celebration beat.
     */
    private async playTotoJoyBounce(): Promise<void> {
        if (!this.totoFreedNode || !this.totoFreedNode.isValid) return;
        const base = this.scaled(this.totoFreedNode, 1);
        const basePos = this.totoFreedNode.position.clone();
        await new Promise<void>((resolve) => {
            tween(this.totoFreedNode)
                .to(0.14, {
                    scale: new Vec3(base.x * 1.08, base.y * 1.08, base.z),
                    position: new Vec3(basePos.x, basePos.y + 18, basePos.z),
                }, { easing: 'sineOut' })
                .to(0.22, {
                    scale: base.clone(),
                    position: basePos.clone(),
                }, { easing: 'backOut' })
                .call(() => resolve())
                .start();
        });
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
        this.resetVisualNode(this.cageOpenNode, false, 0, 0.88);
        this.resetVisualNode(this.totoFreedNode, false, 0, 0.82);
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

    /** Stage 1: Fade out the three open locks with a gentle upward drift. */
    private async fadeOutLocks(duration: number): Promise<void> {
        if (!this.locksRootNode) return;
        const opacity = this.ensureOpacity(this.locksRootNode);
        if (!opacity) return;
        const basePos = this.locksRootNode.position.clone();
        await Promise.all([
            this.tweenOpacity(opacity, 0, duration, 'sineIn'),
            this.tweenPosition(this.locksRootNode, new Vec3(basePos.x, basePos.y + 15, basePos.z), duration, 'sineOut'),
        ]);
        if (this.locksRootNode.isValid) {
            this.locksRootNode.active = false;
        }
    }

    /**
     * Stage 2: Swap closed cage → open cage, and toto-body → toto-full-body
     * simultaneously. The old cage and old Toto fade out while the open cage
     * and full-body Toto fade in with a dramatic backOut scale pop.
     */
    private async transitionCageAndTotoSwap(): Promise<void> {
        if (!this.cageBaseNode || !this.cageOpenNode || !this.totoFreedNode) {
            this.logger.warn('Diagnostic: cageBaseNode/cageOpenNode/totoFreedNode missing. Skipping swap stage.');
            return;
        }

        // Activate incoming nodes with lower start scale for dramatic reveal.
        this.cageOpenNode.active = true;
        this.cageOpenNode.setScale(this.scaled(this.cageOpenNode, 0.88));
        this.totoFreedNode.active = true;
        this.totoFreedNode.setScale(this.scaled(this.totoFreedNode, 0.82));

        const cageBaseOpacity = this.ensureOpacity(this.cageBaseNode);
        const cageOpenOpacity = this.ensureOpacity(this.cageOpenNode);
        const totoRootOpacity = this.ensureOpacity(this.totoRoot);
        const totoFreedOpacity = this.ensureOpacity(this.totoFreedNode);

        if (!cageBaseOpacity || !cageOpenOpacity || !totoFreedOpacity) {
            return;
        }

        // Incoming nodes start invisible.
        cageOpenOpacity.opacity = 0;
        totoFreedOpacity.opacity = 0;

        const fades: Promise<void>[] = [
            // Closed cage fades out.
            this.tweenOpacity(cageBaseOpacity, 0, 0.32, 'sineOut'),
            // Open cage fades in + scale pop with backOut overshoot.
            this.tweenOpacity(cageOpenOpacity, 255, 0.32, 'sineOut'),
            this.tweenScale(this.cageOpenNode, 1, 0.34, 'backOut'),
            // Full-body Toto fades in + scale reveal with backOut (slightly longer
            // for a staggered feel — cage pops first, Toto follows).
            this.tweenOpacity(totoFreedOpacity, 255, 0.32, 'sineOut'),
            this.tweenScale(this.totoFreedNode, 1, 0.38, 'backOut'),
        ];

        // Toto-body (with cutouts for cage bars) fades out.
        if (totoRootOpacity) {
            fades.push(this.tweenOpacity(totoRootOpacity, 0, 0.32, 'sineIn'));
        }

        await Promise.all(fades);

        // Deactivate swapped-out nodes.
        this.cageBaseNode.active = false;
        if (this.totoRoot?.isValid) {
            this.totoRoot.active = false;
        }
    }

    /** Stage 3: Open cage drifts upward and fades out — only the dog remains. */
    private async fadeOutOpenCage(): Promise<void> {
        if (!this.cageOpenNode) return;
        const cageOpenOpacity = this.ensureOpacity(this.cageOpenNode);
        const basePos = this.cageOpenNode.position.clone();
        const promises: Promise<void>[] = [];
        if (cageOpenOpacity) {
            promises.push(this.tweenOpacity(cageOpenOpacity, 0, 0.32, 'sineIn'));
        }
        // Combine position + scale into ONE tween on the node. Calling
        // tweenPosition + tweenScale separately would have the second call's
        // Tween.stopAllByTarget(node) kill the first tween, hanging its promise.
        promises.push(this.tweenNodeProps(this.cageOpenNode, {
            position: new Vec3(basePos.x, basePos.y + 25, basePos.z),
            scale: this.scaled(this.cageOpenNode, 1.06),
        }, 0.32, 'sineOut'));
        await Promise.all(promises);
        if (this.cageOpenNode.isValid) {
            this.cageOpenNode.active = false;
        }
    }

    /** Stage 4: Dog floats upward to freedom + cage root fades out — exit to final. */
    private async fadeThreatCompositionOut(): Promise<void> {
        const fades: Promise<void>[] = [];
        const totoFreedOpacity = this.ensureOpacity(this.totoFreedNode);
        if (this.totoFreedNode && totoFreedOpacity) {
            // Toto floats upward to "freedom" while fading — a gentle, hopeful exit.
            const basePos = this.totoFreedNode.position.clone();
            fades.push(this.tweenOpacity(totoFreedOpacity, 0, 0.4, 'sineIn'));
            // Combine position + scale into ONE tween (see fadeOutOpenCage for why).
            fades.push(this.tweenNodeProps(this.totoFreedNode, {
                position: new Vec3(basePos.x, basePos.y + 55, basePos.z),
                scale: this.scaled(this.totoFreedNode, 1.03),
            }, 0.4, 'sineOut'));
        }
        const cageRootOpacity = this.ensureOpacity(this.cageRoot);
        if (cageRootOpacity) {
            fades.push(this.tweenOpacity(cageRootOpacity, 0, 0.4, 'sineIn'));
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

    private tweenOpacity(opacity: UIOpacity, to: number, duration: number, easing?: TweenEasing): Promise<void> {
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(opacity);
            tween(opacity)
                .to(duration, { opacity: to }, { easing: easing || 'sineInOut' })
                .call(() => resolve())
                .start();
        });
    }

    private tweenScale(node: Node | null, factor: number, duration: number, easing?: TweenEasing): Promise<void> {
        if (!node || !node.isValid) return Promise.resolve();
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(node);
            tween(node)
                .to(duration, { scale: this.scaled(node, factor) }, { easing: easing || 'sineInOut' })
                .call(() => resolve())
                .start();
        });
    }

    private tweenPosition(node: Node | null, to: Vec3, duration: number, easing?: TweenEasing): Promise<void> {
        if (!node || !node.isValid) return Promise.resolve();
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(node);
            tween(node)
                .to(duration, { position: to }, { easing: easing || 'sineInOut' })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * Tween multiple node properties (position, scale, etc.) in ONE tween.
     * Use this instead of separate tweenPosition + tweenScale calls on the
     * SAME node — calling them separately causes the second call's
     * Tween.stopAllByTarget(node) to kill the first tween, hanging its promise.
     */
    private tweenNodeProps(node: Node | null, props: { position?: Vec3; scale?: Vec3; [k: string]: any }, duration: number, easing?: TweenEasing): Promise<void> {
        if (!node || !node.isValid) return Promise.resolve();
        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(node);
            tween(node)
                .to(duration, props, { easing: easing || 'sineInOut' })
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
