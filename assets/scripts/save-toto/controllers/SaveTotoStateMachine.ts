/**
 * Save Toto — главная state machine.
 *
 * DIAGNOSTIC 2026-06-29:
 * Добавлены info-логи по цепочке spin -> bonus intro.
 */

import { _decorator, Component, Button, tween, UIOpacity } from 'cc';
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
import { SaveTotoCoinAnimation } from '../animations/SaveTotoCoinAnimation';
import { SaveTotoCoinFountain } from '../animations/SaveTotoCoinFountain';

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

    @property({ type: SaveTotoCoinAnimation, tooltip: 'Анимация монет к balance (опционально)' })
    public coinAnimation: SaveTotoCoinAnimation | null = null;

    @property({ type: SaveTotoCoinFountain, tooltip: 'Фонтан монет в финале (опционально)' })
    public coinFountain: SaveTotoCoinFountain | null = null;

    public lockUnlockController: SaveTotoLockUnlockController;
    public analytics: SaveTotoAnalyticsAdapter;
    public store: SaveTotoStoreAdapter;

    private state: SaveTotoState = SaveTotoState.Preload;
    private picksDone: number = 0;
    private config: SaveTotoConfig | null = null;
    private logger = createSaveTotoLogger('SaveTotoStateMachine');
    private spinNumber: number = 0;
    private readonly totalSpins: number = 4;
    private basketClickHandlers: Array<(() => void) | null> = [];

    public init(analytics: SaveTotoAnalyticsAdapter, store: SaveTotoStoreAdapter): void {
        this.analytics = analytics;
        this.store = store;
        this.config = this.gameConfig.getConfig();
        this.lockUnlockController = new SaveTotoLockUnlockController(this.config.threat.lockOrder);
        for (const lockView of this.threatView.lockViews) {
            this.lockUnlockController.registerLockView(lockView.lockId, lockView);
        }
        this.spinsController.setSpins(this.totalSpins);
        // OI-511: Balance стартует с 0, наполняется по picks и простым выигрышам.
        this.slotView.setBalanceValue(0);
        this.spinNumber = 0;
        this.picksDone = 0;
    }

    public startFlow(): void {
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_GAME_START, payload: { projectId: this.config?.projectId } });
        this.enterIntro();
    }

    protected onDisable(): void {
        this.cleanupInputBindings();
        this.coinFountain?.stop();
    }

    protected onDestroy(): void {
        this.cleanupInputBindings();
        this.coinFountain?.stop();
        this.unscheduleAllCallbacks();
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
        this.spinNumber += 1;
        this.logger.info(`enterSpinning #${this.spinNumber} bind SPIN_COMPLETE`);
        this.hudView.showSpinButton(false);
        this.spinsController.removeSpins(1);
        this.analytics.send({ name: SaveTotoEvents.EVT_SPIN_CLICK, payload: { tapIndex: this.spinNumber } });

        this.slotController.node.once(SaveTotoSlotEvents.SPIN_COMPLETE, (payload: SaveTotoSpinCompletePayload) => {
            this.logger.info(`received SPIN_COMPLETE scatterCount=${payload.scatterCount} triggersBonus=${payload.triggersBonus}`);
            this.onSpinComplete(payload);
        });
        this.slotController.startAllColumnsMovement();
    }

    private async onSpinComplete(payload: SaveTotoSpinCompletePayload): Promise<void> {
        this.state = SaveTotoState.SpinResult;
        this.logger.info(`onSpinComplete state=SpinResult spin=${this.spinNumber} scatterCount=${payload.scatterCount}`);
        this.analytics.send({ name: SaveTotoEvents.EVT_SPIN_RESULT, payload: { scatters: payload.scatterCount } });

        const isLastSpin = this.spinNumber >= this.totalSpins;

        try {
            if (isLastSpin) {
                // Scatter highlight → bonus.
                await this.slotView.highlightScatters();
                this.logger.info('highlightScatters done -> enterBonusIntro');
                this.enterBonusIntro();
            } else if (this.spinNumber === 3) {
                // Spin 3: пусто, без пополнения и анимации выигрыша.
                await new Promise<void>((resolve) => setTimeout(resolve, 600));
                this.enterSpinReady();
            } else {
                // Простой выигрыш на spins 1-2: highlight + монеты + balance.
                await this.playSimpleWin();
                this.enterSpinReady();
            }
        } catch (err) {
            this.logger.error(`onSpinComplete error on spin ${this.spinNumber}: ${err}`);
            // Safety fallback: не зависать — перейти к следующему спину или бонусу.
            if (isLastSpin) {
                this.enterBonusIntro();
            } else {
                this.enterSpinReady();
            }
        }
    }

    /** Простой выигрыш между спинами: highlight выигрышных символов + монеты + balance. */
    private async playSimpleWin(): Promise<void> {
        // Highlight выигрышных line-элементов (pulse + rotate + scale).
        try {
            const winPositions = this.slotController.getLastWinPositions();
            if (winPositions.length > 0) {
                await this.slotView.highlightWinElements(winPositions);
            }
        } catch (err) {
            this.logger.warn(`highlightWinElements failed: ${err}`);
        }

        const baseWins = [50000, 80000, 120000];
        const winAmount = baseWins[(this.spinNumber - 1) % baseWins.length] || 50000;

        // Монеты к balance label (если coin animation привязан).
        try {
            if (this.coinAnimation) {
                const reelWorld = this.slotController.node.worldPosition;
                this.coinAnimation.play(reelWorld);
            }
        } catch (err) {
            this.logger.warn(`coinAnimation failed: ${err}`);
        }

        await this.slotView.addBalanceValue(winAmount);

        // Короткая пауза чтобы игрок увидел результат.
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
    }

    private async enterBonusIntro(): Promise<void> {
        this.state = SaveTotoState.BonusIntro;
        this.logger.info('enterBonusIntro showBaskets');
        this.hudView.showSpinButton(false);
        this.analytics.send({ name: SaveTotoEvents.EVT_BONUS_START, payload: { basketCount: this.config!.bonus.basketCount, requiredPicks: this.config!.bonus.requiredPicks } });

        await this.bonusView.showBaskets();
        this.logger.info('bonusView.showBaskets done');
        this.unwireBasketInputs();
        this.wireBasketInputs();
        this.enterBonusPick();
    }

    private wireBasketInputs(): void {
        const baskets = this.bonusView.basketViews;
        baskets.forEach((basketView: SaveTotoBasketView, index: number) => {
            const btn = basketView.basketButton;
            if (btn) {
                const handler = () => this.onBasketPick(index);
                this.basketClickHandlers[index] = handler;
                btn.node.on(Button.EventType.CLICK, handler, this);
            }
        });
    }

    private unwireBasketInputs(): void {
        const baskets = this.bonusView?.basketViews ?? [];
        baskets.forEach((basketView: SaveTotoBasketView, index: number) => {
            const handler = this.basketClickHandlers[index];
            if (handler && basketView?.basketButton) {
                basketView.basketButton.node.off(Button.EventType.CLICK, handler, this);
            }
            this.basketClickHandlers[index] = null;
        });
    }

    private cleanupInputBindings(): void {
        this.spinButtonController?.node?.off(SaveTotoEvents.EVT_SPIN_CLICK, this.onSpinClick, this);
        this.unwireBasketInputs();
        if (this.ctaButton) {
            this.ctaButton.node.off(Button.EventType.CLICK, this.onCtaClick, this);
        }
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

        const basketAnchor = this.bonusView.getBasketAnchor(basketIndex);

        // OI-511: balance наполняется суммой из корзины (credit) или умножается (multiplier).
        if (reward.kind === 0 /* SaveTotoRewardKind.CREDIT */) {
            // Монеты из корзины к balance.
            if (this.coinAnimation) {
                this.coinAnimation.play(basketAnchor.worldPosition);
            }
            await this.slotView.addBalanceValue(reward.value);
        } else if (reward.kind === 1 /* SaveTotoRewardKind.MULTIPLIER */) {
            await this.slotView.multiplyBalanceValue(reward.value);
        }

        // Key flight из позиции корзины к замку + open-lock swap.
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
        this.unwireBasketInputs();
        await this.bonusView.hideBaskets();

        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_TOTO_FREED, payload: { picks: this.picksDone } });

        await this.threatView.playPackshotTransition();

        // Баланс уже фактический после picks (credit + multiplier).
        const finalWin = this.slotView.getBalanceValue();

        // Скрыть лишние спрайты (slot/threat слои) — экран пустеет перед финалом.
        await this.hideGameplayLayers();

        this.enterEndCard(finalWin);
    }

    /** Скрыть gameplay-слои (SlotLayer, ThreatLayer) перед показом endcard. */
    private async hideGameplayLayers(): Promise<void> {
        const slotLayer = this.slotView.node;
        const threatLayer = this.threatView.node;
        const layers = [slotLayer, threatLayer].filter(n => n && n.isValid);
        if (layers.length === 0) return;
        return new Promise<void>((resolve) => {
            let done = 0;
            const total = layers.length;
            for (const layer of layers) {
                const op = layer.getComponent(UIOpacity) || layer.addComponent(UIOpacity);
                tween(op)
                    .to(0.4, { opacity: 0 }, { easing: 'sineIn' })
                    .call(() => {
                        layer.active = false;
                        done++;
                        if (done >= total) resolve();
                    })
                    .start();
            }
        });
    }

    private async enterEndCard(finalWin: number): Promise<void> {
        this.state = SaveTotoState.EndCard;
        this.hudView.showCtaButton(false);

        await this.endCardView.show(finalWin);

        // Запустить ограниченный по времени фонтан монет за Тото (ПОСЛЕ show — EndCardLayer активен).
        if (this.coinFountain) {
            this.coinFountain.play();
        }

        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_CTA_SHOWN, payload: { finalWin } });

        if (this.ctaButton) {
            this.ctaButton.node.off(Button.EventType.CLICK, this.onCtaClick, this);
            this.ctaButton.node.on(Button.EventType.CLICK, this.onCtaClick, this);
        }
    }

    private onCtaClick(): void {
        if (this.state !== SaveTotoState.EndCard) return;
        this.analytics.send({ name: SaveTotoEvents.EVT_CTA_CLICK });
        this.coinFountain?.stop();
        const redirected = this.store.redirect();
        if (redirected) {
            this.state = SaveTotoState.StoreRedirect;
        } else {
            this.logger.warn('CTA click received, but redirect did not execute');
        }
    }
}
