"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMatchNamespace = setupMatchNamespace;
const logger_1 = require("../utils/logger");
const matching_service_1 = require("../services/matching.service");
const redis_service_1 = require("../services/redis.service");
// 사용자 ID와 소켓 ID를 매핑하는 객체
const userSocketMap = new Map();
const socketUserMap = new Map();
// 매칭 네임스페이스 설정
function setupMatchNamespace(io) {
    const matchNamespace = io.of('/match');
    // 매칭 이벤트에 대한 Redis 구독 설정
    subscribeToRedisEvents(matchNamespace);
    // 소켓 연결 처리
    matchNamespace.on('connection', (socket) => {
        logger_1.logger.info(`매칭 소켓 연결됨: ${socket.id}`);
        // 인증 처리
        socket.on('authenticate', async (data) => {
            try {
                const { userId, token } = data;
                // 토큰 검증 로직은 별도 구현 필요
                // 여기서는 단순화를 위해 생략하고 userId만 사용
                if (!userId) {
                    socket.emit('error', { message: '인증 실패: 사용자 ID가 필요합니다' });
                    return;
                }
                // 사용자 ID와 소켓 ID 매핑
                userSocketMap.set(userId, socket.id);
                socketUserMap.set(socket.id, userId);
                logger_1.logger.info(`사용자 인증됨: ${userId}, 소켓: ${socket.id}`);
                // 인증 완료 응답
                socket.emit('authenticated', { success: true });
                // 현재 매칭 상태 확인 및 응답
                const status = await (0, matching_service_1.getMatchStatus)(userId);
                socket.emit('match_status', status);
            }
            catch (error) {
                logger_1.logger.error('인증 처리 중 오류:', error);
                socket.emit('error', { message: '인증 중 오류가 발생했습니다' });
            }
        });
        // 매칭 요청 처리
        socket.on('request_match', async (data) => {
            try {
                const userId = socketUserMap.get(socket.id);
                if (!userId) {
                    socket.emit('error', { message: '인증되지 않은 요청입니다' });
                    return;
                }
                const { gender, userInfo } = data;
                // 매칭 요청 처리
                const result = await (0, matching_service_1.processMatchRequest)(userId, gender, userInfo);
                // 결과 응답
                socket.emit('match_request_result', result);
            }
            catch (error) {
                logger_1.logger.error('매칭 요청 처리 중 오류:', error);
                socket.emit('error', { message: '매칭 요청 중 오류가 발생했습니다' });
            }
        });
        // 매칭 취소 처리
        socket.on('cancel_match', async () => {
            try {
                const userId = socketUserMap.get(socket.id);
                if (!userId) {
                    socket.emit('error', { message: '인증되지 않은 요청입니다' });
                    return;
                }
                // 매칭 취소 처리
                const result = await (0, matching_service_1.cancelMatchRequest)(userId);
                // 결과 응답
                socket.emit('match_cancel_result', result);
            }
            catch (error) {
                logger_1.logger.error('매칭 취소 처리 중 오류:', error);
                socket.emit('error', { message: '매칭 취소 중 오류가 발생했습니다' });
            }
        });
        // 연결 해제 처리
        socket.on('disconnect', () => {
            const userId = socketUserMap.get(socket.id);
            if (userId) {
                // 매핑 삭제
                userSocketMap.delete(userId);
                socketUserMap.delete(socket.id);
                logger_1.logger.info(`매칭 소켓 연결 해제: ${socket.id}, 사용자: ${userId}`);
            }
            else {
                logger_1.logger.info(`매칭 소켓 연결 해제: ${socket.id}`);
            }
        });
    });
    return matchNamespace;
}
// Redis 이벤트 구독 설정
function subscribeToRedisEvents(namespace) {
    // 매칭 성공 이벤트 구독
    (0, redis_service_1.subscribeToChannel)(redis_service_1.CHANNELS.MATCH_SUCCESSFUL, (message) => {
        try {
            const data = JSON.parse(message);
            const { maleId, femaleId, roomId, timestamp } = data;
            // 각 사용자에게 매칭 성공 알림
            notifyUser(namespace, maleId, 'match_success', {
                roomId,
                partnerId: femaleId,
                timestamp
            });
            notifyUser(namespace, femaleId, 'match_success', {
                roomId,
                partnerId: maleId,
                timestamp
            });
            logger_1.logger.info(`매칭 성공 알림 전송: 방=${roomId}, 남성=${maleId}, 여성=${femaleId}`);
        }
        catch (error) {
            logger_1.logger.error('매칭 성공 이벤트 처리 중 오류:', error);
        }
    });
    // 매칭 취소 이벤트 구독
    (0, redis_service_1.subscribeToChannel)(redis_service_1.CHANNELS.MATCH_CANCELLED, (message) => {
        try {
            const data = JSON.parse(message);
            const { userId, timestamp } = data;
            // 사용자에게 매칭 취소 알림
            notifyUser(namespace, userId, 'match_cancelled', {
                timestamp
            });
            logger_1.logger.info(`매칭 취소 알림 전송: 사용자=${userId}`);
        }
        catch (error) {
            logger_1.logger.error('매칭 취소 이벤트 처리 중 오류:', error);
        }
    });
}
// 특정 사용자에게 알림 전송
function notifyUser(namespace, userId, event, data) {
    const socketId = userSocketMap.get(userId);
    if (socketId) {
        namespace.to(socketId).emit(event, data);
        return true;
    }
    logger_1.logger.warn(`사용자에게 알림 실패: ${userId}, 이벤트=${event}, 연결된 소켓 없음`);
    return false;
}
