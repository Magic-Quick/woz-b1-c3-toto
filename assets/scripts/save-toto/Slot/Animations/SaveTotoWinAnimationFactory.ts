/**
 * Save Toto — фабрика анимаций выигрышных элементов (перенесена из slot-game/Slot/Animations/WinAnimationFactory.ts).
 */

import { Node } from 'cc';
import { WinAnimationType, IWinAnimationConfig } from '../../interfaces/IWinAnimationTypes';
import { SaveTotoBaseWinAnimation } from './SaveTotoBaseWinAnimation';
import {
    SaveTotoScaleUpAnimation,
    SaveTotoScaleDownAnimation,
    SaveTotoAlphaChangeAnimation
} from './SaveTotoWinAnimationEffects';

type AnimationConstructor = new (node: Node, config: IWinAnimationConfig) => SaveTotoBaseWinAnimation;

const ANIMATION_REGISTRY: Record<WinAnimationType, AnimationConstructor> = {
    [WinAnimationType.SCALE_UP]: SaveTotoScaleUpAnimation,
    [WinAnimationType.SCALE_DOWN]: SaveTotoScaleDownAnimation,
    [WinAnimationType.ALPHA_CHANGE]: SaveTotoAlphaChangeAnimation
};

export class SaveTotoWinAnimationFactory {
    public static createAnimation(node: Node, config: IWinAnimationConfig): SaveTotoBaseWinAnimation | null {
        const AnimationClass = ANIMATION_REGISTRY[config.animationType];

        if (!AnimationClass) {
            return null;
        }

        return new AnimationClass(node, config);
    }
}
