/**
 * Save Toto — контроллер кнопки SPIN (input-only).
 *
 * АДАПТАЦИЯ под state-machine-driven flow (ARCHITECTURE.md §12):
 *  - Контроллер НЕ драйвит slot и НЕ списывает спины.
 *  - На CLICK эмитит EVT_SPIN_CLICK на своей ноде (input → state).
 *  - State machine решает, принимать ли клик, и оркестрирует spin через SlotView.
 *  - Interactable управляется state machine через HudView.showSpinButton().
 *
 * Input lock на время spin/animation lock обеспечивает state machine
 * (выключает кнопку), а не этот контроллер.
 */

import { _decorator, Component, Button } from 'cc';
import { SaveTotoEvents } from '../events/SaveTotoEvents';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoSpinButtonController')
export class SaveTotoSpinButtonController extends Component {
    @property(Button)
    public spinButton: Button = null!;

    private logger = createSaveTotoLogger('SaveTotoSpinButtonController');

    onLoad(): void {
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this.onSpinButtonClick, this);
        }
    }

    onDestroy(): void {
        if (this.spinButton) {
            this.spinButton.node.off(Button.EventType.CLICK, this.onSpinButtonClick, this);
        }
    }

    private onSpinButtonClick(): void {
        if (!this.spinButton?.interactable) {
            return;
        }
        this.logger.debug('SPIN click');
        this.node.emit(SaveTotoEvents.EVT_SPIN_CLICK);
    }
}
