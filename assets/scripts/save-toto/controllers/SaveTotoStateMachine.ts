/**
 * Save Toto — главная state machine.
 *
 * DIAGNOSTIC 2026-06-29:
 * Добавлены info-логи по цепочке spin -> bonus intro.
 */

import { _decorator, Component, Button, tween, UIOpacity, Node, Graphics, UITransform, Color } from 'cc';
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
import { SaveTotoAudioController } from './SaveTotoAudioController';
import { SaveTotoAnalyticsAdapter } from '../adapters/SaveTotoAnalyticsAdapter';
import { SaveTotoStoreAdapter } from '../adapters/SaveTotoStoreAdapter';
import { SaveTotoEvents } from '../events/SaveTotoEvents';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';
import { SaveTotoCoinAnimation } from '../animations/SaveTotoCoinAnimation';
import { SaveTotoCoinFountain } from '../animations/SaveTotoCoinFountain';
import { SaveTotoCircularLightAnimation } from '../animations/SaveTotoCircularLightAnimation';

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
    public audio: SaveTotoAudioController | null = null;

    private state: SaveTotoState = SaveTotoState.Preload;
    private picksDone: number = 0;
    private config: SaveTotoConfig | null = null;
    private logger = createSaveTotoLogger('SaveTotoStateMachine');
    private spinNumber: number = 0;
    private readonly totalSpins: number = 4;
    private basketClickHandlers: Array<(() => void) | null> = [];
    private introTutorialOverlay: Node | null = null;
    // OI-520: кэш circular-light компонентов, чтобы не вызывать
    // getComponentsInChildren (обход всего поддерева slotView) при каждой
    // паузе/возобновлении intro-FX.
    private cachedCircularLights: SaveTotoCircularLightAnimation[] = [];

    public init(analytics: SaveTotoAnalyticsAdapter, store: SaveTotoStoreAdapter, audio?: SaveTotoAudioController): void {
        this.analytics = analytics;
        this.store = store;
        this.audio = audio ?? null;
        this.config = this.gameConfig.getConfig();
        this.lockUnlockController = new SaveTotoLockUnlockController(this.config.threat.lockOrder);
        for (const lockView of this.threatView.lockViews) {
            this.lockUnlockController.registerLockView(lockView.lockId, lockView);
        }
        this.spinsController.setSpins(this.totalSpins);
        // OI-520: кэшируем circular-light компоненты один раз — избегаем
        // getComponentsInChildren при каждом setIntroAmbientFxPaused.
        this.cachedCircularLights = this.slotView?.node?.getComponentsInChildren(SaveTotoCircularLightAnimation) ?? [];
        // OI-511: Balance стартует с 0, наполняется по picks и простым выигрышам.
        this.slotView.setBalanceValue(0);
        this.spinNumber = 0;
        this.picksDone = 0;
    }

    public startFlow(): void {
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_GAME_START, payload: { projectId: this.config?.projectId } });
        this.audio?.playIntroBed();
        this.enterIntro();
    }

    protected onDisable(): void {
        this.cleanupInputBindings();
        this.coinFountain?.stop();
        this.audio?.stopAll();
    }

    protected onDestroy(): void {
        this.cleanupInputBindings();
        this.coinFountain?.stop();
        this.audio?.stopAll();
        this.unscheduleAllCallbacks();
    }

    public getState(): SaveTotoState {
        return this.state;
    }

    /**
     * OI-519: задержка синхронная с Cocos timeScale/pause.
     * Заменяет raw setTimeout в async-цепочках: твин на this.node автоматически
     * останавливается при уничтожении ноды, не пишет в невалидное состояние.
     * При невалидной ноде — мгновенный resolve (цепочка прервётся на ближайшем
     * isValid-guard дальше).
     */
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

    private enterIntro(): void {
        this.state = SaveTotoState.Intro;
        this.threatView.setFireLevel(this.config!.threat.initialFireLevel);
        this.hudView.showSpinButton(false);
        this.hudView.showCtaButton(false);
        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_INTRO_SHOWN, payload: { state: 'Intro' } });
        void this.runIntroSequence();
    }

    private async runIntroSequence(): Promise<void> {
        const introStart = Date.now();
        await this.runIntroLockTutorial();

        const remainingMs = Math.max(0, this.config!.timing.introDurationSeconds * 1000 - (Date.now() - introStart));
        if (remainingMs > 0) {
            await this.delaySeconds(remainingMs / 1000);
        }

        if (!this.node?.isValid || this.state !== SaveTotoState.Intro) {
            return;
        }

        this.enterSpinReady();
    }

    private async runIntroLockTutorial(): Promise<void> {
        const overlay = this.ensureIntroTutorialOverlay();
        this.logger.info('runIntroLockTutorial start');

        this.setIntroAmbientFxPaused(true);
        if (overlay) {
            this.threatView.beginTutorialPresentation(overlay);
        }

        try {
            if (overlay) {
                await this.fadeTutorialOverlay(overlay, true, 0.22);
            }

            await this.threatView.playLockTutorialHint();

            if (overlay) {
                await this.fadeTutorialOverlay(overlay, false, 0.2);
            }
        } finally {
            this.threatView.endTutorialPresentation();
            this.setIntroAmbientFxPaused(false);
            this.logger.info('runIntroLockTutorial done');
        }
    }

    private setIntroAmbientFxPaused(paused: boolean): void {
        this.threatView.setTutorialFxPaused(paused);

        const circularLights = this.cachedCircularLights;
        circularLights.forEach((light) => {
            if (paused) {
                light.stop();
            } else {
                light.play();
            }
        });

        this.logger.info(`setIntroAmbientFxPaused paused=${paused} winLights=${circularLights.length}`);
    }

    private ensureIntroTutorialOverlay(): Node | null {
        if (this.introTutorialOverlay?.isValid) {
            return this.introTutorialOverlay;
        }

        const canvasNode = this.slotView?.node?.parent;
        if (!canvasNode?.isValid) {
            this.logger.warn('Diagnostic: cannot create intro tutorial overlay because canvas node is missing.');
            return null;
        }

        const overlay = new Node('IntroTutorialOverlay');
        canvasNode.addChild(overlay);
        const targetIndex = Math.min(canvasNode.children.length - 1, this.slotView.node.getSiblingIndex() + 1);
        overlay.setSiblingIndex(targetIndex);

        const transform = overlay.addComponent(UITransform);
        const canvasTransform = canvasNode.getComponent(UITransform);
        const canvasSize = canvasTransform?.contentSize;
        const width = canvasSize?.width ?? this.config!.canvas.width;
        const height = canvasSize?.height ?? this.config!.canvas.height;
        transform.setContentSize(width, height);
        overlay.setPosition(0, 0, 0);

        const graphics = overlay.addComponent(Graphics);
        graphics.clear();
        graphics.fillColor = new Color(0, 0, 0, 170);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        const opacity = overlay.addComponent(UIOpacity);
        opacity.opacity = 0;
        overlay.active = false;

        this.introTutorialOverlay = overlay;
        return overlay;
    }

    private fadeTutorialOverlay(overlay: Node, visible: boolean, duration: number): Promise<void> {
        const opacity = overlay.getComponent(UIOpacity) || overlay.addComponent(UIOpacity);
        overlay.active = true;
        if (visible) {
            opacity.opacity = 0;
        }

        return new Promise<void>((resolve) => {
            tween(opacity)
                .to(duration, { opacity: visible ? 255 : 0 }, { easing: visible ? 'sineOut' : 'sineIn' })
                .call(() => {
                    if (!visible) {
                        overlay.active = false;
                    }
                    resolve();
                })
                .start();
        });
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
        this.audio?.notifyUserGesture();
        this.spinButtonController.node.off(SaveTotoEvents.EVT_SPIN_CLICK, this.onSpinClick, this);
        this.enterSpinning();
    }

    private async enterSpinning(): Promise<void> {
        this.state = SaveTotoState.Spinning;
        this.spinNumber += 1;
        this.logger.info(`enterSpinning #${this.spinNumber} bind SPIN_COMPLETE`);
        this.hudView.setSpinButtonInteractable(false);
        this.spinsController.removeSpins(1);
        this.analytics.send({ name: SaveTotoEvents.EVT_SPIN_CLICK, payload: { tapIndex: this.spinNumber } });
        this.audio?.playSpinLoop();

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
        this.audio?.stopSpinLoop();

        const isLastSpin = this.spinNumber >= this.totalSpins;

        try {
            if (isLastSpin) {
                // Scatter highlight → bonus.
                this.audio?.playScatterBonusStinger();
                await this.slotView.highlightScatters();
                this.logger.info('highlightScatters done -> enterBonusIntro');
                this.enterBonusIntro();
            } else if (this.spinNumber === 3) {
                // Spin 3: пусто, без пополнения и анимации выигрыша.
                await this.delaySeconds(0.6);
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
        this.audio?.playPrizeChime();

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
        await this.delaySeconds(0.4);
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
        this.audio?.notifyUserGesture();
        this.bonusView.setAllBasketsEnabled(false);

        const pickIndex = this.picksDone;
        const reward = this.config!.bonus.rewardsByPickIndex[pickIndex];
        this.analytics.send({ name: SaveTotoEvents.EVT_BASKET_PICK, payload: { basketIndex, pickIndex } });

        this.audio?.playBasketOpen();
        await this.bonusView.openBasket(basketIndex, reward);
        this.analytics.send({ name: SaveTotoEvents.EVT_REWARD_REVEALED, payload: { pickIndex, rewardId: reward.rewardId } });

        const basketAnchor = this.bonusView.getBasketAnchor(basketIndex);

        // OI-511: balance наполняется суммой из корзины (credit) или умножается (multiplier).
        if (reward.kind === 0 /* SaveTotoRewardKind.CREDIT */) {
            this.audio?.playPrizeChime();
            // Монеты из корзины к balance.
            if (this.coinAnimation) {
                this.coinAnimation.play(basketAnchor.worldPosition);
            }
            await this.slotView.addBalanceValue(reward.value);
        } else if (reward.kind === 1 /* SaveTotoRewardKind.MULTIPLIER */) {
            await this.slotView.multiplyBalanceValue(reward.value);
        }

        // Key flight из позиции корзины к замку + open-lock swap.
        this.audio?.playUnlockSequence();
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
        this.logger.info('enterPayout start');
        this.audio?.stopSpinLoop();
        this.audio?.stopThreatLoop();
        this.audio?.stopBackgroundMusic();
        this.audio?.stopBarkingLoop();
        await this.bonusView.hideBaskets();

        this.analytics.sendOnce({ name: SaveTotoEvents.EVT_TOTO_FREED, payload: { picks: this.picksDone } });
        this.audio?.stopWhimperLoop();

        await Promise.all([
            this.threatView.playPackshotTransition(),
            this.hideGameplayLayers(),
        ]);

        // Баланс уже фактический после picks (credit + multiplier).
        const finalWin = this.slotView.getBalanceValue();

        this.logger.info(`enterPayout visuals hidden. finalWin=${finalWin}`);
        this.enterEndCard(finalWin);
    }

    /** Скрыть gameplay-слои (SlotLayer, ThreatLayer) перед показом endcard. */
    private async hideGameplayLayers(): Promise<void> {
        const slotLayer = this.slotView.node;
        const layers = [slotLayer].filter(n => n && n.isValid);
        if (layers.length === 0) return;
        this.logger.info(`hideGameplayLayers start layers=${layers.map(l => l.name).join(',')}`);
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
                        if (done >= total) {
                            this.logger.info('hideGameplayLayers done');
                            resolve();
                        }
                    })
                    .start();
            }
        });
    }

    private async enterEndCard(finalWin: number): Promise<void> {
        this.state = SaveTotoState.EndCard;
        this.hudView.showCtaButton(false);

        this.audio?.playDogBarking();
        this.audio?.playCtaJingle();
        await this.endCardView.show(finalWin);
        await this.audio?.playHappyMusic();
        this.audio?.playCoinShower();

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
        this.audio?.notifyUserGesture();
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
