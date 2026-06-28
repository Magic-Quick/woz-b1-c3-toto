import { IBonusElementType } from './IElementType';

export interface IBonusSpawnResult {
    bonusElements: IBonusElementType[];
    spawnPositions: number[];
    totalColumnsUsed: number;
}

export interface IBonusSpawnConfig {
    maxAttempts: number;
    allowOverlap: boolean;
    prioritizeRareBonuses: boolean;
}
