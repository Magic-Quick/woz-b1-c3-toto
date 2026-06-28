/**
 * Save Toto — компонент элемента слота (перенесён из slot-game/Slot/Elements/SlotElement.ts).
 * Хранит Sprite символа и его id (для scatter-определения).
 *
 * @ccclass 'SaveTotoSlotElement' — строковое имя используется в CentralizedElementSpawner
 * и WinAnimationManager; при переименовании обновить все getComponent('SaveTotoSlotElement').
 */

import { _decorator, Component, Sprite, CCInteger } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoSlotElement')
export class SaveTotoSlotElement extends Component {
    @property({ type: Sprite })
    public picture: Sprite = null!;

    @property({ type: CCInteger })
    public id: number = 0;
}
