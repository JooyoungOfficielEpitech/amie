"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// 간단한 로깅 유틸리티
class Logger {
    constructor() {
        this.debugEnabled = process.env.NODE_ENV !== 'production';
    }
    info(message, ...args) {
        console.log(`[INFO] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
    debug(message, ...args) {
        if (this.debugEnabled) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
}
exports.logger = new Logger();
