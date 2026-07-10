import { _decorator, AudioClip, AudioSource, Component, Node, resources } from 'cc';
import plbx from '../../plbx_html/plbx_html_playable';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass } = _decorator;

type SaveTotoAudioCueKey =
    | 'backgroundAmbience'
    | 'happyMusic'
    | 'fireCrackle'
    | 'fireExtinguish'
    | 'dogBarking'
    | 'dogWhimper'
    | 'reelSpinLoop'
    | 'scatterBonusStinger'
    | 'basketOpen'
    | 'prizeChime'
    | 'keyTurnClick'
    | 'padlockSnap'
    | 'coinShower'
    | 'ctaJingle';

const AUDIO_PATHS: Record<SaveTotoAudioCueKey, string> = {
    backgroundAmbience: 'save-toto/audio/sfx/background_ambience',
    happyMusic: 'save-toto/audio/sfx/happy_music',
    fireCrackle: 'save-toto/audio/sfx/fire_crackle',
    fireExtinguish: 'save-toto/audio/sfx/fire_extinguish',
    dogBarking: 'save-toto/audio/sfx/dog_barking',
    dogWhimper: 'save-toto/audio/sfx/dog_whimper',
    reelSpinLoop: 'save-toto/audio/sfx/reel_spin_loop',
    scatterBonusStinger: 'save-toto/audio/sfx/scatter_bonus_stinger',
    basketOpen: 'save-toto/audio/sfx/basket_open',
    prizeChime: 'save-toto/audio/sfx/prize_chime',
    keyTurnClick: 'save-toto/audio/sfx/key_turn_click',
    padlockSnap: 'save-toto/audio/sfx/padlock_snap',
    coinShower: 'save-toto/audio/sfx/coin_shower',
    ctaJingle: 'save-toto/audio/sfx/cta_jingle',
};

const PRELOAD_AUDIO_KEYS: SaveTotoAudioCueKey[] = [
    'backgroundAmbience',
    'happyMusic',
    'fireCrackle',
    'fireExtinguish',
    'dogBarking',
    'dogWhimper',
    'reelSpinLoop',
    'scatterBonusStinger',
    'basketOpen',
    'prizeChime',
    'keyTurnClick',
    'padlockSnap',
    'coinShower',
    'ctaJingle',
];

@ccclass('SaveTotoAudioController')
export class SaveTotoAudioController extends Component {
    private logger = createSaveTotoLogger('SaveTotoAudioController');
    private musicSource: AudioSource = null!;
    private ambienceSource: AudioSource = null!;
    private reelSource: AudioSource = null!;
    private sfxSource: AudioSource = null!;
    private clipCache = new Map<SaveTotoAudioCueKey, AudioClip | null>();
    private clipLoads = new Map<SaveTotoAudioCueKey, Promise<AudioClip | null>>();
    private pendingTimers: Array<ReturnType<typeof setTimeout>> = [];
    private audioAllowed: boolean = true;
    private muted: boolean = false;
    private unlocked: boolean = false;
    private introRequested: boolean = false;
    private fireLoopRequested: boolean = false;
    private whimperLoopRequested: boolean = false;
    private barkingLoopRequested: boolean = false;
    private reelLoopRequested: boolean = false;

    public init(): void {
        this.ensureSources();
        this.audioAllowed = plbx.is_audio();
        this.muted = plbx.is_muted();
        this.preloadAudio();
        plbx.on_mute_change((muted) => {
            this.muted = muted;
            if (muted) {
                this.stopAllPlayback();
                return;
            }
            void this.syncLoopState();
        });
    }

    protected onDestroy(): void {
        this.clearPendingTimers();
        this.stopAllPlayback();
    }

    public notifyUserGesture(): void {
        this.unlocked = true;
        void this.syncLoopState();

        if (this.introRequested) {
            void this.playOneShot('dogWhimper', 0.6);
            this.startWhimperLoop();
            this.introRequested = false;
        }
    }

    public playIntroBed(): void {
        this.introRequested = true;
        this.fireLoopRequested = true;
        void this.syncLoopState();
    }

    public stopBackgroundMusic(): void {
        this.stopSource(this.musicSource);
    }

    public stopWhimperLoop(): void {
        this.whimperLoopRequested = false;
    }

    public stopBarkingLoop(): void {
        this.barkingLoopRequested = false;
    }

    public async playHappyMusic(): Promise<void> {
        if (!this.musicSource?.isValid) return;
        const clip = await this.loadClip('happyMusic');
        if (!clip || !this.musicSource?.isValid || !this.canPlayNow()) return;

        this.musicSource.stop();
        this.musicSource.clip = clip;
        this.musicSource.loop = true;
        this.musicSource.volume = 0.24;
        this.musicSource.play();
    }

    public playDogBarking(): void {
        this.stopWhimperLoop();
        if (this.barkingLoopRequested) return;
        this.barkingLoopRequested = true;
        void this.playOneShot('dogBarking', 1.15);
        void this.scheduleNextBarking();
    }

    public playSpinLoop(): void {
        this.reelLoopRequested = true;
        void this.syncLoopState();
    }

    public stopSpinLoop(): void {
        this.reelLoopRequested = false;
        this.stopSource(this.reelSource);
    }

    public stopThreatLoop(): void {
        this.fireLoopRequested = false;
        this.stopSource(this.ambienceSource);
    }

    public playScatterBonusStinger(): void {
        void this.playOneShot('scatterBonusStinger', 0.95);
    }

    public playBasketOpen(): void {
        void this.playOneShot('basketOpen', 0.9);
    }

    public playPrizeChime(): void {
        void this.playOneShot('prizeChime', 0.95);
    }

    public playUnlockSequence(): void {
        this.scheduleOneShot('keyTurnClick', 0.2, 0.9);
        this.scheduleOneShot('padlockSnap', 0.38, 0.95);
    }

    public playCoinShower(): void {
        void this.playOneShot('coinShower', 0.9);
    }

    public playFireExtinguish(): void {
        void this.playOneShot('fireExtinguish', 0.85);
    }

    public playCtaJingle(): void {
        void this.playOneShot('ctaJingle', 0.95);
    }

    public stopAll(): void {
        this.introRequested = false;
        this.fireLoopRequested = false;
        this.whimperLoopRequested = false;
        this.barkingLoopRequested = false;
        this.reelLoopRequested = false;
        this.clearPendingTimers();
        this.stopAllPlayback();
    }

    private ensureSources(): void {
        if (this.musicSource && this.ambienceSource && this.reelSource && this.sfxSource) {
            return;
        }

        this.musicSource = this.createSource('MusicSource', 0.18, true);
        this.ambienceSource = this.createSource('AmbienceSource', 0.28, true);
        this.reelSource = this.createSource('ReelSource', 0.45, true);
        this.sfxSource = this.createSource('SfxSource', 1, false);
    }

    private createSource(name: string, volume: number, loop: boolean): AudioSource {
        const sourceNode = new Node(name);
        this.node.addChild(sourceNode);
        const source = sourceNode.addComponent(AudioSource);
        source.volume = volume;
        source.loop = loop;
        source.playOnAwake = false;
        return source;
    }

    private async syncLoopState(): Promise<void> {
        if (!this.canPlayNow()) {
            return;
        }

        await this.ensureLoop('backgroundAmbience', this.musicSource, true, 0.18);
        await this.ensureLoop('fireCrackle', this.ambienceSource, this.fireLoopRequested, 0.28);
        await this.ensureLoop('reelSpinLoop', this.reelSource, this.reelLoopRequested, 0.45);
    }

    private async ensureLoop(key: SaveTotoAudioCueKey, source: AudioSource, shouldPlay: boolean, volume: number): Promise<void> {
        if (!source?.isValid) return;
        if (!shouldPlay) {
            this.stopSource(source);
            return;
        }

        const clip = await this.loadClip(key);
        if (!clip || !source?.isValid || !this.canPlayNow()) return;
        if (source.clip === clip && source.playing) return;

        source.stop();
        source.clip = clip;
        source.loop = true;
        source.volume = volume;
        source.play();
    }

    private async playOneShot(key: SaveTotoAudioCueKey, volumeScale: number = 1): Promise<void> {
        if (!this.canPlayNow()) return;
        const clip = await this.loadClip(key);
        if (!clip || !this.sfxSource?.isValid || !this.canPlayNow()) return;
        this.sfxSource.playOneShot(clip, volumeScale);
    }

    private scheduleOneShot(key: SaveTotoAudioCueKey, delaySeconds: number, volumeScale: number = 1): void {
        if (!this.audioAllowed || this.muted) return;
        const timer = setTimeout(() => {
            this.pendingTimers = this.pendingTimers.filter((item) => item !== timer);
            void this.playOneShot(key, volumeScale);
        }, delaySeconds * 1000);
        this.pendingTimers.push(timer);
    }

    private async loadClip(key: SaveTotoAudioCueKey): Promise<AudioClip | null> {
        if (this.clipCache.has(key)) {
            return this.clipCache.get(key) ?? null;
        }

        const existingLoad = this.clipLoads.get(key);
        if (existingLoad) {
            return existingLoad;
        }

        const loadPromise = new Promise<AudioClip | null>((resolve) => {
            resources.load(AUDIO_PATHS[key], AudioClip, (err, clip) => {
                if (err || !clip) {
                    this.logger.warn(`Audio clip load failed: ${key} (${AUDIO_PATHS[key]})`);
                    this.clipCache.set(key, null);
                    this.clipLoads.delete(key);
                    resolve(null);
                    return;
                }

                this.clipCache.set(key, clip);
                this.clipLoads.delete(key);
                resolve(clip);
            });
        });

        this.clipLoads.set(key, loadPromise);
        return loadPromise;
    }

    private canPlayNow(): boolean {
        return this.audioAllowed && !this.muted && this.unlocked;
    }

    private clearPendingTimers(): void {
        this.pendingTimers.forEach((timer) => clearTimeout(timer));
        this.pendingTimers = [];
    }

    private startWhimperLoop(): void {
        if (this.whimperLoopRequested) return;
        this.whimperLoopRequested = true;
        void this.scheduleNextWhimper();
    }

    private async scheduleNextWhimper(): Promise<void> {
        if (!this.whimperLoopRequested || !this.audioAllowed) return;

        const clip = await this.loadClip('dogWhimper');
        const clipDuration = Math.max(0, clip?.duration ?? 8.2);
        const delayMs = (clipDuration + 3) * 1000;

        const timer = setTimeout(() => {
            this.pendingTimers = this.pendingTimers.filter((item) => item !== timer);
            if (!this.whimperLoopRequested) return;
            void this.playOneShot('dogWhimper', 0.55);
            void this.scheduleNextWhimper();
        }, delayMs);

        this.pendingTimers.push(timer);
    }

    private async scheduleNextBarking(): Promise<void> {
        if (!this.barkingLoopRequested || !this.audioAllowed) return;

        const clip = await this.loadClip('dogBarking');
        const clipDuration = Math.max(0, clip?.duration ?? 1.12);
        const delayMs = (clipDuration + 2) * 1000;

        const timer = setTimeout(() => {
            this.pendingTimers = this.pendingTimers.filter((item) => item !== timer);
            if (!this.barkingLoopRequested) return;
            void this.playOneShot('dogBarking', 1.15);
            void this.scheduleNextBarking();
        }, delayMs);

        this.pendingTimers.push(timer);
    }

    private preloadAudio(): void {
        PRELOAD_AUDIO_KEYS.forEach((key) => {
            resources.preload(AUDIO_PATHS[key], AudioClip, (err) => {
                if (err) {
                    this.logger.warn(`Audio preload failed: ${key} (${AUDIO_PATHS[key]})`);
                }
            });
        });
    }

    private stopAllPlayback(): void {
        this.stopSource(this.musicSource);
        this.stopSource(this.ambienceSource);
        this.stopSource(this.reelSource);
        this.stopSource(this.sfxSource);
    }

    private stopSource(source: AudioSource | null): void {
        if (!source?.isValid) return;
        source.stop();
    }
}
