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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMatchRequest = processMatchRequest;
exports.cancelMatchRequest = cancelMatchRequest;
exports.createMatch = createMatch;
exports.isUserWaitingForMatch = isUserWaitingForMatch;
exports.processBatchMatching = processBatchMatching;
exports.getMatchStatus = getMatchStatus;
const logger_1 = require("../utils/logger");
const redis_service_1 = require("./redis.service");
const User_1 = require("../models/User");
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
const User_2 = __importDefault(require("../models/User"));
const CreditLog_1 = __importStar(require("../models/CreditLog"));
// 큐 이름 상수
const QUEUE_NAMES = {
    MALE: 'match:queue:male',
    FEMALE: 'match:queue:female',
};
// 매칭에 필요한 크레딧 상수
const REQUIRED_MATCHING_CREDIT = 10;
// 매칭 요청 처리
async function processMatchRequest(userId, gender, userInfo) {
    logger_1.logger.info(`매칭 요청 처리: ${userId}, 성별: ${gender}`);
    try {
        // 1. 이미 대기 중인지 확인
        const isAlreadyWaiting = await isUserWaitingForMatch(userId);
        if (isAlreadyWaiting) {
            logger_1.logger.warn(`사용자가 이미 매칭 대기 중: ${userId}`);
            return {
                success: false,
                error: 'already_waiting',
                message: '이미 매칭 대기 중입니다'
            };
        }
        // 2. 사용자의 크레딧 확인 (성별 상관없이 모든 사용자에게 적용)
        const user = await User_2.default.findById(userId);
        if (!user) {
            return {
                success: false,
                error: 'user_not_found',
                message: '사용자를 찾을 수 없습니다'
            };
        }
        if (user.credit < REQUIRED_MATCHING_CREDIT) {
            return {
                success: false,
                error: 'insufficient_credit',
                message: '크레딧이 부족합니다'
            };
        }
        // 3. 즉시 매칭 시도 (상대 성별 대기열 확인)
        const oppositeQueueName = gender === User_1.Gender.MALE ? QUEUE_NAMES.FEMALE : QUEUE_NAMES.MALE;
        const queueLength = await (0, redis_service_1.getQueueLength)(oppositeQueueName);
        // 상대방 대기열에 사용자가 있으면 즉시 매칭 시도
        if (queueLength > 0) {
            const oppositeUsers = await (0, redis_service_1.getQueueItems)(oppositeQueueName, 0, 0); // 가장 오래 기다린 사용자
            if (oppositeUsers.length > 0) {
                const oppositeUserId = oppositeUsers[0];
                // 매칭 생성
                const result = await createMatch(gender === User_1.Gender.MALE ? userId : oppositeUserId, gender === User_1.Gender.MALE ? oppositeUserId : userId);
                if (result.success) {
                    // 매칭 성공 이벤트 발행
                    await (0, redis_service_1.publishEvent)(redis_service_1.CHANNELS.MATCH_SUCCESSFUL, {
                        maleId: result.maleId,
                        femaleId: result.femaleId,
                        roomId: result.roomId,
                        timestamp: Date.now()
                    });
                    return {
                        success: true,
                        roomId: result.roomId,
                        partnerId: gender === User_1.Gender.MALE ? oppositeUserId : userId,
                        message: '매칭이 성공했습니다'
                    };
                }
            }
        }
        // 4. 즉시 매칭 실패 시 대기열에 추가
        const queueName = gender === User_1.Gender.MALE ? QUEUE_NAMES.MALE : QUEUE_NAMES.FEMALE;
        await (0, redis_service_1.addToQueue)(queueName, userId);
        // 5. 사용자 상태 업데이트
        await User_2.default.findByIdAndUpdate(userId, { isWaitingForMatch: true });
        // 6. 매칭 요청 이벤트 발행
        await (0, redis_service_1.publishEvent)(redis_service_1.CHANNELS.MATCH_REQUESTED, {
            userId,
            gender,
            timestamp: Date.now()
        });
        return {
            success: true,
            status: 'waiting',
            message: '매칭 대기열에 추가되었습니다'
        };
    }
    catch (error) {
        logger_1.logger.error('매칭 요청 처리 중 오류:', error);
        return {
            success: false,
            error: 'internal_error',
            message: '매칭 처리 중 오류가 발생했습니다'
        };
    }
}
// 매칭 취소 처리
async function cancelMatchRequest(userId) {
    logger_1.logger.info(`매칭 취소 요청: ${userId}`);
    try {
        // 1. 대기 중인지 확인
        const isWaiting = await isUserWaitingForMatch(userId);
        if (!isWaiting) {
            return {
                success: false,
                error: 'not_waiting',
                message: '매칭 대기 중이 아닙니다'
            };
        }
        // 2. 큐에서 제거
        await (0, redis_service_1.removeFromQueue)(QUEUE_NAMES.MALE, userId);
        await (0, redis_service_1.removeFromQueue)(QUEUE_NAMES.FEMALE, userId);
        // 3. 사용자 상태 업데이트
        await User_2.default.findByIdAndUpdate(userId, { isWaitingForMatch: false });
        // 4. 매칭 취소 이벤트 발행
        await (0, redis_service_1.publishEvent)(redis_service_1.CHANNELS.MATCH_CANCELLED, {
            userId,
            timestamp: Date.now()
        });
        return {
            success: true,
            message: '매칭이 취소되었습니다'
        };
    }
    catch (error) {
        logger_1.logger.error('매칭 취소 처리 중 오류:', error);
        return {
            success: false,
            error: 'internal_error',
            message: '매칭 취소 중 오류가 발생했습니다'
        };
    }
}
// 매칭 생성 함수
async function createMatch(maleId, femaleId) {
    logger_1.logger.info(`매칭 생성: 남성=${maleId}, 여성=${femaleId}`);
    try {
        // 1. 대기열에서 제거
        await (0, redis_service_1.removeFromQueue)(QUEUE_NAMES.MALE, maleId);
        await (0, redis_service_1.removeFromQueue)(QUEUE_NAMES.FEMALE, femaleId);
        // 2. 크레딧 차감 (남성만)
        // 크레딧 체크
        const maleUser = await User_2.default.findById(maleId);
        if (!maleUser) {
            // 사용자를 찾을 수 없는 경우 큐에 다시 추가하고 오류 반환
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.MALE, maleId);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.FEMALE, femaleId);
            throw new Error("남성 사용자를 찾을 수 없습니다");
        }
        if (maleUser.credit < REQUIRED_MATCHING_CREDIT) {
            // 크레딧 부족 시 큐에 다시 추가하고 오류 반환
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.MALE, maleId);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.FEMALE, femaleId);
            throw new Error("남성 사용자의 크레딧이 부족합니다");
        }
        // 3. 채팅방 생성 (크레딧 차감 이전에 먼저 생성)
        let chatRoom;
        try {
            chatRoom = await ChatRoom_1.default.create({
                user1Id: maleId,
                user2Id: femaleId,
                isActive: true
            });
        }
        catch (error) {
            // 채팅방 생성 실패 시 큐에 다시 추가하고 오류 전파
            logger_1.logger.error('채팅방 생성 실패:', error);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.MALE, maleId);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.FEMALE, femaleId);
            throw new Error("채팅방 생성에 실패했습니다");
        }
        const roomId = chatRoom._id.toString();
        // 4. 크레딧 차감 (채팅방 생성 성공 후)
        try {
            maleUser.credit -= REQUIRED_MATCHING_CREDIT;
            await maleUser.save();
            // 크레딧 사용 내역 기록 - 선택적
            await recordCreditUsage(maleId, REQUIRED_MATCHING_CREDIT, 'match_creation', roomId);
            // 여성 사용자 크레딧 차감 추가
            const femaleUser = await User_2.default.findById(femaleId);
            if (femaleUser) {
                femaleUser.credit -= REQUIRED_MATCHING_CREDIT;
                await femaleUser.save();
                // 여성 사용자 크레딧 사용 내역 기록
                await recordCreditUsage(femaleId, REQUIRED_MATCHING_CREDIT, 'match_creation', roomId);
                logger_1.logger.info(`여성 사용자 ${femaleId} 크레딧 차감: ${REQUIRED_MATCHING_CREDIT}`);
            }
            else {
                logger_1.logger.warn(`여성 사용자 ${femaleId}를 찾을 수 없어 크레딧 차감 건너뜀`);
            }
        }
        catch (error) {
            // 크레딧 차감 실패 시 채팅방 삭제하고 큐에 다시 추가 후 오류 전파
            logger_1.logger.error('크레딧 차감 실패:', error);
            await ChatRoom_1.default.findByIdAndDelete(roomId);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.MALE, maleId);
            await (0, redis_service_1.addToQueue)(QUEUE_NAMES.FEMALE, femaleId);
            throw new Error("크레딧 차감에 실패했습니다");
        }
        // 5. 사용자 상태 업데이트
        try {
            await User_2.default.findByIdAndUpdate(maleId, { isWaitingForMatch: false });
            await User_2.default.findByIdAndUpdate(femaleId, { isWaitingForMatch: false });
        }
        catch (error) {
            // 상태 업데이트 실패는 비즈니스 로직에 크게 영향을 주지 않으므로 로그만 남김
            logger_1.logger.warn('사용자 상태 업데이트 실패:', error);
        }
        return {
            success: true,
            maleId,
            femaleId,
            roomId,
            creditUsed: REQUIRED_MATCHING_CREDIT
        };
    }
    catch (error) {
        logger_1.logger.error('매칭 생성 중 오류:', error);
        return {
            success: false,
            error: 'match_creation_failed',
            message: error instanceof Error ? error.message : '매칭 생성 중 오류가 발생했습니다'
        };
    }
}
// 크레딧 사용 내역 기록 - 실패해도 매칭에 영향 없도록 별도 처리
async function recordCreditUsage(userId, amount, type, reference) {
    try {
        // CreditLog 모델 사용
        await CreditLog_1.default.create({
            userId,
            action: CreditLog_1.CreditAction.MATCH, // enum 타입으로 변경
            amount: -amount, // 차감은 음수로 기록
            // reference 필드가 없으므로 제외
        });
    }
    catch (error) {
        // 로그만 남기고 실패해도 매칭 과정은 계속 진행
        logger_1.logger.warn(`크레딧 사용 내역 기록 실패 (userId: ${userId}, amount: ${amount}):`, error);
    }
}
// 대기 중인 사용자인지 확인
async function isUserWaitingForMatch(userId) {
    // Redis 큐에서 확인
    const inMaleQueue = await (0, redis_service_1.getQueueItems)(QUEUE_NAMES.MALE).then(items => items.includes(userId));
    const inFemaleQueue = await (0, redis_service_1.getQueueItems)(QUEUE_NAMES.FEMALE).then(items => items.includes(userId));
    // DB에서도 확인 (이중 검증)
    const user = await User_2.default.findById(userId).select('isWaitingForMatch');
    const isWaitingInDb = user?.isWaitingForMatch || false;
    // Redis 또는 DB 중 하나라도 대기 중이면 true (일관성을 위해)
    const isWaiting = inMaleQueue || inFemaleQueue || isWaitingInDb;
    // Redis와 DB 상태가 불일치하면 DB 상태를 Redis에 맞춤
    if (isWaiting && !isWaitingInDb) {
        // Redis에는 있지만 DB에는 없는 경우 DB 업데이트
        await User_2.default.findByIdAndUpdate(userId, { isWaitingForMatch: true });
        logger_1.logger.info(`사용자 ${userId}의 대기 상태 동기화: Redis → DB`);
    }
    else if (!isWaiting && isWaitingInDb) {
        // DB에는 있지만 Redis에는 없는 경우 DB 업데이트
        await User_2.default.findByIdAndUpdate(userId, { isWaitingForMatch: false });
        logger_1.logger.info(`사용자 ${userId}의 대기 상태 동기화: DB → Redis`);
    }
    return isWaiting;
}
// 배치 매칭 처리 - 스케줄러에서 주기적으로 호출
async function processBatchMatching() {
    logger_1.logger.info('배치 매칭 처리 시작');
    try {
        // 1. 대기 중인 사용자 가져오기
        const maleUsers = await (0, redis_service_1.getQueueItems)(QUEUE_NAMES.MALE);
        const femaleUsers = await (0, redis_service_1.getQueueItems)(QUEUE_NAMES.FEMALE);
        logger_1.logger.info(`대기 중인 사용자: 남성=${maleUsers.length}, 여성=${femaleUsers.length}`);
        if (maleUsers.length === 0 || femaleUsers.length === 0) {
            return {
                success: true,
                matches: 0,
                message: '대기 중인 사용자가 부족합니다'
            };
        }
        // 2. 매칭 알고리즘 실행 (간단한 FIFO 방식)
        const matches = [];
        const matchLimit = Math.min(maleUsers.length, femaleUsers.length);
        for (let i = 0; i < matchLimit; i++) {
            const maleId = maleUsers[i];
            const femaleId = femaleUsers[i];
            // 각 매칭 생성
            const result = await createMatch(maleId, femaleId);
            if (result.success) {
                matches.push({
                    maleId: result.maleId,
                    femaleId: result.femaleId,
                    roomId: result.roomId
                });
                // 매칭 성공 이벤트 발행
                await (0, redis_service_1.publishEvent)(redis_service_1.CHANNELS.MATCH_SUCCESSFUL, {
                    maleId: result.maleId,
                    femaleId: result.femaleId,
                    roomId: result.roomId,
                    timestamp: Date.now()
                });
            }
        }
        return {
            success: true,
            matches: matches.length,
            details: matches
        };
    }
    catch (error) {
        logger_1.logger.error('배치 매칭 처리 중 오류:', error);
        return {
            success: false,
            error: 'batch_processing_failed',
            message: '배치 매칭 처리 중 오류가 발생했습니다'
        };
    }
}
// 매칭 상태 조회
async function getMatchStatus(userId) {
    try {
        // 1. 대기 상태 확인
        const isWaiting = await isUserWaitingForMatch(userId);
        // 2. 활성 채팅방 확인
        const activeChatRoom = await ChatRoom_1.default.findOne({
            $or: [
                { user1Id: userId },
                { user2Id: userId }
            ],
            isActive: true
        }).sort({ createdAt: -1 });
        return {
            success: true,
            isWaiting,
            matchedRoomId: activeChatRoom ? activeChatRoom._id.toString() : null
        };
    }
    catch (error) {
        logger_1.logger.error('매칭 상태 조회 중 오류:', error);
        return {
            success: false,
            error: 'status_check_failed',
            message: '매칭 상태 조회 중 오류가 발생했습니다'
        };
    }
}
