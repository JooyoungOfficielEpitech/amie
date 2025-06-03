import { getRedisClient } from './redis.service';

/**
 * Redis 기반 소켓 ↔ 사용자 매핑 레지스트리
 *  - Hash   (key=socket:user)    : socketId -> userId
 *  - Set    (key=user:sockets:{userId}) : userId -> Set<socketId>
 * TTL 전략 : 소켓 매핑은 24시간 후 만료(연결 해제 시 즉시 제거)
 */
const redis = getRedisClient();

const SOCKET_USER_HASH = 'socket:user';
function userSocketsKey(userId: string) {
  return `user:sockets:${userId}`;
}

const ONE_DAY_SECONDS = 60 * 60 * 24;

export const ConnectionRegistry = {
  /** socketId -> userId 매핑 */
  async mapSocketToUser(socketId: string, userId: string): Promise<void> {
    // Hash에 저장
    await redis.hset(SOCKET_USER_HASH, socketId, userId);
    // 소켓 해시 필드 TTL 관리 (불가) → 별도 키에 TTL 부여
    await redis.set(`socket:ttl:${socketId}`, '1', 'EX', ONE_DAY_SECONDS);

    // Set에 저장
    const key = userSocketsKey(userId);
    await redis.sadd(key, socketId);
    // 사용자 세트도 TTL 부여 (갱신)
    await redis.expire(key, ONE_DAY_SECONDS);
  },

  /** 소켓 연결 해제 시 매핑 제거 */
  async unmapSocket(socketId: string): Promise<void> {
    const userId = await redis.hget(SOCKET_USER_HASH, socketId);
    if (userId) {
      const key = userSocketsKey(userId);
      await redis.srem(key, socketId);
      const size = await redis.scard(key);
      if (size === 0) {
        await redis.del(key);
      }
    }
    await redis.hdel(SOCKET_USER_HASH, socketId);
    await redis.del(`socket:ttl:${socketId}`);
  },

  /** socketId 로 userId 조회 */
  async getUserIdBySocket(socketId: string): Promise<string | null> {
    const userId = await redis.hget(SOCKET_USER_HASH, socketId);
    return userId;
  },

  /** userId 로 모든 socketId 조회 */
  async getSocketsByUser(userId: string): Promise<string[]> {
    const key = userSocketsKey(userId);
    const members = await redis.smembers(key);
    return members;
  },

  /** userId 로 대표 socketId 조회 (첫번째) */
  async getAnySocketByUser(userId: string): Promise<string | null> {
    const sockets = await this.getSocketsByUser(userId);
    return sockets.length > 0 ? sockets[0] : null;
  }
};

// --- 자동 정리: socket:ttl:* 키 만료 시 매핑 제거 ---
(async () => {
  try {
    const sub = redis.duplicate();
    // Keyspace notification 설정 (실패해도 무시)
    await sub.config('SET', 'notify-keyspace-events', 'Ex').catch(() => {});
    await sub.psubscribe('__keyevent@*__:expired');
    sub.on('pmessage', async (_pattern, _channel, message) => {
      if (message.startsWith('socket:ttl:')) {
        const socketId = message.substring('socket:ttl:'.length);
        await ConnectionRegistry.unmapSocket(socketId);
      }
    });
  } catch (err) {
    // 로깅만, 기능 미작동 시에도 앱은 계속 동작
    console.error('[ConnectionRegistry] keyspace notification 설정 실패:', err);
  }
})(); 