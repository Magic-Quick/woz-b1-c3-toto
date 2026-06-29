/**
 * Save Toto — главная state machine.
 *
 * DIAGNOSTIC 2026-06-29:
 * Добавлены info-логи по цепочке spin -> bonus intro.
 */

import { _decorator, Component, Button } from 'cc';
import { SaveTotoGameConfig, SaveTotoConfig } from '../config/SaveTotoGameConfig';
import { SaveTotoSlotController, SaveTotoSpinCompletePayload } from '../Slot/SaveTotoSlotController';
import { SaveTotoSlotView } from '../views/SaveTotoSlotView';
import { SaveTotoThreatView } from '../views/SaveTotoThreatView';
import { SaveTotoBonusView } from '../views/SaveTotoBonusView';
import { SaveTotoHudView } from '../views/SaveTotoHudView';
import { SaveTotoEndCardView } from '../views/SaveTotoEndCardView';
import { SaveTotoBasketView } from '../views/SaveTotoBasketView';
import { SaveTotoSpinsController } from './SaveTotoSpinsController';
import { SaveTotoSpinButtonController } from './SaveTotoSpinButtonController';
import { SaveTotoRewardController } from './SaveTotoRewardController';
import { SaveTotoLockUnlockController } from './SaveTotoLockUnlockController';
import { SaveTotoAnalyticsAdapter } from '../adapters/SaveTotoAnalyticsAdapter';
import { SaveTotoStoreAdapter } from '../adapters/SaveTotoStoreAdapter';
import { SaveTotoEvents } from '../events/SaveTotoEvents';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

export enum SaveTotoState {
    Preload = 'Preload',
    Intro = 'Intro',
    SpinReady = 'SpinReady',
    Spinning = 'Spinning',
    SpinResult = 'SpinResult',
    BonusIntro = 'BonusIntro',
    BonusPick = 'BonusPick',
    UnlockSequence = 'UnlockSequence',
    Payout = 'Payout',
    EndCard = 'EndCard',
    StoreRedirect = 'StoreRedirect',
}

@ccclass('SaveTotoStateMachine')
export class SaveTotoStateMachine extends Component {
    @property(SaveTotoGameConfig)
    public gameConfig: SaveTotoGameConfig = null!;

    @property(SaveTotoSlotController)
    public slotController: SaveTotoSlotController = null!;

    @property(SaveTotoSlotView)
    public slotView: SaveTotoSlotView = null!;

    @property(SaveTotoThreatView)
    public threatView: SaveTotoThreatView = null!;

    @property(SaveTotoBonusView)
    public bonusView: SaveTotoBonusView = null!;

    @property(SaveTotoHudView)
    public hudView: SaveTotoHudView = null!;

    @property(SaveTotoEndCardView)
    public endCardView: SaveTotoEndCardView = null!;

    @property(SaveTotoSpinsController)
    public spinsController: SaveTotoSpinsController = null!;

    @property(SaveTotoSpinButtonController)
    public spinButtonController: SaveTotoSpinButtonController = null!;

    @property(SaveTotoRewardController)
    public rewardController: SaveTotoRewardController = null!;

    @property(Button)
    public ctaButton: Button = null!;

    public lockUnlockController: SaveTotoLockUnlockController;
    public analytics: SaveTotoAnalyticsAdapter;
    public store: SaveTotoStoreAdapter;

    private state: SaveTotoState = SaveTotoState.Preload;
    private picksDone: number = 0;
    private config: SaveTotoConfig | null = null;
    private logger = createSaveTotoLogger('SaveTotoStateMachine');

    public init(analytics: SaveTotoAnalyticsAdapter, store: SaveTotoStoreAdapter): void {
        this.analytics = analytics;
        this.store = store;
        this.config = this.gameConfig.getConfig();
        this.lockUnlockController = new SaveTotoLockUnlockController(this.config.threat.lockOrder);
        for (const lockView of this.threatView.lockViews) {
            this.lockUnlockController.registerLockView(lockView.lockId, lockView);
        }
        this.spinsController.setSpins(1);
        // OI-511: Balance стартует пустым, наполняется по picks. Финальный payout считает до finalWinValue.
        this.slotView.setBalanceValue(0);
    }

    public startFlow(): void {
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_GAME_START, payload: { projectId: this.config?.projectId } });
        this.enterIntro();
    }

    public getState(): SaveTotoState {
        return this.state;
    }

    private enterIntro(): void {
        this.state = SaveTotoState.Intro;
        this.threatView.setFireLevel(this.config!.threat.initialFireLevel);
        this.hudView.showSpinButton(false);
        this.hudView.showCtaButton(false);
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_INTRO_SHOWN, payload: { state: 'Intro' } });
        this.scheduleOnce(() => this.enterSpinReady(), this.config!.timing.introDurationSeconds);
    }

    private enterSpinReady(): void {
        this.state = SaveTotoState.SpinReady;
        this.logger.info('enterSpinReady');
        this.hudView.showSpinButton(true);
        this.spinButtonController.node.on(SaveTotoEvents.EVT_SPIN_CLICK, this.onSpinClick, this);
    }

    private onSpinClick(): void {
        if (this.state !== SaveTotoState.SpinReady) return;
        this.logger.info('onSpinClick -> enterSpinning');
        this.spinButtonController.node.off(SaveTotoEvents.EVT_SPIN_CLICK, this.onSpinClick, this);
        this.enterSpinning();
    }

    private async enterSpinning(): Promise<void> {
        this.state = SaveTotoState.Spinning;
        this.logger.info('enterSpinning bind SPIN_COMPLETE');
        this.hudView.showSpinButton(false);
        this.spinsController.removeSpins(1);
        this.analytics.send({ name: SaveTotoEvents.EVT_SPIN_CLICK, payload: { tapIndex: 1 } });

        this.slotController.node.once(SaveTotoSlotEvents.SPIN_COMPLETE, (payload: SaveTotoSpinCompletePayload) => {
            this.logger.info(`received SPIN_COMPLETE scatterCount=${payload.scatterCount} triggersBonus=${payload.triggersBonus}`);
            this.onSpinComplete(payload);
        });
        this.slotController.startAllColumnsMovement();
    }

    private async onSpinComplete(payload: SaveTotoSpinCompletePayload): Promise<void> {
        this.state = SaveTotoState.SpinResult;
        this.logger.info(`onSpinComplete state=SpinResult scatterCount=${payload.scatterCount}`);
        this.analytics.send({ name: SaveTotoEvents.EVT_SPIN_RESULT, payload: { scatters: payload.scatterCount } });

        if (!payload.triggersBonus) {
            this.logger.warn('Spin не дал scatter-триггер; fallback в bonus по scripted контракту.');
        }

        await this.slotView.highlightScatters();
        this.logger.info('highlightScatters done -> enterBonusIntro');
        this.enterBonusIntro();
    }

    private async enterBonusIntro(): Promise<void> {
        this.state = SaveTotoState.BonusIntro;
        this.logger.info('enterBonusIntro showBaskets');
        this.hudView.showSpinButton(false);
        this.analytics.send({ name: SaveTotoEvents.EVT_BONUS_START, payload: { basketCount: this.config!.bonus.basketCount, requiredPicks: this.config!.bonus.requiredPicks } });

        await this.bonusView.showBaskets();
        this.logger.info('bonusView.showBaskets done');
        this.wireBasketInputs();
        this.enterBonusPick();
    }

    private wireBasketInputs(): void {
        const baskets = this.bonusView.basketViews;
        baskets.forEach((basketView: SaveTotoBasketView, index: number) => {
            const btn = basketView.basketButton;
            if (btn) {
                btn.node.on(Button.EventType.CLICK, () => this.onBasketPick(index), this);
            }
        });
    }

    private enterBonusPick(): void {
        this.state = SaveTotoState.BonusPick;
        this.logger.info('enterBonusPick');
        this.bonusView.setAllBasketsEnabled(true);
    }

    private async onBasketPick(basketIndex: number): Promise<void> {
        if (this.state !== SaveTotoState.BonusPick) return;
        this.state = SaveTotoState.UnlockSequence;
        this.bonusView.setAllBasketsEnabled(false);

        const pickIndex = this.picksDone;
        const reward = this.config!.bonus.rewardsByPickIndex[pickIndex];
        this.analytics.send({ name: SaveTotoEvents.EVT_BASKET_PICK, payload: { basketIndex, pickIndex } });

        await this.bonusView.openBasket(basketIndex, reward);
        this.analytics.send({ name: SaveTotoEvents.EVT_REWARD_REVEALED, payload: { pickIndex, rewardId: reward.rewardId } });

        // OI-511: balance наполняется суммой из корзины (credit rewards).
        if (reward.kind === 0 /* SaveTotoRewardKind.CREDIT */) {
            await this.slotView.addBalanceValue(reward.value);
        }

        // Key flight из позиции корзины к замку + open-lock swap.
        const basketAnchor = this.bonusView.getBasketAnchor(basketIndex);
        const removedLock = await this.lockUnlockController.removeLockWithKey(pickIndex, basketAnchor.worldPosition);
        this.analytics.send({ name: SaveTotoEvents.EVT_LOCK_REMOVED, payload: { lockIndex: pickIndex, lockId: removedLock, locksRemaining: this.lockUnlockController.getRemainingLocks() } });

        const newFireLevel = Math.max(0, 3 - (pickIndex + 1));
        this.threatView.setFireLevel(newFireLevel as 0 | 1 | 2 | 3);
        this.analytics.send({ name: SaveTotoEvents.EVT_FIRE_LEVEL_CHANGED, payload: { fireLevel: newFireLevel } });

        this.picksDone += 1;

        if (this.picksDone < this.config!.bonus.requiredPicks) {
            this.enterBonusPick();
        } else {
            this.enterPayout();
        }
    }

    private async enterPayout(): Promise<void> {
        this.state = SaveTotoState.Payout;
        await this.bonusView.hideBaskets();

        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_TOTO_FREED, payload: { picks: this.picksDone } });

        await this.threatView.playPackshotTransition();
        await this.threatView.playTotoFreed();

        const finalWin = this.config!.payout.finalWinValue;
        this.analytics.send({ name: SaveTotoEvents.EVT_BALANCE_COUNT_START, payload: { targetValue: finalWin } });
        await this.slotView.countBalanceTo(finalWin, this.config!.payout.countDurationSeconds);
        this.analytics.send({ name: SaveTotoEvents.EVT_BALANCE_COUNT_COMPLETE, payload: { finalValue: finalWin } });

        this.enterEndCard(finalWin);
    }

    private async enterEndCard(finalWin: number): Promise<void> {
        this.state = SaveTotoState.EndCard;
        this.hudView.showCtaButton(false);
        await this.endCardView.show(finalWin);
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_CTA_SHOWN, payload: { finalWin } });

        if (this.ctaButton) {
            this.ctaButton.node.on(Button.EventType.CLICK, this.onCtaClick, this);
        }
    }

    private onCtaClick(): void {
        if (this.state !== SaveTotoState.EndCard) return;
        this.analytics.send({ name: SaveTotoEvents.EVT_CTA_CLICK });
        this.store.redirect();
        this.state = SaveTotoState.StoreRedirect;
    }
}
