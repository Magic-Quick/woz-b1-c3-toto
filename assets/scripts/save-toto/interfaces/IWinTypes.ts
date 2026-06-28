/** Конфигурация выигрышной линии (перенесён из slot-game template, pure type). */
export interface IWinLine {
    positions: [number, number][];
}

export interface IWinResult {
    lineIndex: number;
    elementId: number;
    matchCount: number;
    winValue: number;
}
