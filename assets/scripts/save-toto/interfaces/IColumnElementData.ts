import { Node } from 'cc';
import { IElementType, IVisibleElementsConfig } from './IElementType';

export interface IColumnElementData {
    elementTypes: IElementType[];
    elements: Node[];
    visibleConfig: IVisibleElementsConfig;
    totalElements: number;
    visibleElements: number;
    elementSpacing: number;
    startY: number;
    columnIndex: number;
}
