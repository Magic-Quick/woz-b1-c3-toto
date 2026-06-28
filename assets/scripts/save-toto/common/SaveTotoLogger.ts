/**
 * Save Toto — система логирования (перенесена из slot-game/common/Logger.ts).
 * Plain-класс без ccclass; контекстная обёртка над console.
 */

export enum LogLevel {
    None = 0,
    Error = 1,
    Warn = 2,
    Info = 3,
    Debug = 4
}

export class SaveTotoLogger {
    private static currentLevel: LogLevel = LogLevel.Info;
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    static setLogLevel(level: LogLevel): void {
        SaveTotoLogger.currentLevel = level;
    }

    static getLogLevel(): LogLevel {
        return SaveTotoLogger.currentLevel;
    }

    private formatMessage(...args: any[]): string {
        return `[${this.context}] ${args.join(' ')}`;
    }

    public debug(...args: any[]): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Debug) {
            console.log(this.formatMessage(...args));
        }
    }

    public info(...args: any[]): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Info) {
            console.log(this.formatMessage(...args));
        }
    }

    public warn(...args: any[]): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Warn) {
            console.warn(this.formatMessage(...args));
        }
    }

    public error(...args: any[]): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Error) {
            console.error(this.formatMessage(...args));
        }
    }

    public success(message: string): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Info) {
            console.log(`${this.formatMessage('✓', message)}`);
        }
    }

    public failure(message: string): void {
        if (SaveTotoLogger.currentLevel >= LogLevel.Error) {
            console.error(`${this.formatMessage('❌', message)}`);
        }
    }
}

export function createSaveTotoLogger(context: string): SaveTotoLogger {
    return new SaveTotoLogger(context);
}
