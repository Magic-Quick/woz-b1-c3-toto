import { Prefab } from 'cc';

/** Контракт типа элемента слота (перенесён из slot-game template, pure type). */
export interface IElementType {
    id: number;
    prefab: Prefab;
    weight: number;
    value: number;
}

export interface IVisibleElementsConfig {
    count: number;
    specificElements?: IElementType[];
    useRandomization?: boolean;
}

export interface IBonusElementType {
    id: number;
    prefab: Prefab;
    weight: number;
    value: number;
    isScatter: boolean;
    isWild: boolean;
    maxCountPerColumn: number;
    maxColumnsCount: number;
}
