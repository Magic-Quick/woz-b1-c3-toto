/**
 * Save Toto — store redirect adapter (OI-004).
 *
 * Изолирует CTA-redirect от gameplay. Использует Playbox/network API
 * (`plbx_html_playable.download()`), при отсутствии — fallback на window.open.
 * Повторные клики не создают дублей (EXPORT_CHECKLIST.md §1).
 *
 * `.meta` создаёт Cocos; не зависит от `.plbx/reference/**`.
 */

import { createSaveTotoLogger } from '../common/SaveTotoLogger';

declare const plbx_html_playable: any;

export type SaveTotoStorePlatform = 'ios' | 'android' | 'unknown';

export class SaveTotoStoreAdapter {
    private redirected: boolean = false;
    private iosUrl?: string;
    private androidUrl?: string;
    private logger = createSaveTotoLogger('SaveTotoStoreAdapter');

    constructor(opts?: { iosUrl?: string; androidUrl?: string }) {
        this.iosUrl = opts?.iosUrl;
        this.androidUrl = opts?.androidUrl;
    }

    /** Признак того, что redirect уже выполнен. */
    public hasRedirected(): boolean {
        return this.redirected;
    }

    /** Сбросить флаг redirect (для restart/тестов). */
    public reset(): void {
        this.redirected = false;
    }

    /**
     * Выполнить store redirect. Идемпотентен: повторные вызовы игнорируются.
     * Возвращает true, если redirect был выполнен в этом вызове.
     */
    public redirect(platform?: SaveTotoStorePlatform): boolean {
        if (this.redirected) {
            return false;
        }

        // Приоритет: Playbox network API.
        if (typeof plbx_html_playable !== 'undefined' && typeof plbx_html_playable.download === 'function') {
            try {
                plbx_html_playable.download();
                this.redirected = true;
                return true;
            } catch (e) {
                this.logger.warn(`Playbox download failed: ${e}`);
            }
        }

        // Fallback: platform-specific URL.
        const url = this.resolveUrl(platform);
        if (url && typeof window !== 'undefined' && typeof window.open === 'function') {
            try {
                window.open(url, '_blank');
                this.redirected = true;
                return true;
            } catch (e) {
                this.logger.warn(`window.open failed: ${e}`);
            }
        }

        this.logger.warn('No redirect path available');
        return false;
    }

    private resolveUrl(platform?: SaveTotoStorePlatform): string | undefined {
        const detected = platform || this.detectPlatform();
        if (detected === 'ios' && this.iosUrl) return this.iosUrl;
        if (detected === 'android' && this.androidUrl) return this.androidUrl;
        return this.iosUrl || this.androidUrl;
    }

    private detectPlatform(): SaveTotoStorePlatform {
        if (typeof navigator === 'undefined' || !navigator.userAgent) return 'unknown';
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) return 'ios';
        if (/android/.test(ua)) return 'android';
        return 'unknown';
    }
}
