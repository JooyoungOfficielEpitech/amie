"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHANNELS = exports.eventBus = void 0;
exports.publishEvent = publishEvent;
exports.subscribeToChannel = subscribeToChannel;
exports.addToQueue = addToQueue;
exports.removeFromQueue = removeFromQueue;
exports.getQueueItems = getQueueItems;
exports.getQueueLength = getQueueLength;
exports.getRedisClient = getRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const logger_1 = require("../utils/logger");
// Redis 클라이언트 설정
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger_1.logger.info(`Redis 연결 재시도 중... (${times}회 시도)`);
        return delay;
    }
});
// Redis 연결 이벤트 처리
redisClient.on('connect', () => {
    logger_1.logger.info('Redis 서버에 연결되었습니다.');
});
redisClient.on('error', (err) => {
    logger_1.logger.error('Redis 연결 오류:', err);
});
// 이벤트 버스 - 앱 내부 이벤트 관리
exports.eventBus = new events_1.EventEmitter();
// 채널 이름 상수
exports.CHANNELS = {
    MATCH_REQUESTED: 'match:requested',
    MATCH_CANCELLED: 'match:cancelled',
    MATCH_SUCCESSFUL: 'match:successful',
    CREDIT_UPDATED: 'credit:updated',
};
// 구독 클라이언트 (수신용)
const subscriberClient = redisClient.duplicate();
// 이벤트 발행 함수
async function publishEvent(channel, data) {
    try {
        await redisClient.publish(channel, JSON.stringify(data));
        logger_1.logger.debug(`이벤트 발행: ${channel}`, data);
        return true;
    }
    catch (error) {
        logger_1.logger.error(`이벤트 발행 오류 (${channel}):`, error);
        return false;
    }
}
// 이벤트 구독 함수
function subscribeToChannel(channel, callback) {
    subscriberClient.subscribe(channel).then(() => {
        logger_1.logger.info(`채널 구독 성공: ${channel}`);
    }).catch((err) => {
        logger_1.logger.error(`채널 구독 오류 (${channel}):`, err);
    });
    // 메시지 수신 핸들러
    subscriberClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
            try {
                callback(message);
            }
            catch (error) {
                logger_1.logger.error(`메시지 파싱 오류 (${channel}):`, error);
            }
        }
    });
}
// Redis 큐 관리 함수들
async function addToQueue(queueName, id, score = Date.now()) {
    return redisClient.zadd(queueName, score, id);
}
async function removeFromQueue(queueName, id) {
    return redisClient.zrem(queueName, id);
}
async function getQueueItems(queueName, start = 0, end = -1) {
    return redisClient.zrange(queueName, start, end);
}
async function getQueueLength(queueName) {
    return redisClient.zcard(queueName);
}
// 트랜잭션을 위한 함수
function getRedisClient() {
    return redisClient;
}
