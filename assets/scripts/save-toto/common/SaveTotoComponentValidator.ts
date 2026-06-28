/**
 * Save Toto — валидатор компонентов (перенесён из slot-game/common/ComponentValidator.ts).
 * Используется SaveTotoBootstrap для проверки serialized wiring.
 */

import { Component } from 'cc';
import { SaveTotoLogger } from './SaveTotoLogger';

export class SaveTotoComponentValidator {
    private logger: SaveTotoLogger;
    private errors: string[] = [];

    constructor(context: string) {
        this.logger = new SaveTotoLogger(context);
    }

    public validate<T extends Component>(
        component: T | null,
        name: string,
        required: boolean = true
    ): boolean {
        if (!component) {
            const message = `${name} не назначен!`;
            if (required) {
                this.logger.failure(message);
                this.errors.push(message);
                return false;
            } else {
                this.logger.warn(`⚠️ ${message}`);
                return false;
            }
        }

        this.logger.success(`${name} назначен`);
        return true;
    }

    public validateArray<T extends Component>(
        components: T[],
        name: string,
        minLength: number = 1
    ): boolean {
        if (!components || components.length < minLength) {
            const message = `${name} должен содержать минимум ${minLength} элемент(ов)`;
            this.logger.failure(message);
            this.errors.push(message);
            return false;
        }

        this.logger.success(`${name} содержит ${components.length} элемент(ов)`);
        return true;
    }

    public getErrors(): string[] {
        return [...this.errors];
    }

    public hasErrors(): boolean {
        return this.errors.length > 0;
    }

    public clearErrors(): void {
        this.errors = [];
    }

    public printReport(): void {
        if (this.hasErrors()) {
            this.logger.error('Валидация завершилась с ошибками:');
            this.errors.forEach(error => this.logger.error(`  - ${error}`));
        } else {
            this.logger.success('Валидация прошла успешно');
        }
    }
}
