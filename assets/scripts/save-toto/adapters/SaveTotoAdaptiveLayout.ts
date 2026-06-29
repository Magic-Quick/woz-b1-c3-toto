/**
 * Save Toto — adaptive layout для landscape mode.
 *
 * В пейзаже (width > height):
 * - масштабирует игровые слои (Threat/Slot/Hud/Fx) для заполнения экрана
 * - логотип → влево
 * - SpinButton → вправо
 * В portrait — сброс к исходным значениям.
 *
 * Привязывается к Canvas. Слушает canvas-resize.
 * Все offsets/scale — настраиваемые @property для тюнинга в Inspector.
 */
import { _decorator, Component, Node, view, Vec3, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoAdaptiveLayout')
export class SaveTotoAdaptiveLayout extends Component {
    @property({ type: Node, tooltip: 'Слои для масштабирования в landscape' })
    public gameLayers: Node[] = [];

    @property(Node)
    public logoNode: Node | null = null;

    @property(Node)
    public spinButtonNode: Node | null = null;

    @property({ type: CCFloat, tooltip: 'Scale игровых слоёв в landscape' })
    public landscapeScale: number = 1.4;

    @property({ type: CCFloat, tooltip: 'Позиция логотипа по X в landscape (от центра)' })
    public landscapeLogoX: number = -700;

    @property({ type: CCFloat, tooltip: 'Позиция логотипа по Y в landscape' })
    public landscapeLogoY: number = 0;

    @property({ type: CCFloat, tooltip: 'Scale логотипа в landscape' })
    public landscapeLogoScale: number = 1.3;

    @property({ type: CCFloat, tooltip: 'Позиция SpinButton по X в landscape (от центра)' })
    public landscapeSpinX: number = 650;

    @property({ type: CCFloat, tooltip: 'Позиция SpinButton по Y в landscape' })
    public landscapeSpinY: number = 0;

    @property({ type: CCFloat, tooltip: 'Scale SpinButton в landscape' })
    public landscapeSpinScale: number = 0.8;

    @property({ type: [Node], tooltip: 'Корзины для перестановки в один ряд в landscape' })
    public basketNodes: Node[] = [];

    @property(Node)
    public basketGrid: Node | null = null;

    @property({ type: CCFloat, tooltip: 'Шаг между корзинами в landscape (один ряд)' })
    public landscapeBasketSpacing: number = 290;

    @property({ type: CCFloat, tooltip: 'Y корзин в landscape' })
    public landscapeBasketY: number = 0;

    @property({ type: CCFloat, tooltip: 'Y BasketGrid в landscape' })
    public landscapeBasketGridY: number = 0;

    // Исходные значения для restoration.
    private portraitScales: Map<Node, Vec3> = new Map();
    private portraitLogoPos: Vec3 = new Vec3(0, 0, 0);
    private portraitLogoScale: Vec3 = new Vec3(1, 1, 1);
    private portraitSpinPos: Vec3 = new Vec3(0, 0, 0);
    private portraitSpinScale: Vec3 = new Vec3(1, 1, 1);
    private portraitBasketPositions: Vec3[] = [];
    private portraitBasketGridPos: Vec3 = new Vec3(0, -100, 0);
    private captured = false;

    onLoad(): void {
        this.capturePortraitValues();
        this.applyLayout();
        view.on('canvas-resize', this.applyLayout, this);
    }

    onDestroy(): void {
        view.off('canvas-resize', this.applyLayout, this);
    }

    private capturePortraitValues(): void {
        if (this.captured) return;
        for (const layer of this.gameLayers) {
            if (layer) this.portraitScales.set(layer, layer.scale.clone());
        }
        if (this.logoNode) {
            this.portraitLogoPos = this.logoNode.position.clone();
            this.portraitLogoScale = this.logoNode.scale.clone();
        }
        if (this.spinButtonNode) {
            this.portraitSpinPos = this.spinButtonNode.position.clone();
            this.portraitSpinScale = this.spinButtonNode.scale.clone();
        }
        for (const basket of this.basketNodes) {
            if (basket) this.portraitBasketPositions.push(basket.position.clone());
        }
        if (this.basketGrid) {
            this.portraitBasketGridPos = this.basketGrid.position.clone();
        }
        this.captured = true;
    }

    private isLandscape(): boolean {
        const vis = view.getVisibleSize();
        return vis.width > vis.height;
    }

    public applyLayout(): void {
        if (!this.captured) this.capturePortraitValues();
        const landscape = this.isLandscape();
        const s = landscape ? this.landscapeScale : 1;

        for (const layer of this.gameLayers) {
            if (layer) layer.setScale(new Vec3(s, s, 1));
        }

        if (this.logoNode) {
            if (landscape) {
                this.logoNode.setPosition(this.landscapeLogoX, this.landscapeLogoY, 0);
                this.logoNode.setScale(new Vec3(this.landscapeLogoScale, this.landscapeLogoScale, 1));
            } else {
                this.logoNode.setPosition(this.portraitLogoPos);
                this.logoNode.setScale(this.portraitLogoScale);
            }
        }

        if (this.spinButtonNode) {
            if (landscape) {
                this.spinButtonNode.setPosition(this.landscapeSpinX, this.landscapeSpinY, 0);
                this.spinButtonNode.setScale(new Vec3(this.landscapeSpinScale, this.landscapeSpinScale, 1));
            } else {
                this.spinButtonNode.setPosition(this.portraitSpinPos);
                this.spinButtonNode.setScale(this.portraitSpinScale);
            }
        }

        // Корзины: в landscape — один ряд, в portrait — исходная раскладка 3×2.
        if (this.basketGrid) {
            if (landscape) {
                this.basketGrid.setPosition(0, this.landscapeBasketGridY, 0);
            } else {
                this.basketGrid.setPosition(this.portraitBasketGridPos);
            }
        }
        const count = this.basketNodes.length;
        for (let i = 0; i < count; i++) {
            const basket = this.basketNodes[i];
            if (!basket) continue;
            if (landscape) {
                // Распределить по центру: x от -(count-1)/2 * spacing до +(count-1)/2 * spacing.
                const x = (i - (count - 1) / 2) * this.landscapeBasketSpacing;
                basket.setPosition(x, this.landscapeBasketY, 0);
            } else {
                const orig = this.portraitBasketPositions[i];
                if (orig) basket.setPosition(orig);
            }
        }
    }
}
