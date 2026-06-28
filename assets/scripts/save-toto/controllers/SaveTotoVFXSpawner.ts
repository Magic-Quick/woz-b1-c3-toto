/**
 * Save Toto — спавнер VFX по порогам награды (перенесён из slot-game/controllers/VFXSpawner.ts).
 * @ccclass переименованы → SaveTotoVFXSpawnEntry, SaveTotoVFXSpawner.
 */

import { _decorator, Component, Prefab, instantiate, Node, CCInteger } from 'cc';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoVFXSpawnEntry')
export class SaveTotoVFXSpawnEntry {
    @property({ type: CCInteger })
    public rewardAmount: number = 0;

    @property({ type: Prefab })
    public vfxPrefab: Prefab = null!;

    @property({ type: Node })
    public spawnPosition: Node = null!;
}

@ccclass('SaveTotoVFXSpawner')
export class SaveTotoVFXSpawner extends Component {
    @property({ type: [SaveTotoVFXSpawnEntry] })
    private vfxEntries: SaveTotoVFXSpawnEntry[] = [];

    private logger = createSaveTotoLogger('SaveTotoVFXSpawner');

    public trySpawnVFX(rewardAmount: number): void {
        const sortedEntries = [...this.vfxEntries].sort((a, b) => b.rewardAmount - a.rewardAmount);

        for (const entry of sortedEntries) {
            if (rewardAmount >= entry.rewardAmount) {
                this.spawnVFX(entry);
                return;
            }
        }
    }

    private spawnVFX(entry: SaveTotoVFXSpawnEntry): void {
        if (!entry.vfxPrefab) {
            this.logger.error(`VFX префаб не назначен для rewardAmount: ${entry.rewardAmount}`);
            return;
        }

        if (!entry.spawnPosition) {
            this.logger.error(`SpawnPosition не назначена для rewardAmount: ${entry.rewardAmount}`);
            return;
        }

        const vfxInstance = instantiate(entry.vfxPrefab);
        if (vfxInstance) {
            entry.spawnPosition.addChild(vfxInstance);
        } else {
            this.logger.error(`Не удалось создать VFX для rewardAmount: ${entry.rewardAmount}`);
        }
    }
}
