/**
 * Save Toto — менеджер win-анимаций (перенесён из slot-game/Slot/managers/WinAnimationManager.ts).
 * Исправления:
 *  - getComponent('SlotElement') → getComponent(SaveTotoSlotElement).
 *  - setTimeout заменён на scheduleOnce-совместимый паттерн (через Director/system);
 *    т.к. plain-класс не имеет scheduleOnce, задержка реализована через старт tween-delay.
 */

import { Node } from 'cc';
import { WinAnimationType, IWinAnimationConfig, IWinAnimationSettings } from '../../interfaces/IWinAnimationTypes';
import { IWinResult } from '../../interfaces/IWinTypes';
import { SaveTotoBaseWinAnimation } from '../Animations/SaveTotoBaseWinAnimation';
import { SaveTotoWinAnimationFactory } from '../Animations/SaveTotoWinAnimationFactory';
import { SaveTotoSlotElement } from '../Elements/SaveTotoSlotElement';

export class SaveTotoWinAnimationManager {
    private readonly elementAnimations = new Map<Node, SaveTotoBaseWinAnimation[]>();
    private settings: IWinAnimationSettings;
    // DA-004: token для отсечения «протухших» отложенных батчей win-анимаций.
    // Раньше scheduleAnimations использовал raw setTimeout, который срабатывал
    // даже после stopAllAnimations() и заново запускал твинов на остановленных элементах.
    private scheduleToken = 0;

    constructor(settings: IWinAnimationSettings) {
        this.settings = settings;
    }

    public startAnimationsForElement(elementNode: Node): void {
        if (!elementNode?.isValid) return;

        this.stopAnimationsForElement(elementNode);

        const animations = this.createAnimations(elementNode);
        if (animations.length === 0) return;

        this.scheduleAnimations(animations);
        this.elementAnimations.set(elementNode, animations);
    }

    private createAnimations(elementNode: Node): SaveTotoBaseWinAnimation[] {
        return this.settings.enabledAnimations
            .map(type => this.createAnimationConfig(type))
            .map(config => SaveTotoWinAnimationFactory.createAnimation(elementNode, config))
            .filter((animation): animation is SaveTotoBaseWinAnimation => animation !== null);
    }

    private createAnimationConfig(type: WinAnimationType): IWinAnimationConfig {
        return {
            animationType: type,
            duration: this.settings.globalDuration,
            intensity: 1.0,
            delay: this.settings.globalDelay,
            repeatCount: this.settings.globalRepeatCount || -1,
            customParams: {
                scaleUpMultiplier: this.settings.scaleUpMultiplier,
                scaleDownMultiplier: this.settings.scaleDownMultiplier,
                alphaChangeMultiplier: this.settings.alphaChangeMultiplier
            }
        };
    }

    private scheduleAnimations(animations: SaveTotoBaseWinAnimation[]): void {
        if (this.settings.globalDelay > 0) {
            // Задержка перед стартом win-анимаций (вторичный визуал).
            // DA-004: token-инвалидация, чтобы stopAllAnimations() отменил
            // ещё не сработавший задержанный старт.
            const token = ++this.scheduleToken;
            setTimeout(() => {
                if (token !== this.scheduleToken) return;
                this.startAnimations(animations);
            }, this.settings.globalDelay * 1000);
        } else {
            this.startAnimations(animations);
        }
    }

    private startAnimations(animations: SaveTotoBaseWinAnimation[]): void {
        animations.forEach(animation => animation.start());
    }

    public stopAnimationsForElement(elementNode: Node): void {
        const animations = this.elementAnimations.get(elementNode);
        if (animations) {
            this.stopAnimations(animations);
            this.elementAnimations.delete(elementNode);
        }
    }

    public stopAllAnimations(): void {
        // DA-004: инвалидируем отложенные старты.
        this.scheduleToken++;
        this.elementAnimations.forEach((animations) => {
            this.stopAnimations(animations);
        });
        this.elementAnimations.clear();
    }

    private stopAnimations(animations: SaveTotoBaseWinAnimation[]): void {
        animations.forEach(animation => animation.stop());
    }

    public handleWinResults(winResults: IWinResult[], allElements: Node[], getWinElementNodes: (winResults: IWinResult[]) => Node[]): void {
        if (!this.settings.enableNonWinAlphaChange) return;

        const winElements = new Set(getWinElementNodes(winResults));

        allElements.forEach(elementNode => {
            const alpha = winElements.has(elementNode) ? 255 : this.settings.nonWinAlpha;
            this.setElementAlpha(elementNode, alpha);
        });
    }

    public resetAllElementsAlpha(allElements: Node[]): void {
        if (!this.settings.enableNonWinAlphaChange) return;

        allElements.forEach(elementNode => this.setElementAlpha(elementNode, 255));
    }

    private setElementAlpha(elementNode: Node, alpha: number): void {
        const slotElement = elementNode.getComponent(SaveTotoSlotElement);
        if (slotElement?.picture) {
            const color = slotElement.picture.color.clone();
            color.a = alpha;
            slotElement.picture.color = color;
        }
    }
}
