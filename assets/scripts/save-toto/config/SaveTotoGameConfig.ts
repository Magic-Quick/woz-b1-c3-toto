/**
 * Save Toto — конфиг-контракт.
 *
 * Источник: ARCHITECTURE.md §8 (SaveTotoConfig).
 *
 * Все числа живут в config, а не в gameplay-коде (ARCHITECTURE.md §13:
 * "Config содержит все числа, не оставляя magic numbers в логике").
 * Auto-spin/auto-pick выключены в MVP.
 */

import { _decorator, Component, CCInteger, CCFloat, CCString, CCBoolean } from 'cc';
import {
    SaveTotoBonusReward,
    SaveTotoFireLevel,
    SaveTotoLockId,
    SaveTotoSymbolId,
    SaveTotoScriptedReelResult,
} from '../types';

const { ccclass, property } = _decorator;

/**
 * Точный конфиг Save Toto (необходим для state machine/systems в рантайме).
 * Не является Cocos-компонентом — это типизированный объект, собираемый
 * SaveTotoGameConfig-компонентом из сериализованных свойств.
 */
export interface SaveTotoConfig {
    projectId: 'WOZ_B1_C3_SaveToto';
    canvas: { width: number; height: number };
    reel: {
        columns: 5;
        rows: 3;
        totalElementsPerColumn: number;
        elementSpacing: number;
        startIntervalSeconds: number;
        spinDurationSeconds: number;
        scatterElementId: number;
        scatterRequired: 3;
        scriptedResult: SaveTotoScriptedReelResult;
    };
    symbols: {
        totoScatterId: number;
        basketId: number;
        keyId: number;
        totoId: number;
        dropId: number;
        ozId: number;
    };
    bonus: {
        basketCount: 6;
        requiredPicks: 3;
        rewardsByPickIndex: SaveTotoBonusReward[];
        idlePickDelaySeconds: 0;
        autoPickEnabled: false;
    };
    threat: {
        lockOrder: SaveTotoLockId[];
        initialFireLevel: SaveTotoFireLevel;
    };
    payout: {
        startingBalance: number;
        finalWinValue: number;
        countDurationSeconds: number;
    };
    timing: {
        introDurationSeconds: number;
        bonusIntroDurationSeconds: number;
        unlockSequenceDurationSeconds: number;
    };
    cta: {
        label: string;
        tapAnywhereOnEndCard: false;
        iosUrl?: string;
        androidUrl?: string;
    };
    idle: {
        autoSpinEnabled: false;
        spinDelaySeconds: 0;
    };
}

/**
 * Scripted расклад первого спина (SCENE_SETUP.md §6).
 * Column-major: result[columnIndex][rowIndex].
 *
 * 3 scatter-символа Тото: col1-row3, col3-row1, col4-row2.
 */
export const SAVE_TOTO_SCRIPTED_REEL_RESULT: SaveTotoScriptedReelResult = [
    [SaveTotoSymbolId.BASKET, SaveTotoSymbolId.OZ,     SaveTotoSymbolId.TOTO],   // column 1
    [SaveTotoSymbolId.KEY,    SaveTotoSymbolId.DROP,   SaveTotoSymbolId.OZ],     // column 2
    [SaveTotoSymbolId.TOTO,   SaveTotoSymbolId.BASKET, SaveTotoSymbolId.DROP],   // column 3
    [SaveTotoSymbolId.OZ,     SaveTotoSymbolId.TOTO,   SaveTotoSymbolId.OZ],     // column 4
    [SaveTotoSymbolId.BASKET, SaveTotoSymbolId.KEY,    SaveTotoSymbolId.BASKET],  // column 5
];

/**
 * Scripted награды по индексу выбора (GDD §6, OPEN_ISSUES OI-002).
 * Порядок детерминирован по pickIndex, не по позиции корзины.
 *
 * Pick 1: 250k credit (small), Pick 2: ×3 multiplier (mid), Pick 3: 1M credit (big).
 */
export const SAVE_TOTO_BONUS_REWARDS: SaveTotoBonusReward[] = [
    {
        pickIndex: 0,
        rewardId: 'pick-1-credit-small',
        kind: 0 /* SaveTotoRewardKind.CREDIT */,
        value: 250_000,
        label: '250K',
    },
    {
        pickIndex: 1,
        rewardId: 'pick-2-multiplier',
        kind: 1 /* SaveTotoRewardKind.MULTIPLIER */,
        value: 3,
        label: 'x3',
    },
    {
        pickIndex: 2,
        rewardId: 'pick-3-credit-big',
        kind: 0 /* SaveTotoRewardKind.CREDIT */,
        value: 1_000_000,
        label: '1M',
    },
];

/**
 * Cocos-компонент, сериализующий конфиг в Inspector и предоставляющий
 * типизированный `getConfig()` для state machine/systems.
 *
 * `.meta` создаётся Cocos-импортером, не вручную (AGENTS.md §3).
 */
@ccclass('SaveTotoGameConfig')
export class SaveTotoGameConfig extends Component {
    @property({ type: CCInteger })
    public canvasWidth: number = 1080;

    @property({ type: CCInteger })
    public canvasHeight: number = 1920;

    @property({ type: CCInteger })
    public reelColumns: number = 5;

    @property({ type: CCInteger })
    public reelRows: number = 3;

    @property({ type: CCInteger })
    public totalElementsPerColumn: number = 10;

    @property({ type: CCFloat })
    public elementSpacing: number = 142;

    @property({ type: CCFloat })
    public startIntervalSeconds: number = 0.1;

    @property({ type: CCFloat })
    public spinDurationSeconds: number = 2.6;

    @property({ type: CCInteger })
    public scatterRequired: number = 3;

    @property({ type: CCInteger })
    public basketCount: number = 6;

    @property({ type: CCInteger })
    public requiredPicks: number = 3;

    @property({ type: CCInteger })
    public startingBalance: number = 555_000;

    @property({ type: CCInteger })
    public finalWinValue: number = 10_000_000;

    @property({ type: CCFloat })
    public payoutCountDurationSeconds: number = 2.4;

    @property({ type: CCFloat })
    public introDurationSeconds: number = 1.2;

    @property({ type: CCFloat })
    public bonusIntroDurationSeconds: number = 0.8;

    @property({ type: CCFloat })
    public unlockSequenceDurationSeconds: number = 1.0;

    @property({ type: CCString })
    public ctaLabel: string = 'PLAY NOW';

    @property({ type: CCBoolean })
    public ctaIosActive: boolean = false;

    @property({ type: CCString })
    public ctaIosUrl: string = '';

    @property({ type: CCBoolean })
    public ctaAndroidActive: boolean = false;

    @property({ type: CCString })
    public ctaAndroidUrl: string = '';

    /**
     * Собрать типизированный SaveTotoConfig.
     * Scripted расклад и награды импортируются из констант (не сериализуются
     * в Inspector, чтобы избежать рассинхрона с кодом).
     */
    public getConfig(): SaveTotoConfig {
        return {
            projectId: 'WOZ_B1_C3_SaveToto',
            canvas: { width: this.canvasWidth, height: this.canvasHeight },
            reel: {
                columns: 5,
                rows: 3,
                totalElementsPerColumn: this.totalElementsPerColumn,
                elementSpacing: this.elementSpacing,
                startIntervalSeconds: this.startIntervalSeconds,
                spinDurationSeconds: this.spinDurationSeconds,
                scatterElementId: SaveTotoSymbolId.TOTO,
                scatterRequired: 3,
                scriptedResult: SAVE_TOTO_SCRIPTED_REEL_RESULT,
            },
            symbols: {
                totoScatterId: SaveTotoSymbolId.TOTO,
                basketId: SaveTotoSymbolId.BASKET,
                keyId: SaveTotoSymbolId.KEY,
                totoId: SaveTotoSymbolId.TOTO,
                dropId: SaveTotoSymbolId.DROP,
                ozId: SaveTotoSymbolId.OZ,
            },
            bonus: {
                basketCount: 6,
                requiredPicks: 3,
                rewardsByPickIndex: SAVE_TOTO_BONUS_REWARDS,
                idlePickDelaySeconds: 0,
                autoPickEnabled: false,
            },
            threat: {
                lockOrder: ['left', 'center', 'right'],
                initialFireLevel: 3,
            },
            payout: {
                startingBalance: this.startingBalance,
                finalWinValue: this.finalWinValue,
                countDurationSeconds: this.payoutCountDurationSeconds,
            },
            timing: {
                introDurationSeconds: this.introDurationSeconds,
                bonusIntroDurationSeconds: this.bonusIntroDurationSeconds,
                unlockSequenceDurationSeconds: this.unlockSequenceDurationSeconds,
            },
            cta: {
                label: this.ctaLabel,
                tapAnywhereOnEndCard: false,
                iosUrl: this.ctaIosActive ? this.ctaIosUrl : undefined,
                androidUrl: this.ctaAndroidActive ? this.ctaAndroidUrl : undefined,
            },
            idle: {
                autoSpinEnabled: false,
                spinDelaySeconds: 0,
            },
        };
    }
}
