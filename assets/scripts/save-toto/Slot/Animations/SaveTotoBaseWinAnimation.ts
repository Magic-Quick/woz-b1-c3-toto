/**
 * Save Toto — базовая анимация выигрышного элемента (перенесена из slot-game/Slot/Animations/BaseWinAnimation.ts).
 * Исправление: getComponent('SlotElement') → getComponent(SaveTotoSlotElement) (типизированно).
 */

import { Node, Tween, tween } from 'cc';
import { IWinAnimationConfig, IAnimationState } from '../../interfaces/IWinAnimationTypes';
import { SaveTotoSlotElement } from '../Elements/SaveTotoSlotElement';

export abstract class SaveTotoBaseWinAnimation {
    protected readonly node: Node;
    protected readonly config: IWinAnimationConfig;
    protected tween: Tween<any> | null = null;
    protected readonly originalState: IAnimationState;

    constructor(node: Node, config: IWinAnimationConfig) {
        this.node = node;
        this.config = config;
        this.originalState = this.saveOriginalState();
    }

    private saveOriginalState(): IAnimationState {
        const slotElement = this.node.getComponent(SaveTotoSlotElement);
        return {
            scale: this.node.scale.clone(),
            color: slotElement?.picture?.color?.clone() || null
        };
    }

    protected restoreOriginalState(): void {
        if (!this.node?.isValid) return;

        this.node.scale = this.originalState.scale;

        const slotElement = this.node.getComponent(SaveTotoSlotElement);
        if (slotElement?.picture && this.originalState.color) {
            slotElement.picture.color = this.originalState.color;
        }
    }

    public abstract start(): Tween<any> | null;
    public abstract stop(): void;

    protected readonly getDuration = (): number => this.config.duration;
    protected readonly getSlotElement = (): SaveTotoSlotElement | null => this.node.getComponent(SaveTotoSlotElement);
}
