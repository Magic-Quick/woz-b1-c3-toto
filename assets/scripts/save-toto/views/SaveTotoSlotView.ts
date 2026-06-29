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
import { SaveTotoSlotElement } from '../Slot/Elements/SaveTotoSlotElement';
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

        const columns = this.slotController.columns;
        const promises: Promise<void>[] = [];

        for (const [colIndex, rowIndex] of result.positions) {
            const columnNode = columns[colIndex];
            if (!columnNode) continue;
            const elements = columnNode.children;
            const elementNode = elements[rowIndex];
            if (!elementNode) continue;
            const slotElement = elementNode.getComponent(SaveTotoSlotElement);
            if (slotElement?.picture) {
                promises.push(this.blinkScatter(elementNode));
            }
        }

        await Promise.all(promises);
    }

    /** Тройной мигающий pulse + light-вспышка под scatter-символом Тото. */
    private blinkScatter(node: Node): Promise<void> {
        return new Promise<void>((resolve) => {
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

            // Тройной scale-pulse символа.
            tween(node)
                .to(0.12, { scale: new Vec3(1.3, 1.3, 1.3) }, { easing: 'sineOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
                .to(0.12, { scale: new Vec3(1.25, 1.25, 1.25) }, { easing: 'sineOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
                .to(0.12, { scale: new Vec3(1.2, 1.2, 1.2) }, { easing: 'sineOut' })
                .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
                .call(() => resolve())
                .start();
        });
    }

    public getScatterCount(): number {
        return this.slotController?.getScatterResult()?.count ?? 0;
    }

    public setBalanceValue(value: number): void {
        if (this.balanceLabel) {
            this.balanceLabel.string = value <= 0 ? '' : `${Math.round(value)}`;
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
