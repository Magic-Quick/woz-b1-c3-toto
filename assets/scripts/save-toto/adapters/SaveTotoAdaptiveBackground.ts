/**
 * Save Toto — adaptive background: cover-fit во весь экран без чёрных полос.
 *
 * Подходит для portrait/landscape: масштабирует background так, чтобы покрыть
 * весь visible size (cover = max scale по ширине/высоте). При landscape высота
 * уходит за границы экрана (ratio не искажается). Слушает canvas-resize.
 *
 * Привязывается к BackgroundImage node.
 */
import { _decorator, Component, Node, view, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoAdaptiveBackground')
export class SaveTotoAdaptiveBackground extends Component {
    @property({ type: Node, tooltip: 'Background node (если не this.node)' })
    public targetNode: Node | null = null;

    private get target(): Node {
        return this.targetNode ?? this.node;
    }

    onLoad(): void {
        this.applyCover();
        view.on('canvas-resize', this.applyCover, this);
    }

    onDestroy(): void {
        view.off('canvas-resize', this.applyCover, this);
    }

    /** Cover-fit: scale = max(visW/bgW, visH/bgH). Ratio сохраняется. */
    public applyCover(): void {
        const node = this.target;
        if (!node || !node.isValid) return;
        const ut = node.getComponent(UITransform);
        if (!ut) return;
        const bgW = ut.width;
        const bgH = ut.height;
        if (bgW <= 0 || bgH <= 0) return;

        const vis = view.getVisibleSize();
        const scale = Math.max(vis.width / bgW, vis.height / bgH);
        node.setScale(new Vec3(scale, scale, 1));
        // Центрируем.
        node.setPosition(0, 0, 0);
    }
}
