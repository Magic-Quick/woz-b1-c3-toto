/** Правило принудительного спавна по линии (template-формат; Save Toto использует cell-формат). */
export interface IForcedRule {
    spin: number;
    line: number;
    count: number;
    elementId: number;
}

/**
 * Правило принудительного спавна по явным позициям ячеек [columnIndex, rowIndex].
 * Соответствие OI-403: нужен scripted visible result map, не только line forced rules.
 */
export interface ISaveTotoForcedCellRule {
    spin: number;
    /** Явные позиции [col, row], в которые форсируется elementId. */
    cells: [number, number][];
    elementId: number;
}
