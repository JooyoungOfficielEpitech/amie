"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleBatchMatching = scheduleBatchMatching;
exports.startAllScheduledJobs = startAllScheduledJobs;
exports.stopAllScheduledJobs = stopAllScheduledJobs;
exports.initScheduler = initScheduler;
const cron = __importStar(require("node-cron"));
const logger_1 = require("../utils/logger");
const matching_service_1 = require("./matching.service");
// 예약된 작업 저장
const scheduledJobs = {};
// 배치 매칭 작업 스케줄링 (10초마다 실행)
function scheduleBatchMatching() {
    const jobName = 'batch-matching';
    // 이미 스케줄된 작업이 있으면 중지
    if (scheduledJobs[jobName]) {
        scheduledJobs[jobName].stop();
        delete scheduledJobs[jobName];
    }
    // 새 작업 스케줄링 (매 10초마다)
    const job = cron.schedule('*/10 * * * * *', async () => {
        logger_1.logger.info('배치 매칭 스케줄러 실행 중...');
        try {
            const result = await (0, matching_service_1.processBatchMatching)();
            logger_1.logger.info(`배치 매칭 완료: ${result.matches}개 매칭 생성`);
        }
        catch (error) {
            logger_1.logger.error('배치 매칭 실행 중 오류:', error);
        }
    });
    // 작업 저장 및 시작
    scheduledJobs[jobName] = job;
    job.start();
    logger_1.logger.info('배치 매칭 스케줄러가 설정되었습니다 (매 10초마다 실행)');
    return job;
}
// 모든 스케줄된 작업 시작
function startAllScheduledJobs() {
    Object.values(scheduledJobs).forEach(job => job.start());
    logger_1.logger.info(`${Object.keys(scheduledJobs).length}개의 예약된 작업이 시작되었습니다`);
}
// 모든 스케줄된 작업 중지
function stopAllScheduledJobs() {
    Object.values(scheduledJobs).forEach(job => job.stop());
    logger_1.logger.info(`${Object.keys(scheduledJobs).length}개의 예약된 작업이 중지되었습니다`);
}
// 스케줄러 초기화 및 시작
function initScheduler() {
    // 배치 매칭 스케줄링
    scheduleBatchMatching();
    // 추가 작업 스케줄링
    // 여기에 다른 예약 작업 추가
    logger_1.logger.info('스케줄러가 초기화되었습니다');
}
