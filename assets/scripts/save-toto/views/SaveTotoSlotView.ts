/**
 * Save Toto — view slot-слоя (implements SaveTotoSlotView).
 *
 * Обёртка над SaveTotoSlotController: scatter highlight, balance count.
 * WIN — фиксированный visual label (OI-204); balance — главный counter.
 *
 * Note: в MVP старт spin инициируется SaveTotoSpinButtonController (template input flow);
 * state machine слушает SPIN_COMPLETE. playSpinToResult оставлен для контракта/гибкости.
 */

import { _decorator, Component, Label, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoSlotView as ISaveTotoSlotView } from '../interfaces/SaveTotoViews';
import { SaveTotoSlotController, SaveTotoSpinCompletePayload } from '../Slot/SaveTotoSlotController';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';
import { SaveTotoScatterResult } from '../Slot/SaveTotoScatterEvaluator';
import { SaveTotoScriptedReelResult } from '../types';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoSlotView')
export class SaveTotoSlotView extends Component implements ISaveTotoSlotView {
    @property(SaveTotoSlotController)
    public slotController: SaveTotoSlotController = null!;

    @property(Label)
    public balanceLabel: Label = null!;

    /** WIN — фиксированный visual label (OI-204); не записывается кодом, optional. */
    @property(Label)
    public winLabel: Label | null = null;

    public showIdleReel(_result: SaveTotoScriptedReelResult): void {
        // Idle reel: SlotController уже сгенерировал начальные элементы в start().
        // Scripted result применяется ForcedSpawnManager при первом spin.
    }

    public playSpinToResult(_result: SaveTotoScriptedReelResult): Promise<void> {
        // В MVP spin запускается кнопкой; этот метод оставлен для контракта.
        return new Promise<void>((resolve) => {
            if (!this.slotController) {
                resolve();
                return;
            }
            this.slotController.node.once(SaveTotoSlotEvents.SPIN_COMPLETE, () => resolve());
            this.slotController.startAllColumnsMovement();
        });
    }

    public async highlightScatters(): Promise<void> {
        const result: SaveTotoScatterResult | null = this.slotController?.getScatterResult() ?? null;
        if (!result || result.positions.length === 0) return;

        const promises: Promise<void>[] = [];

        for (const [colIndex, rowIndex] of result.positions) {
            const elementNode = this.slotController.getElementNodeByPosition(colIndex, rowIndex);
            if (!elementNode) continue;
            promises.push(this.blinkScatter(elementNode));
        }

        await Promise.all(promises);
    }

    /** Highlight выигрышных элементов line-win (pulse + rotate + scale, мягче scatter). */
    public async highlightWinElements(positions: [number, number][]): Promise<void> {
        if (!this.slotController || positions.length === 0) return;
        const promises: Promise<void>[] = [];

        for (const [colIndex, rowIndex] of positions) {
            const elementNode = this.slotController.getElementNodeByPosition(colIndex, rowIndex);
            if (!elementNode) continue;
            promises.push(this.pulseWinElement(elementNode));
        }

        await Promise.all(promises);
    }

    /** Выигрышный элемент: 2× pulse + лёгкий rotate + scale (мягче scatter). */
    private pulseWinElement(node: Node): Promise<void> {
        return new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            // Таймаут-защита: если твин не завершился, резолвить через 1.5с.
            setTimeout(finish, 1500);
            tween(node)
                .to(0.15, { scale: new Vec3(1.2, 1.2, 1.2), angle: 8 }, { easing: 'sineOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1), angle: -8 }, { easing: 'sineInOut' })
                .to(0.15, { scale: new Vec3(1.15, 1.15, 1.15), angle: 5 }, { easing: 'sineOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1), angle: 0 }, { easing: 'sineInOut' })
                .call(finish)
                .start();
        });
    }

    /** Тройной мигающий pulse + light-вспышка под scatter-символом Тото. */
    private blinkScatter(node: Node): Promise<void> {
        return new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            // Таймаут-защита.
            setTimeout(finish, 2500);

            // Light-вспышка под символом: ищем дочерний "Light" узел (в Toto prefab).
            const lightNode = node.getChildByName('Light');
            if (lightNode) {
                lightNode.active = true;
                const lightOp = lightNode.getComponent(UIOpacity) || lightNode.addComponent(UIOpacity);
                lightOp.opacity = 0;
                tween(lightOp)
                    .to(0.12, { opacity: 220 })
                    .to(0.12, { opacity: 60 })
                    .to(0.12, { opacity: 200 })
                    .to(0.12, { opacity: 50 })
                    .to(0.12, { opacity: 180 })
                    .to(0.18, { opacity: 0 })
                    .call(() => { lightNode.active = false; })
                    .start();
            }

            // Тройной scale-pulse + rotate (отличие от line-win: 3× вместо 2×, масштабнее).
            tween(node)
                .to(0.12, { scale: new Vec3(1.3, 1.3, 1.3), angle: 10 }, { easing: 'sineOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1), angle: -10 }, { easing: 'sineIn' })
                .to(0.12, { scale: new Vec3(1.25, 1.25, 1.25), angle: 8 }, { easing: 'sineOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1), angle: -8 }, { easing: 'sineIn' })
                .to(0.12, { scale: new Vec3(1.2, 1.2, 1.2), angle: 5 }, { easing: 'sineOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1), angle: 0 }, { easing: 'sineIn' })
                .call(finish)
                .start();
        });
    }

    public getScatterCount(): number {
        return this.slotController?.getScatterResult()?.count ?? 0;
    }

    public getBalanceValue(): number {
        if (!this.balanceLabel) return 0;
        return parseFloat(this.balanceLabel.string) || 0;
    }

    public setBalanceValue(value: number): void {
        if (this.balanceLabel) {
            this.balanceLabel.string = `${Math.round(Math.max(0, value))}`;
        }
    }

    /** Плавно прибавить сумму к balance (короткий count-up для вау-эффекта pick'а). */
    public async addBalanceValue(delta: number): Promise<void> {
        if (!this.balanceLabel || delta <= 0) return;
        const from = parseFloat(this.balanceLabel.string) || 0;
        const to = from + delta;
        const durationSec = 0.6;
        const start = Date.now();
        const dur = durationSec * 1000;
        return new Promise<void>((resolve) => {
            const tick = () => {
                const t = Math.min((Date.now() - start) / dur, 1);
                const v = Math.round(from + (to - from) * t);
                this.balanceLabel.string = `${v}`;
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });
    }

    /** Умножить balance на multiplier (count-up для вау-эффекта множителя). */
    public async multiplyBalanceValue(multiplier: number): Promise<void> {
        if (!this.balanceLabel || multiplier <= 0) return;
        const from = parseFloat(this.balanceLabel.string) || 0;
        const to = Math.round(from * multiplier);
        const durationSec = 0.7;
        const start = Date.now();
        const dur = durationSec * 1000;
        return new Promise<void>((resolve) => {
            const tick = () => {
                const t = Math.min((Date.now() - start) / dur, 1);
                const v = Math.round(from + (to - from) * t);
                this.balanceLabel.string = `${v}`;
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });
    }

    public countBalanceTo(value: number, durationSeconds: number): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.balanceLabel) {
                resolve();
                return;
            }
            const from = parseFloat(this.balanceLabel.string) || 0;
            const start = Date.now();
            const dur = Math.max(durationSeconds, 0.001) * 1000;
            const tick = () => {
                const t = Math.min((Date.now() - start) / dur, 1);
                const v = Math.round(from + (value - from) * t);
                this.balanceLabel.string = `${v}`;
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });
    }
}
