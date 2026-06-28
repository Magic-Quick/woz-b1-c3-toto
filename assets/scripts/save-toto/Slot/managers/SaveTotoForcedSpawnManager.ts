/**
 * Save Toto — менеджер принудительного спавна (адаптирован из slot-game/Slot/managers/ForcedSpawnManager.ts).
 *
 * АДАПТАЦИЯ (OI-403): добавлены cell-based правила (ISaveTotoForcedCellRule) для scripted
 * visible result map — гарантия 3 scatter Тото в явно заданных позициях.
 * Сохранены line-based правила (IForcedRule) для совместимости.
 *
 * Удалён мёртвый слушатель 'before-spin' (никто не эмитил); applyForSpin вызывается
 * напрямую из SaveTotoSlotController.startAllColumnsMovement().
 */

import { _decorator, Component, Node, CCInteger } from 'cc';
import { IElementType } from '../../interfaces/IElementType';
import { IForcedRule, ISaveTotoForcedCellRule } from '../../interfaces/IForcedRule';
import { SaveTotoElementConfiguration } from '../Elements/SaveTotoElementConfiguration';
import { SaveTotoWinChecker } from '../SaveTotoWinChecker';
import { SaveTotoCentralizedElementSpawner } from '../Elements/SaveTotoCentralizedElementSpawner';

const { ccclass, property } = _decorator;

export type { IForcedRule, ISaveTotoForcedCellRule };

@ccclass('SaveTotoForcedRule')
export class SaveTotoForcedRule {
    @property({ type: CCInteger })
    public spin: number = 1;

    @property({ type: CCInteger })
    public line: number = 0;

    @property({ type: CCInteger })
    public count: number = 3;

    @property({ type: CCInteger })
    public elementId: number = 0;
}

@ccclass('SaveTotoForcedSpawnManager')
export class SaveTotoForcedSpawnManager extends Component {
    private winChecker: SaveTotoWinChecker;
    private elementConfiguration: SaveTotoElementConfiguration;
    private centralizedSpawner: SaveTotoCentralizedElementSpawner;
    private columns: Node[];

    @property({ type: [SaveTotoForcedRule] })
    public rulesInspector: SaveTotoForcedRule[] = [];

    @property({ tooltip: 'Предотвращать случайные выигрыши на линиях не указанных в правилах' })
    public preventRandomWins: boolean = false;

    /** Cell-based правила (scripted visible result map). */
    private cellRules: ISaveTotoForcedCellRule[] = [];

    public setDependencies(
        winChecker: SaveTotoWinChecker,
        elementConfiguration: SaveTotoElementConfiguration,
        centralizedSpawner: SaveTotoCentralizedElementSpawner,
        columns: Node[]
    ): void {
        this.winChecker = winChecker;
        this.elementConfiguration = elementConfiguration;
        this.centralizedSpawner = centralizedSpawner;
        this.columns = columns;
    }

    public setRules(rules: IForcedRule[]): void {
        this.rulesInspector = Array.isArray(rules) ? rules.map(r => {
            const fr = new SaveTotoForcedRule();
            fr.spin = r.spin;
            fr.line = r.line;
            fr.count = r.count;
            fr.elementId = r.elementId;
            return fr;
        }) : [];
    }

    /** Установить cell-based правила для scripted scatter/visible result. */
    public setCellRules(rules: ISaveTotoForcedCellRule[]): void {
        this.cellRules = Array.isArray(rules) ? rules : [];
    }

    public hasRulesForSpin(spinNumber: number): boolean {
        const hasLineRules = this.rulesInspector.some(r => r.spin === spinNumber);
        const hasCellRules = this.cellRules.some(r => r.spin === spinNumber);
        return hasLineRules || hasCellRules;
    }

    public applyForSpin(spinNumber: number): void {
        if (!this.centralizedSpawner || !this.elementConfiguration) return;

        this.applyCellRules(spinNumber);
        this.applyLineRules(spinNumber);

        if (this.preventRandomWins) {
            const allTypes = this.elementConfiguration.getAllElementTypes();
            this.breakUnwantedWinLines(spinNumber, allTypes);
        }
    }

    private applyCellRules(spinNumber: number): void {
        const rulesForSpin = this.cellRules.filter(r => r.spin === spinNumber);
        if (rulesForSpin.length === 0) return;

        const typeById = this.buildTypeByIdMap();

        for (const rule of rulesForSpin) {
            const forcedType = typeById.get(rule.elementId);
            if (!forcedType) continue;

            for (const [colIndex, rowIndex] of rule.cells) {
                if (colIndex < 0 || colIndex >= this.columns.length) continue;
                const columnNode = this.columns[colIndex];
                const upcomingVisible = this.centralizedSpawner.getColumnVisibleElementTypes(colIndex);
                if (!upcomingVisible || upcomingVisible.length === 0) continue;
                if (rowIndex < 0 || rowIndex >= upcomingVisible.length) continue;

                const replaced = upcomingVisible.slice();
                replaced[rowIndex] = forcedType;
                this.centralizedSpawner.setColumnVisibleElements(colIndex, replaced, columnNode);
            }
        }
    }

    private applyLineRules(spinNumber: number): void {
        if (!this.rulesInspector || this.rulesInspector.length === 0) return;
        if (!this.winChecker) return;

        const rulesForSpin = this.rulesInspector.filter(r => r.spin === spinNumber);
        if (rulesForSpin.length === 0) return;

        const typeById = this.buildTypeByIdMap();

        rulesForSpin.forEach(rule => {
            const positions = this.winChecker.getWinLinePositions(rule.line);
            const applyCount = Math.min(rule.count, positions.length, this.columns.length);
            for (let i = 0; i < applyCount; i++) {
                const [colIndex, rowIndex] = positions[i];
                if (colIndex < 0 || colIndex >= this.columns.length) continue;
                const columnNode = this.columns[colIndex];
                const upcomingVisible = this.centralizedSpawner.getColumnVisibleElementTypes(colIndex);
                if (!upcomingVisible || upcomingVisible.length === 0) continue;
                if (rowIndex < 0 || rowIndex >= upcomingVisible.length) continue;
                const forcedType = typeById.get(rule.elementId);
                if (!forcedType) continue;
                const replaced = upcomingVisible.slice();
                replaced[rowIndex] = forcedType;
                this.centralizedSpawner.setColumnVisibleElements(colIndex, replaced, columnNode);
            }
        });
    }

    private buildTypeByIdMap(): Map<number, IElementType> {
        const typeById = new Map<number, IElementType>();
        const allTypes = this.elementConfiguration.getAllElementTypes();
        allTypes.forEach(t => typeById.set(t.id, t));
        const bonusTypes = this.elementConfiguration.getAllBonusElementTypes();
        bonusTypes.forEach(t => typeById.set(t.id, t));
        return typeById;
    }

    private breakUnwantedWinLines(spinNumber: number, allTypes: IElementType[]): void {
        if (!this.winChecker || !this.centralizedSpawner) return;

        const forcedRules = this.rulesInspector.filter(r => r.spin === spinNumber);
        const forcedLineIndices = forcedRules.map(r => r.line);
        const wildIds = this.winChecker.getWildSymbolIds();
        const validTypes = allTypes.filter(t => t.weight > 0 && wildIds.indexOf(t.id) === -1);
        if (validTypes.length < 2) return;

        const maxIterations = 10;
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const visibleElements = this.columns.map((_, colIndex) =>
                this.centralizedSpawner.getColumnVisibleElementTypes(colIndex)
            );

            const winResults = this.winChecker.checkWinLines(visibleElements);
            const unwantedWins = winResults.filter(w => forcedLineIndices.indexOf(w.lineIndex) === -1);

            if (unwantedWins.length === 0) break;

            for (const unwantedWin of unwantedWins) {
                const positions = this.winChecker.getWinLinePositions(unwantedWin.lineIndex);
                if (positions.length === 0) continue;

                const posToBreak = this.findSafePositionToBreak(positions, forcedRules, unwantedWin.elementId);
                if (!posToBreak) continue;

                const [colIndex, rowIndex] = posToBreak;
                const columnNode = this.columns[colIndex];
                const currentVisible = this.centralizedSpawner.getColumnVisibleElementTypes(colIndex);
                if (!currentVisible || rowIndex >= currentVisible.length) continue;

                const currentId = currentVisible[rowIndex]?.id;
                const winningId = unwantedWin.elementId;
                const differentTypes = validTypes.filter(t => t.id !== currentId && t.id !== winningId);
                if (differentTypes.length === 0) continue;

                const randomIndex = Math.floor(Math.random() * differentTypes.length);
                const newType = differentTypes[randomIndex];

                const replaced = currentVisible.slice();
                replaced[rowIndex] = newType;
                this.centralizedSpawner.setColumnVisibleElements(colIndex, replaced, columnNode);
            }
        }
    }

    private findSafePositionToBreak(positions: [number, number][], forcedRules: SaveTotoForcedRule[], winningElementId: number): [number, number] | null {
        const forcedPositions = new Set<string>();

        for (const rule of forcedRules) {
            const rulePositions = this.winChecker.getWinLinePositions(rule.line);
            const applyCount = Math.min(rule.count, rulePositions.length, this.columns.length);
            for (let i = 0; i < applyCount; i++) {
                const [col, row] = rulePositions[i];
                forcedPositions.add(`${col},${row}`);
            }
        }

        const wildIds = this.winChecker.getWildSymbolIds();

        for (const pos of positions) {
            const key = `${pos[0]},${pos[1]}`;
            if (forcedPositions.has(key)) continue;

            const [colIndex, rowIndex] = pos;
            const currentVisible = this.centralizedSpawner.getColumnVisibleElementTypes(colIndex);
            if (!currentVisible || rowIndex >= currentVisible.length) continue;

            const elementId = currentVisible[rowIndex]?.id;
            if (wildIds.indexOf(elementId) !== -1) continue;

            return pos;
        }

        return null;
    }
}
