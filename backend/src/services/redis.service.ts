import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Redis 클라이언트 설정
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.info(`Redis 연결 재시도 중... (${times}회 시도)`);
    return delay;
  }
});

// Redis 연결 이벤트 처리
redisClient.on('connect', () => {
  logger.info('Redis 서버에 연결되었습니다.');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis 연결 오류:', err);
});

// 이벤트 버스 - 앱 내부 이벤트 관리
export const eventBus = new EventEmitter();

// 채널 이름 상수
export const CHANNELS = {
  MATCH_REQUESTED: 'match:requested',
  MATCH_CANCELLED: 'match:cancelled',
  MATCH_SUCCESSFUL: 'match:successful',
  CREDIT_UPDATED: 'credit:updated',
  // --- Chat 관련 채널 ---
  CHAT_NEW_MESSAGE: 'chat:new-message',
  CHAT_USER_TYPING: 'chat:user-typing',
  CHAT_MESSAGES_READ: 'chat:messages-read',
  CHAT_PARTNER_LEFT: 'chat:partner-left',
  // --- Match 관련 채널 ---
  MATCH_USER_NOTIFY: 'match:user-notify',
};

// 구독 클라이언트 (수신용)
const subscriberClient = redisClient.duplicate();

// 이벤트 발행 함수
export async function publishEvent(channel: string, data: any) {
  try {
    await redisClient.publish(channel, JSON.stringify(data));
    logger.debug(`이벤트 발행: ${channel}`, data);
    return true;
  } catch (error) {
    logger.error(`이벤트 발행 오류 (${channel}):`, error);
    return false;
  }
}

// 이벤트 구독 함수
export function subscribeToChannel(channel: string, callback: (message: string) => void) {
  subscriberClient.subscribe(channel).then(() => {
    logger.info(`채널 구독 성공: ${channel}`);
  }).catch((err) => {
    logger.error(`채널 구독 오류 (${channel}):`, err);
  });
  
  // 메시지 수신 핸들러
  subscriberClient.on('message', (receivedChannel: string, message: string) => {
    if (receivedChannel === channel) {
      try {
        callback(message);
      } catch (error) {
        logger.error(`메시지 파싱 오류 (${channel}):`, error);
      }
    }
  });
}

// Redis 큐 관리 함수들
export async function addToQueue(queueName: string, id: string, score: number = Date.now()) {
  return redisClient.zadd(queueName, score, id);
}

export async function removeFromQueue(queueName: string, id: string) {
  return redisClient.zrem(queueName, id);
}

export async function getQueueItems(queueName: string, start = 0, end = -1) {
  return redisClient.zrange(queueName, start, end);
}

export async function getQueueLength(queueName: string) {
  return redisClient.zcard(queueName);
}

// 트랜잭션을 위한 함수
export function getRedisClient() {
  return redisClient;
} 