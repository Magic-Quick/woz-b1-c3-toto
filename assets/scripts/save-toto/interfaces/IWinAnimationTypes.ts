import { Enum } from 'cc';

export enum WinAnimationType {
    SCALE_UP = 'scale_up',
    SCALE_DOWN = 'scale_down',
    ALPHA_CHANGE = 'alpha_change'
}

Enum(WinAnimationType);

export interface IWinAnimationConfig {
    readonly animationType: WinAnimationType;
    readonly duration: number;
    readonly intensity: number;
    readonly delay: number;
    readonly repeatCount: number;
    readonly customParams?: Record<string, any>;
}

export interface IWinAnimationSettings {
    readonly enabledAnimations: readonly WinAnimationType[];
    readonly globalDuration: number;
    readonly globalDelay: number;
    readonly globalRepeatCount: number;
    readonly scaleUpMultiplier: number;
    readonly scaleDownMultiplier: number;
    readonly alphaChangeMultiplier: number;
    readonly enableNonWinAlphaChange: boolean;
    readonly nonWinAlpha: number;
}

export interface IAnimationState {
    readonly scale: any;
    readonly color: any;
}
