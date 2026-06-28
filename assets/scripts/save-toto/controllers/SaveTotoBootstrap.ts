/**
 * Save Toto — bootstrap (адаптирован из slot-game/controllers/Bootstrap.ts).
 *
 * АДАПТАЦИИ (ARCHITECTURE.md §5, OI-407):
 *  - НЕТ generic CTA-after-spins: CTA показывается только state machine после Payout.
 *  - Инициализирует scatter evaluator и forced cell rules для scripted 3-scatter результата (OI-403).
 *  - Запускает SaveTotoStateMachine.startFlow().
 *  - Store adapter изолирует redirect (OI-004).
 */

import { _decorator, Component, Node } from 'cc';
import { SaveTotoStateMachine } from './SaveTotoStateMachine';
import { SaveTotoSlotController } from '../Slot/SaveTotoSlotController';
import { SaveTotoSpinsController } from './SaveTotoSpinsController';
import { SaveTotoSpinButtonController } from './SaveTotoSpinButtonController';
import { SaveTotoRewardController } from './SaveTotoRewardController';
import { SaveTotoElementConfiguration } from '../Slot/Elements/SaveTotoElementConfiguration';
import { SaveTotoWinAnimationConfiguration } from '../Slot/Animations/SaveTotoWinAnimationConfiguration';
import { SaveTotoMovementEffectBehaviour } from '../Slot/ScrollEffects/SaveTotoMovementEffectBehaviour';
import { SaveTotoForcedSpawnManager } from '../Slot/managers/SaveTotoForcedSpawnManager';
import { SaveTotoGameConfig } from '../config/SaveTotoGameConfig';
import { SaveTotoCTAScreen } from '../Slot/SaveTotoCTAScreen';
import { SaveTotoVFXSpawner } from './SaveTotoVFXSpawner';
import { SaveTotoAnalyticsAdapter } from '../adapters/SaveTotoAnalyticsAdapter';
import { SaveTotoStoreAdapter } from '../adapters/SaveTotoStoreAdapter';
import { SaveTotoComponentValidator } from '../common/SaveTotoComponentValidator';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';
import { ISaveTotoForcedCellRule } from '../interfaces/IForcedRule';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBootstrap')
export class SaveTotoBootstrap extends Component {
    @property(SaveTotoStateMachine)
    private stateMachine: SaveTotoStateMachine = null!;

    @property(SaveTotoGameConfig)
    private gameConfig: SaveTotoGameConfig = null!;

    @property(SaveTotoSlotController)
    private slotController: SaveTotoSlotController = null!;

    @property(SaveTotoSpinsController)
    private spinsController: SaveTotoSpinsController = null!;

    @property(SaveTotoSpinButtonController)
    private spinButtonController: SaveTotoSpinButtonController = null!;

    @property(SaveTotoRewardController)
    private rewardController: SaveTotoRewardController = null!;

    @property(SaveTotoElementConfiguration)
    private elementConfiguration: SaveTotoElementConfiguration = null!;

    @property(SaveTotoWinAnimationConfiguration)
    private winAnimationConfiguration: SaveTotoWinAnimationConfiguration = null!;

    @property(SaveTotoMovementEffectBehaviour)
    private columnMovementEffect: SaveTotoMovementEffectBehaviour = null!;

    @property(Node)
    private forcedManagerNode: Node = null!;

    @property(SaveTotoCTAScreen)
    private ctaScreen: SaveTotoCTAScreen = null!;

    @property(SaveTotoVFXSpawner)
    private vfxSpawner: SaveTotoVFXSpawner = null!;

    private logger = createSaveTotoLogger('SaveTotoBootstrap');
    private validator = new SaveTotoComponentValidator('SaveTotoBootstrap');

    onLoad(): void {
        this.logger.info('Начало инициализации...');

        if (!this.validateComponents()) {
            this.logger.error('Валидация компонентов не пройдена. Инициализация прервана.');
            return;
        }

        this.injectDependencies();
        this.initScatterEvaluator();
        this.initForcedScriptedResult();
        this.hideCtaAtStart();
        this.initStateMachine();

        this.logger.success('Инициализация завершена успешно');

        // Старт flow после slot core start() (отложенный на следующий кадр).
        this.scheduleOnce(() => this.stateMachine.startFlow(), 0);
    }

    private validateComponents(): boolean {
        this.validator.validate(this.stateMachine, 'SaveTotoStateMachine', true);
        this.validator.validate(this.gameConfig, 'SaveTotoGameConfig', true);
        this.validator.validate(this.slotController, 'SaveTotoSlotController', true);
        this.validator.validate(this.spinsController, 'SaveTotoSpinsController', true);
        this.validator.validate(this.spinButtonController, 'SaveTotoSpinButtonController', true);
        this.validator.validate(this.rewardController, 'SaveTotoRewardController', true);
        this.validator.validate(this.elementConfiguration, 'SaveTotoElementConfiguration', true);
        this.validator.validate(this.forcedManagerNode?.getComponent(SaveTotoForcedSpawnManager) as any, 'ForcedSpawnManager', true);
        this.validator.validate(this.ctaScreen, 'SaveTotoCTAScreen', false);
        this.validator.validate(this.vfxSpawner, 'SaveTotoVFXSpawner', false);
        this.validator.validate(this.winAnimationConfiguration, 'SaveTotoWinAnimationConfiguration', false);
        this.validator.validate(this.columnMovementEffect, 'SaveTotoMovementEffectBehaviour', false);

        this.validator.printReport();
        return !this.validator.hasErrors();
    }

    private injectDependencies(): void {
        // Slot core зависимости.
        this.slotController.setDependencies(
            this.elementConfiguration,
            this.winAnimationConfiguration || undefined,
            this.columnMovementEffect || undefined,
            this.forcedManagerNode || undefined
        );

        // Spin button — input-only (без slot/spins зависимостей).
        this.rewardController.setDependencies(
            this.slotController,
            this.ctaScreen || undefined,
            this.vfxSpawner || undefined
        );

        this.logger.success('Зависимости внедрены');
    }

    private initScatterEvaluator(): void {
        const config = this.gameConfig.getConfig();
        this.slotController.initScatterEvaluator(config.reel.scatterElementId, config.reel.scatterRequired);
    }

    /**
     * Построить forced cell rules из scripted reel result, чтобы спин гарантированно
     * остановился на раскладе с 3 scatter Тото (OI-403).
     */
    private initForcedScriptedResult(): void {
        const config = this.gameConfig.getConfig();
        const forcedManager = this.forcedManagerNode?.getComponent(SaveTotoForcedSpawnManager);
        if (!forcedManager) {
            this.logger.warn('ForcedSpawnManager не найден — scripted result не применён');
            return;
        }

        const scripted = config.reel.scriptedResult; // column-major [col][row]
        const groupedBySymbol = new Map<number, [number, number][]>();

        for (let col = 0; col < scripted.length; col++) {
            const column = scripted[col];
            for (let row = 0; row < column.length; row++) {
                const symbolId = column[row];
                if (!groupedBySymbol.has(symbolId)) {
                    groupedBySymbol.set(symbolId, []);
                }
                groupedBySymbol.get(symbolId)!.push([col, row]);
            }
        }

        const cellRules: ISaveTotoForcedCellRule[] = [];
        groupedBySymbol.forEach((cells, elementId) => {
            cellRules.push({ spin: 1, cells, elementId });
        });

        forcedManager.setCellRules(cellRules);
        this.logger.success(`Scripted result применён: ${cellRules.length} cell-правил, scatter=${config.reel.scatterRequired}`);
    }

    private hideCtaAtStart(): void {
        if (this.ctaScreen) {
            this.ctaScreen.hide();
        }
    }

    private initStateMachine(): void {
        const config = this.gameConfig.getConfig();
        const analytics = new SaveTotoAnalyticsAdapter();
        const store = new SaveTotoStoreAdapter({
            iosUrl: config.cta.iosUrl,
            androidUrl: config.cta.androidUrl,
        });
        this.stateMachine.init(analytics, store);
    }
}
