/**
 * Save Toto — конфигурация win-анимаций (перенесена из slot-game/Slot/Animations/WinAnimationConfiguration.ts).
 * @ccclass переименован → SaveTotoWinAnimationConfiguration.
 */

import { _decorator, Component, Enum, CCFloat, CCInteger } from 'cc';
import { WinAnimationType, IWinAnimationSettings } from '../../interfaces/IWinAnimationTypes';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoWinAnimationConfiguration')
export class SaveTotoWinAnimationConfiguration extends Component {
    @property({ type: [Enum(WinAnimationType)], tooltip: 'Типы анимаций для выигрышных элементов' })
    public enabledAnimations: WinAnimationType[] = [WinAnimationType.SCALE_UP];

    @property({ type: CCFloat, tooltip: 'Общая длительность анимации в секундах' })
    public globalDuration: number = 1.0;

    @property({ type: CCFloat, tooltip: 'Задержка между запусками анимаций в секундах' })
    public globalDelay: number = 0.0;

    @property({ type: CCInteger, tooltip: 'Количество повторений анимации (-1 = бесконечно)' })
    public globalRepeatCount: number = -1;

    @property({ type: CCFloat, tooltip: 'Множитель масштаба для ScaleUp анимации' })
    public scaleUpMultiplier: number = 0.5;

    @property({ type: CCFloat, tooltip: 'Множитель масштаба для ScaleDown анимации' })
    public scaleDownMultiplier: number = 0.3;

    @property({ type: CCFloat, tooltip: 'Множитель альфы для AlphaChange анимации' })
    public alphaChangeMultiplier: number = 0.4;

    @property({ tooltip: 'Включить изменение альфы для элементов вне выигрышных линий' })
    public enableNonWinAlphaChange: boolean = false;

    @property({ type: CCInteger, tooltip: 'Альфа для элементов вне выигрышных линий (0-255)' })
    public nonWinAlpha: number = 150;

    public validateConfiguration(): boolean {
        return this.enabledAnimations.length > 0 && this.globalDuration > 0;
    }

    public getSettings(): IWinAnimationSettings {
        return {
            enabledAnimations: this.enabledAnimations,
            globalDuration: this.globalDuration,
            globalDelay: this.globalDelay,
            globalRepeatCount: this.globalRepeatCount,
            scaleUpMultiplier: this.scaleUpMultiplier,
            scaleDownMultiplier: this.scaleDownMultiplier,
            alphaChangeMultiplier: this.alphaChangeMultiplier,
            enableNonWinAlphaChange: this.enableNonWinAlphaChange,
            nonWinAlpha: this.nonWinAlpha
        };
    }
}
