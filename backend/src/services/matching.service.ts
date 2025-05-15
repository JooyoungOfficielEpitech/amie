import { logger } from '../utils/logger';
import { 
  addToQueue, 
  removeFromQueue, 
  getQueueItems, 
  getQueueLength,
  publishEvent, 
  CHANNELS
} from './redis.service';
import { Gender } from '../models/User';
import ChatRoom from '../models/ChatRoom';
import User from '../models/User';
import mongoose from 'mongoose';
import { syncUserToMongodb } from '../controllers/matchQueueController';
import MatchQueue from '../models/MatchQueue';
import CreditLog, { CreditAction } from '../models/CreditLog';

// 큐 이름 상수
const QUEUE_NAMES = {
  MALE: 'match:queue:male',
  FEMALE: 'match:queue:female',
};

// 매칭에 필요한 크레딧 상수
const REQUIRED_MATCHING_CREDIT = 10;

// 매칭 요청 처리
export async function processMatchRequest(userId: string, gender: Gender, userInfo: any): Promise<any> {
  logger.info(`매칭 요청 처리: ${userId}, 성별: ${gender}`);
  
  try {
    // 1. 이미 대기 중인지 확인
    const isAlreadyWaiting = await isUserWaitingForMatch(userId);
    if (isAlreadyWaiting) {
      logger.warn(`사용자가 이미 매칭 대기 중: ${userId}`);
      return {
        success: false,
        error: 'already_waiting',
        message: '이미 매칭 대기 중입니다'
      };
    }
    
    // 2. 남성 사용자일 경우 크레딧 확인
    if (gender === Gender.MALE) {
      const user = await User.findById(userId);
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
    }
    
    // 3. 즉시 매칭 시도 (상대 성별 대기열 확인)
    const oppositeQueueName = gender === Gender.MALE ? QUEUE_NAMES.FEMALE : QUEUE_NAMES.MALE;
    const queueLength = await getQueueLength(oppositeQueueName);
    
    // 상대방 대기열에 사용자가 있으면 즉시 매칭 시도
    if (queueLength > 0) {
      const oppositeUsers = await getQueueItems(oppositeQueueName, 0, 0); // 가장 오래 기다린 사용자
      
      if (oppositeUsers.length > 0) {
        const oppositeUserId = oppositeUsers[0];
        
        // 매칭 생성
        const result = await createMatch(
          gender === Gender.MALE ? userId : oppositeUserId,
          gender === Gender.MALE ? oppositeUserId : userId
        );
        
        if (result.success) {
          // 매칭 성공 이벤트 발행
          await publishEvent(CHANNELS.MATCH_SUCCESSFUL, {
            maleId: result.maleId,
            femaleId: result.femaleId,
            roomId: result.roomId,
            timestamp: Date.now()
          });
          
          return {
            success: true,
            roomId: result.roomId,
            partnerId: gender === Gender.MALE ? oppositeUserId : userId,
            message: '매칭이 성공했습니다'
          };
        }
      }
    }
    
    // 4. 즉시 매칭 실패 시 대기열에 추가
    const queueName = gender === Gender.MALE ? QUEUE_NAMES.MALE : QUEUE_NAMES.FEMALE;
    await addToQueue(queueName, userId);
    
    // 5. 사용자 상태 업데이트
    await User.findByIdAndUpdate(userId, { isWaitingForMatch: true });
    
    // 6. 매칭 요청 이벤트 발행
    await publishEvent(CHANNELS.MATCH_REQUESTED, {
      userId,
      gender,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      status: 'waiting',
      message: '매칭 대기열에 추가되었습니다'
    };
  } catch (error) {
    logger.error('매칭 요청 처리 중 오류:', error);
    return {
      success: false,
      error: 'internal_error',
      message: '매칭 처리 중 오류가 발생했습니다'
    };
  }
}

// 매칭 취소 처리
export async function cancelMatchRequest(userId: string): Promise<any> {
  logger.info(`매칭 취소 요청: ${userId}`);
  
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
    await removeFromQueue(QUEUE_NAMES.MALE, userId);
    await removeFromQueue(QUEUE_NAMES.FEMALE, userId);
    
    // 3. 사용자 상태 업데이트
    await User.findByIdAndUpdate(userId, { isWaitingForMatch: false });
    
    // 4. 매칭 취소 이벤트 발행
    await publishEvent(CHANNELS.MATCH_CANCELLED, {
      userId,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      message: '매칭이 취소되었습니다'
    };
  } catch (error) {
    logger.error('매칭 취소 처리 중 오류:', error);
    return {
      success: false,
      error: 'internal_error',
      message: '매칭 취소 중 오류가 발생했습니다'
    };
  }
}

// 매칭 생성 함수
export async function createMatch(maleId: string, femaleId: string): Promise<any> {
  logger.info(`매칭 생성: 남성=${maleId}, 여성=${femaleId}`);
  
  try {
    // 1. 대기열에서 제거
    await removeFromQueue(QUEUE_NAMES.MALE, maleId);
    await removeFromQueue(QUEUE_NAMES.FEMALE, femaleId);
    
    // 2. 크레딧 차감 (남성만)
    // 크레딧 체크
    const maleUser = await User.findById(maleId);
    if (!maleUser) {
      // 사용자를 찾을 수 없는 경우 큐에 다시 추가하고 오류 반환
      await addToQueue(QUEUE_NAMES.MALE, maleId);
      await addToQueue(QUEUE_NAMES.FEMALE, femaleId);
      throw new Error("남성 사용자를 찾을 수 없습니다");
    }
    
    if (maleUser.credit < REQUIRED_MATCHING_CREDIT) {
      // 크레딧 부족 시 큐에 다시 추가하고 오류 반환
      await addToQueue(QUEUE_NAMES.MALE, maleId);
      await addToQueue(QUEUE_NAMES.FEMALE, femaleId);
      throw new Error("남성 사용자의 크레딧이 부족합니다");
    }
    
    // 3. 채팅방 생성 (크레딧 차감 이전에 먼저 생성)
    let chatRoom;
    try {
      chatRoom = await ChatRoom.create({
        user1Id: maleId,
        user2Id: femaleId,
        isActive: true
      });
    } catch (error) {
      // 채팅방 생성 실패 시 큐에 다시 추가하고 오류 전파
      logger.error('채팅방 생성 실패:', error);
      await addToQueue(QUEUE_NAMES.MALE, maleId);
      await addToQueue(QUEUE_NAMES.FEMALE, femaleId);
      throw new Error("채팅방 생성에 실패했습니다");
    }
    
    const roomId = chatRoom._id.toString();
    
    // 4. 크레딧 차감 (채팅방 생성 성공 후)
    try {
      maleUser.credit -= REQUIRED_MATCHING_CREDIT;
      await maleUser.save();
      
      // 크레딧 사용 내역 기록 - 선택적
      await recordCreditUsage(maleId, REQUIRED_MATCHING_CREDIT, 'match_creation', roomId);
    } catch (error) {
      // 크레딧 차감 실패 시 채팅방 삭제하고 큐에 다시 추가 후 오류 전파
      logger.error('크레딧 차감 실패:', error);
      await ChatRoom.findByIdAndDelete(roomId);
      await addToQueue(QUEUE_NAMES.MALE, maleId);
      await addToQueue(QUEUE_NAMES.FEMALE, femaleId);
      throw new Error("크레딧 차감에 실패했습니다");
    }
    
    // 5. 사용자 상태 업데이트
    try {
      await User.findByIdAndUpdate(maleId, { isWaitingForMatch: false });
      await User.findByIdAndUpdate(femaleId, { isWaitingForMatch: false });
    } catch (error) {
      // 상태 업데이트 실패는 비즈니스 로직에 크게 영향을 주지 않으므로 로그만 남김
      logger.warn('사용자 상태 업데이트 실패:', error);
    }
    
    return {
      success: true,
      maleId,
      femaleId,
      roomId,
      creditUsed: REQUIRED_MATCHING_CREDIT
    };
  } catch (error) {
    logger.error('매칭 생성 중 오류:', error);
    
    return {
      success: false,
      error: 'match_creation_failed',
      message: error instanceof Error ? error.message : '매칭 생성 중 오류가 발생했습니다'
    };
  }
}

// 크레딧 사용 내역 기록 - 실패해도 매칭에 영향 없도록 별도 처리
async function recordCreditUsage(userId: string, amount: number, type: string, reference: string): Promise<void> {
  try {
    // CreditLog 모델 사용
    await CreditLog.create({
      userId,
      action: CreditAction.MATCH,  // enum 타입으로 변경
      amount: -amount, // 차감은 음수로 기록
      // reference 필드가 없으므로 제외
    });
  } catch (error) {
    // 로그만 남기고 실패해도 매칭 과정은 계속 진행
    logger.warn(`크레딧 사용 내역 기록 실패 (userId: ${userId}, amount: ${amount}):`, error);
  }
}

// 대기 중인 사용자인지 확인
export async function isUserWaitingForMatch(userId: string): Promise<boolean> {
  // Redis 큐에서 확인
  const inMaleQueue = await getQueueItems(QUEUE_NAMES.MALE).then(items => items.includes(userId));
  const inFemaleQueue = await getQueueItems(QUEUE_NAMES.FEMALE).then(items => items.includes(userId));
  
  // DB에서도 확인 (이중 검증)
  const user = await User.findById(userId).select('isWaitingForMatch');
  const isWaitingInDb = user?.isWaitingForMatch || false;
  
  // Redis 또는 DB 중 하나라도 대기 중이면 true (일관성을 위해)
  const isWaiting = inMaleQueue || inFemaleQueue || isWaitingInDb;
  
  // Redis와 DB 상태가 불일치하면 DB 상태를 Redis에 맞춤
  if (isWaiting && !isWaitingInDb) {
    // Redis에는 있지만 DB에는 없는 경우 DB 업데이트
    await User.findByIdAndUpdate(userId, { isWaitingForMatch: true });
    logger.info(`사용자 ${userId}의 대기 상태 동기화: Redis → DB`);
  } else if (!isWaiting && isWaitingInDb) {
    // DB에는 있지만 Redis에는 없는 경우 DB 업데이트
    await User.findByIdAndUpdate(userId, { isWaitingForMatch: false });
    logger.info(`사용자 ${userId}의 대기 상태 동기화: DB → Redis`);
  }
  
  return isWaiting;
}

// 배치 매칭 처리 - 스케줄러에서 주기적으로 호출
export async function processBatchMatching(): Promise<any> {
  logger.info('배치 매칭 처리 시작');
  
  try {
    // 1. 대기 중인 사용자 가져오기
    const maleUsers = await getQueueItems(QUEUE_NAMES.MALE);
    const femaleUsers = await getQueueItems(QUEUE_NAMES.FEMALE);
    
    logger.info(`대기 중인 사용자: 남성=${maleUsers.length}, 여성=${femaleUsers.length}`);
    
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
        await publishEvent(CHANNELS.MATCH_SUCCESSFUL, {
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
  } catch (error) {
    logger.error('배치 매칭 처리 중 오류:', error);
    return {
      success: false,
      error: 'batch_processing_failed',
      message: '배치 매칭 처리 중 오류가 발생했습니다'
    };
  }
}

// 매칭 상태 조회
export async function getMatchStatus(userId: string): Promise<any> {
  try {
    // 1. 대기 상태 확인
    const isWaiting = await isUserWaitingForMatch(userId);
    
    // 2. 활성 채팅방 확인
    const activeChatRoom = await ChatRoom.findOne({
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
  } catch (error) {
    logger.error('매칭 상태 조회 중 오류:', error);
    return {
      success: false,
      error: 'status_check_failed',
      message: '매칭 상태 조회 중 오류가 발생했습니다'
    };
  }
} 