/**
 * Save Toto — главный контроллер слота.
 *
 * DIAGNOSTIC 2026-06-29:
 * Добавлены info-логи для трассировки spin completion цепочки:
 * startAllColumnsMovement -> checkSpinCompletion -> onSpinComplete.
 */

import { _decorator, Component, Node, CCFloat, CCInteger } from 'cc';
import { SaveTotoSlotColumn } from './SaveTotoSlotColumn';
import { SaveTotoElementConfiguration } from './Elements/SaveTotoElementConfiguration';
import { IVisibleElementsConfig, IElementType } from '../interfaces/IElementType';
import { IWinResult } from '../interfaces/IWinTypes';
import { SaveTotoWinChecker } from './SaveTotoWinChecker';
import { SaveTotoScatterEvaluator, SaveTotoScatterResult } from './SaveTotoScatterEvaluator';
import { SaveTotoWinAnimationConfiguration } from './Animations/SaveTotoWinAnimationConfiguration';
import { SaveTotoWinAnimationManager } from './managers/SaveTotoWinAnimationManager';
import { SaveTotoCentralizedElementSpawner } from './Elements/SaveTotoCentralizedElementSpawner';
import { SaveTotoForcedSpawnManager } from './managers/SaveTotoForcedSpawnManager';
import { SaveTotoMovementEffectBehaviour } from './ScrollEffects/SaveTotoMovementEffectBehaviour';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

export interface SaveTotoSpinCompletePayload {
    visibleElements: IElementType[][];
    scatterSymbol: 'toto';
    scatterCount: number;
    scatterPositions: [number, number][];
    triggersBonus: boolean;
}

@ccclass('SaveTotoSlotController')
export class SaveTotoSlotController extends Component {
    private elementConfiguration: SaveTotoElementConfiguration = null;
    private winAnimationConfiguration: SaveTotoWinAnimationConfiguration = null;
    private columnMovementEffect: SaveTotoMovementEffectBehaviour = null;
    private forcedManagerNode: Node = null;

    @property({ type: [Node] })
    public columns: Node[] = [];

    @property({ type: CCFloat })
    public startIntervalSec: number = 0.1;

    @property({ type: CCInteger })
    public totalElementsPerColumn: number = 10;

    @property({ type: CCInteger })
    public defaultVisibleElementsCount: number = 3;

    @property({ type: CCFloat })
    public elementSpacing: number = 142;

    @property({ type: CCFloat })
    public startY: number = -142;

    private winChecker: SaveTotoWinChecker = new SaveTotoWinChecker();
    private scatterEvaluator: SaveTotoScatterEvaluator = new SaveTotoScatterEvaluator();
    private winAnimationManager: SaveTotoWinAnimationManager = null;
    private centralizedSpawner: SaveTotoCentralizedElementSpawner = null;
    private forcedSpawnManager: SaveTotoForcedSpawnManager = null;
    private currentSpinIndex: number = 0;
    private lastScatterResult: SaveTotoScatterResult = null;

    private logger = createSaveTotoLogger('SaveTotoSlotController');

    public setDependencies(
        elementConfiguration: SaveTotoElementConfiguration,
        winAnimationConfiguration?: SaveTotoWinAnimationConfiguration,
        columnMovementEffect?: SaveTotoMovementEffectBehaviour,
        forcedManagerNode?: Node
    ): void {
        this.elementConfiguration = elementConfiguration;
        this.winAnimationConfiguration = winAnimationConfiguration || null;
        this.columnMovementEffect = columnMovementEffect || null;
        this.forcedManagerNode = forcedManagerNode || null;
    }

    public initScatterEvaluator(scatterElementId: number, scatterRequired: number): void {
        this.scatterEvaluator.init(scatterElementId, scatterRequired);
    }

    protected start(): void {
        if (!this.elementConfiguration?.validateConfiguration()) return;

        this.elementConfiguration.totalElementsPerColumn = this.totalElementsPerColumn;
        this.elementConfiguration.defaultVisibleElementsCount = this.defaultVisibleElementsCount;
        this.winChecker.init(this.elementConfiguration.getAllElementTypes(), this.elementConfiguration);

        if (this.winAnimationConfiguration?.validateConfiguration()) {
            this.winAnimationManager = new SaveTotoWinAnimationManager(this.winAnimationConfiguration.getSettings());
        }

        this.centralizedSpawner = new SaveTotoCentralizedElementSpawner();
        this.centralizedSpawner.init(
            this.elementConfiguration.getAllElementTypes(),
            this.elementConfiguration.getAllBonusElementTypes(),
            this.columns.length
        );

        this.columns.forEach((columnNode, index) => {
            const slotColumn = columnNode.getComponent(SaveTotoSlotColumn);
            if (!slotColumn) return;

            slotColumn.initWithConfiguration(
                this.elementConfiguration.getAllElementTypes(),
                this.setupColumnConfig(index),
                this.getColumnTotalCount(index),
                this.elementSpacing,
                this.startY,
                this.elementConfiguration.getAllBonusElementTypes(),
                index,
                this.columns.length,
                this.columnMovementEffect,
                this.centralizedSpawner
            );

            columnNode.on(SaveTotoSlotEvents.COLUMN_MOVEMENT_COMPLETE, this.checkSpinCompletion, this);
        });

        const forcedManagerComp = this.forcedManagerNode
            ? this.forcedManagerNode.getComponent(SaveTotoForcedSpawnManager)
            : this.getComponent(SaveTotoForcedSpawnManager);
        this.forcedSpawnManager = forcedManagerComp || this.node.addComponent(SaveTotoForcedSpawnManager);
        this.forcedSpawnManager.setDependencies(this.winChecker, this.elementConfiguration, this.centralizedSpawner, this.columns);
    }

    private setupColumnConfig(columnIndex: number): IVisibleElementsConfig {
        const config = this.elementConfiguration.getVisibleElementsConfig(columnIndex);
        config.count = this.getColumnVisibleCount(columnIndex);
        return config;
    }

    public startAllColumnsMovement(): void {
        this.stopAllWinAnimations();
        this.resetAlphaChange();
        const targetSpin = this.currentSpinIndex + 1;
        this.logger.info(`startAllColumnsMovement spin=${targetSpin}`);
        this.forcedSpawnManager?.applyForSpin(targetSpin);
        this.node.emit(SaveTotoSlotEvents.SPIN_COMPLETE + '-started');
        this.columns.forEach((columnNode, index) => {
            const slotColumn = columnNode.getComponent(SaveTotoSlotColumn);
            if (slotColumn) {
                this.scheduleOnce(() => slotColumn.startColumnMovement(), Math.max(this.startIntervalSec, 0) * index);
            }
        });
    }

    public getAllVisibleElements(): IElementType[][] {
        return this.columns.map((_, index) =>
            this.centralizedSpawner?.getColumnFirstVisibleElementTypes(index) || []
        );
    }

    public stopAllColumns(): void {
        this.columns.forEach(columnNode => columnNode.getComponent(SaveTotoSlotColumn)?.stopColumnMovement());
        this.checkSpinCompletion();
    }

    private checkSpinCompletion(): void {
        const states = this.columns.map((col, idx) => ({ idx, moving: col.getComponent(SaveTotoSlotColumn)?.isColumnMoving() ?? false }));
        const allStopped = states.every(s => !s.moving);
        this.logger.info(`checkSpinCompletion allStopped=${allStopped} states=${JSON.stringify(states)}`);
        if (allStopped) {
            this.onSpinComplete();
        }
    }

    private onSpinComplete(): void {
        const visibleElements = this.getAllVisibleElements();
        this.lastScatterResult = this.scatterEvaluator.evaluate(visibleElements);
        this.logger.info(`onSpinComplete scatterCount=${this.lastScatterResult.count} triggersBonus=${this.lastScatterResult.triggersBonus}`);

        const winResults = this.winChecker.checkWinLines(visibleElements);
        if (winResults.length > 0) {
            this.animateWinElements(winResults);
            this.handleAlphaChange(winResults);
            const totalWinValue = winResults.reduce((sum, result) => sum + result.winValue, 0);
            this.node.emit(SaveTotoSlotEvents.WIN_DETECTED, winResults, totalWinValue);
        } else {
            this.resetAlphaChange();
        }

        const payload: SaveTotoSpinCompletePayload = {
            visibleElements,
            scatterSymbol: 'toto',
            scatterCount: this.lastScatterResult.count,
            scatterPositions: this.lastScatterResult.positions,
            triggersBonus: this.lastScatterResult.triggersBonus,
        };

        this.node.emit(SaveTotoSlotEvents.SPIN_COMPLETE, payload);
        this.currentSpinIndex += 1;
    }

    private animateWinElements(winResults: IWinResult[]): void {
        this.stopAllWinAnimations();
        winResults.forEach(winResult => {
            const positions = this.winChecker.getWinLinePositions(winResult.lineIndex)
                .slice(0, winResult.matchCount);

            positions.forEach(([colIndex, elemIndex]) => {
                const elementNode = this.getElementNode(this.columns[colIndex], elemIndex);
                if (elementNode) this.startWinAnimations(elementNode);
            });
        });
    }

    private getElementNode(columnNode: Node, elementIndex: number): Node | null {
        const columnIndex = this.columns.indexOf(columnNode);
        if (columnIndex === -1) return null;

        const elements = this.centralizedSpawner?.getColumnElements(columnIndex);
        return elements?.[elementIndex] || null;
    }

    private startWinAnimations(elementNode: Node): void {
        if (this.winAnimationManager) {
            this.winAnimationManager.startAnimationsForElement(elementNode);
        }
    }

    private stopAllWinAnimations(): void {
        if (this.winAnimationManager) {
            this.winAnimationManager.stopAllAnimations();
        }
    }

    private getColumnVisibleCount(_columnIndex: number): number {
        return this.defaultVisibleElementsCount;
    }

    private getColumnTotalCount(_columnIndex: number): number {
        return this.totalElementsPerColumn;
    }

    private getAllVisibleElementNodes(): Node[] {
        const allElements: Node[] = [];
        this.columns.forEach((_, index) => {
            const elements = this.centralizedSpawner?.getColumnElements(index);
            if (elements) {
                allElements.push(...elements);
            }
        });
        return allElements;
    }

    private getWinElementNodes(winResults: IWinResult[]): Node[] {
        const winElements: Node[] = [];
        winResults.forEach(winResult => {
            const positions = this.winChecker.getWinLinePositions(winResult.lineIndex)
                .slice(0, winResult.matchCount);

            positions.forEach(([colIndex, elemIndex]) => {
                const elementNode = this.getElementNode(this.columns[colIndex], elemIndex);
                if (elementNode) {
                    winElements.push(elementNode);
                }
            });
        });
        return winElements;
    }

    private handleAlphaChange(winResults: IWinResult[]): void {
        if (this.winAnimationManager) {
            const allElements = this.getAllVisibleElementNodes();
            this.winAnimationManager.handleWinResults(winResults, allElements, this.getWinElementNodes.bind(this));
        }
    }

    private resetAlphaChange(): void {
        if (this.winAnimationManager) {
            const allElements = this.getAllVisibleElementNodes();
            this.winAnimationManager.resetAllElementsAlpha(allElements);
        }
    }

    public getScatterResult(): SaveTotoScatterResult {
        return this.lastScatterResult;
    }

    public getAllBonusElements(): IElementType[][] {
        return this.centralizedSpawner?.getAllBonusElements() || [];
    }

    public getTotalBonusCount(): number {
        return this.centralizedSpawner?.getTotalBonusCount() || 0;
    }

    public hasBonusElements(): boolean {
        return this.centralizedSpawner?.hasBonusElements() || false;
    }

    public getBonusElementsByType(type: 'scatter' | 'wild' | 'all'): IElementType[][] {
        return this.centralizedSpawner?.getBonusElementsByType(type) || [];
    }

    public getBonusSpawnProbability(bonusId: number): number {
        return this.centralizedSpawner?.getBonusSpawnProbability(bonusId) || 0;
    }

    public validateBonusConfiguration(): boolean {
        return this.centralizedSpawner?.validateBonusConfiguration() || false;
    }
}
