/**
 * Save Toto — базовый контроллер значения с Label (перенесён из slot-game/core/BaseValueController.ts).
 * База для SaveTotoSpinsController и SaveTotoRewardController.
 */

import { _decorator, Component, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBaseValueController')
export abstract class SaveTotoBaseValueController extends Component {
    @property(Label)
    protected valueLabel: Label = null!;

    @property({ tooltip: 'Начальное значение' })
    protected initialValue: number = 0;

    protected currentValue: number = 0;

    protected abstract getDisplayPrefix(): string;

    protected abstract getDisplaySuffix(): string;

    protected abstract getUpdateEventName(): string;

    onLoad() {
        this.currentValue = this.initialValue;
        this.updateValueDisplay(this.currentValue);
    }

    protected updateValueDisplay(value: number): void {
        if (this.valueLabel && this.valueLabel.isValid) {
            const displayValue = Math.round(value);
            this.valueLabel.string = `${this.getDisplayPrefix()}${displayValue}${this.getDisplaySuffix()}`;
        }
    }

    protected emitValueUpdated(): void {
        this.node.emit(this.getUpdateEventName(), this.currentValue);
    }

    public getCurrentValue(): number {
        return this.currentValue;
    }

    public setValue(value: number): void {
        this.currentValue = Math.max(0, value);
        this.updateValueDisplay(this.currentValue);
        this.emitValueUpdated();
    }

    public addValue(amount: number): void {
        this.currentValue += amount;
        this.updateValueDisplay(this.currentValue);
        this.emitValueUpdated();
    }

    public subtractValue(amount: number): void {
        this.currentValue = Math.max(0, this.currentValue - amount);
        this.updateValueDisplay(this.currentValue);
        this.emitValueUpdated();
    }

    public resetValue(): void {
        this.currentValue = 0;
        this.updateValueDisplay(this.currentValue);
        this.emitValueUpdated();
    }
}
