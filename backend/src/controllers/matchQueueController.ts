import { Request, Response } from 'express';
import MatchQueue, { IMatchQueue } from '../models/MatchQueue';
import User from '../models/User';
import { getRedisClient, addToQueue, removeFromQueue } from '../services/redis.service';
import { logger } from '../utils/logger';

// 대기열 등록 (매칭 시작)
export const joinQueue = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // 사용자 존재 여부 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 이미 대기 중인지 확인
    const existingQueue = await MatchQueue.findOne({ 
      userId, 
      isWaiting: true 
    });

    if (existingQueue) {
      return res.status(400).json({ 
        message: '이미 매칭 대기열에 등록되어 있습니다.',
        queueEntry: existingQueue
      });
    }

    // 새 대기열 항목 생성
    const queueEntry = new MatchQueue({
      userId,
      gender: user.gender,
      isWaiting: true
    });

    const savedEntry = await queueEntry.save();

    res.status(201).json({
      message: '매칭 대기열에 등록되었습니다.',
      queueEntry: savedEntry
    });
  } catch (error) {
    console.error('대기열 등록 에러:', error);
    res.status(500).json({ message: '대기열 등록 중 오류가 발생했습니다.' });
  }
};

// 대기열 취소 (매칭 취소)
export const leaveQueue = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const queueEntry = await MatchQueue.findOne({ 
      userId, 
      isWaiting: true 
    });

    if (!queueEntry) {
      return res.status(404).json({ message: '활성화된 대기열 항목을 찾을 수 없습니다.' });
    }

    queueEntry.isWaiting = false;
    await queueEntry.save();

    res.json({ 
      message: '매칭 대기가 취소되었습니다.',
      queueEntry
    });
  } catch (error) {
    console.error('대기열 취소 에러:', error);
    res.status(500).json({ message: '대기열 취소 중 오류가 발생했습니다.' });
  }
};

// 사용자의 대기 상태 확인
export const checkQueueStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const queueEntry = await MatchQueue.findOne({ 
      userId, 
      isWaiting: true 
    });

    if (!queueEntry) {
      return res.status(404).json({ 
        isInQueue: false,
        message: '현재 매칭 대기열에 등록되어 있지 않습니다.' 
      });
    }

    res.json({ 
      isInQueue: true,
      message: '매칭 대기 중입니다.',
      queueEntry
    });
  } catch (error) {
    console.error('대기 상태 확인 에러:', error);
    res.status(500).json({ message: '대기 상태 확인 중 오류가 발생했습니다.' });
  }
};

// 모든 대기열 항목 조회 (관리자용)
export const getAllQueueEntries = async (_req: Request, res: Response) => {
  try {
    const queueEntries = await MatchQueue.find({ isWaiting: true })
      .sort({ createdAt: 1 })
      .populate('userId', 'nickname gender');

    res.json({
      count: queueEntries.length,
      queueEntries
    });
  } catch (error) {
    console.error('대기열 목록 조회 에러:', error);
    res.status(500).json({ message: '대기열 목록 조회 중 오류가 발생했습니다.' });
  }
};

// 매칭 알고리즘 - 대기 중인 이성 상대 찾기 (예시)
export const findMatch = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // 사용자 정보 확인
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 사용자의 성별과 반대 성별 구하기
    const oppositeGender = user.gender === 'male' ? 'female' : 'male';

    // 대기 중인 이성 상대 찾기 (생성 시간순)
    const potentialMatch = await MatchQueue.findOne({ 
      gender: oppositeGender,
      isWaiting: true,
      userId: { $ne: userId } // 자기 자신 제외
    }).sort({ createdAt: 1 });

    if (!potentialMatch) {
      return res.status(404).json({ 
        matched: false,
        message: '현재 매칭 가능한 상대가 없습니다.' 
      });
    }

    // 매칭 성공 처리 (양쪽 모두 isWaiting = false로 변경)
    const userQueue = await MatchQueue.findOne({ 
      userId, 
      isWaiting: true 
    });

    if (!userQueue) {
      return res.status(400).json({ 
        matched: false,
        message: '매칭 대기열에 등록되어 있지 않습니다.' 
      });
    }

    // 매칭 완료 처리
    userQueue.isWaiting = false;
    potentialMatch.isWaiting = false;

    await userQueue.save();
    await potentialMatch.save();

    // 매칭된 상대 정보 반환
    const matchedUser = await User.findById(potentialMatch.userId)
      .select('_id nickname gender birthYear height city profileImages');

    res.json({
      matched: true,
      message: '매칭에 성공했습니다!',
      matchedUser
    });
  } catch (error) {
    console.error('매칭 시도 에러:', error);
    res.status(500).json({ message: '매칭 처리 중 오류가 발생했습니다.' });
  }
};

// Redis와 MongoDB 대기열 동기화 함수
async function syncQueues() {
  try {
    const redisClient = getRedisClient();
    
    // Redis에서 대기 중인 사용자 ID 목록 가져오기
    const redisMaleUsers = await redisClient.zrange('match:queue:male', 0, -1);
    const redisFemaleUsers = await redisClient.zrange('match:queue:female', 0, -1);
    
    // MongoDB에서 대기 중인 사용자 가져오기
    const mongodbWaitingUsers = await MatchQueue.find({ isWaiting: true });
    const mongodbUserIds = mongodbWaitingUsers.map(entry => entry.userId);
    
    // Redis에는 있지만 MongoDB에 없는 사용자
    const redisMaleOnlyUsers = redisMaleUsers.filter(id => !mongodbUserIds.includes(id));
    const redisFemaleOnlyUsers = redisFemaleUsers.filter(id => !mongodbUserIds.includes(id));
    
    let syncCount = 0;
    
    // Redis에만 있는 사용자를 MongoDB에 추가
    for (const userId of [...redisMaleOnlyUsers, ...redisFemaleOnlyUsers]) {
      // 사용자 정보 조회
      const user = await User.findById(userId);
      
      if (user) {
        // 이미 같은 사용자의 활성 대기열 항목이 있는지 확인
        const existingEntry = await MatchQueue.findOne({ 
          userId, 
          isWaiting: true 
        });
        
        if (!existingEntry) {
          // 새 대기열 항목 생성
          const queueEntry = new MatchQueue({
            userId,
            gender: user.gender,
            isWaiting: true
          });
          
          await queueEntry.save();
          syncCount++;
          
          // User 모델의 isWaitingForMatch 필드도 업데이트
          await User.findByIdAndUpdate(userId, { isWaitingForMatch: true });
          
          logger.info(`대기열 동기화: Redis 사용자 ${userId}를 MongoDB에 추가함`);
        }
      } else {
        // 사용자가 존재하지 않으면 Redis에서 제거
        if (redisMaleOnlyUsers.includes(userId)) {
          await redisClient.zrem('match:queue:male', userId);
        } else {
          await redisClient.zrem('match:queue:female', userId);
        }
        logger.warn(`대기열 동기화: 존재하지 않는 사용자 ${userId}를 Redis에서 제거함`);
      }
    }
    
    // MongoDB에는 있지만 Redis에 없는 사용자
    const mongodbMaleUsers = mongodbWaitingUsers.filter(entry => entry.gender === 'male').map(entry => entry.userId);
    const mongodbFemaleUsers = mongodbWaitingUsers.filter(entry => entry.gender === 'female').map(entry => entry.userId);
    
    const mongodbMaleOnlyUsers = mongodbMaleUsers.filter(id => !redisMaleUsers.includes(id));
    const mongodbFemaleOnlyUsers = mongodbFemaleUsers.filter(id => !redisFemaleUsers.includes(id));
    
    // MongoDB에만 있는 사용자를 Redis에 추가
    for (const userId of mongodbMaleOnlyUsers) {
      await redisClient.zadd('match:queue:male', Date.now(), userId);
      syncCount++;
      logger.info(`대기열 동기화: MongoDB 남성 사용자 ${userId}를 Redis에 추가함`);
    }
    
    for (const userId of mongodbFemaleOnlyUsers) {
      await redisClient.zadd('match:queue:female', Date.now(), userId);
      syncCount++;
      logger.info(`대기열 동기화: MongoDB 여성 사용자 ${userId}를 Redis에 추가함`);
    }
    
    return {
      success: true,
      syncCount,
      redisMaleOnlyUsers,
      redisFemaleOnlyUsers,
      mongodbMaleOnlyUsers,
      mongodbFemaleOnlyUsers
    };
  } catch (error: any) {
    logger.error('대기열 동기화 중 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 대기열 통계 확인 및 동기화 (관리자용)
export const getQueueStats = async (req: Request, res: Response) => {
  try {
    // 동기화 요청이 있는 경우 실행
    const shouldSync = req.query.sync === 'true';
    let syncResult = null;
    
    if (shouldSync) {
      syncResult = await syncQueues();
    }
    
    // MongoDB에서 대기 중인 사용자 수 확인
    const maleCount = await MatchQueue.countDocuments({ 
      gender: 'male', 
      isWaiting: true 
    });
    
    const femaleCount = await MatchQueue.countDocuments({ 
      gender: 'female', 
      isWaiting: true 
    });
    
    // 대기 중인 남성/여성 사용자 정보 가져오기
    const maleUsers = await MatchQueue.find({ 
      gender: 'male', 
      isWaiting: true 
    }).populate('userId', 'nickname _id');
    
    const femaleUsers = await MatchQueue.find({ 
      gender: 'female', 
      isWaiting: true 
    }).populate('userId', 'nickname _id');
    
    // userId 필드가 populate 되었는지 확인하고 정보 추출
    const maleUserDetails = maleUsers.map(entry => {
      // userId가 객체일 경우 (populate 성공)
      if (entry.userId && typeof entry.userId === 'object' && 'nickname' in entry.userId) {
        return {
          id: entry._id,
          userId: (entry.userId as any)._id,
          nickname: (entry.userId as any).nickname,
          waitingSince: entry.createdAt
        };
      } 
      // userId가 문자열일 경우 (populate 실패)
      return {
        id: entry._id,
        userId: entry.userId,
        waitingSince: entry.createdAt
      };
    });
    
    const femaleUserDetails = femaleUsers.map(entry => {
      if (entry.userId && typeof entry.userId === 'object' && 'nickname' in entry.userId) {
        return {
          id: entry._id,
          userId: (entry.userId as any)._id,
          nickname: (entry.userId as any).nickname,
          waitingSince: entry.createdAt
        };
      }
      return {
        id: entry._id,
        userId: entry.userId,
        waitingSince: entry.createdAt
      };
    });
    
    // Redis 대기열 정보 가져오기
    const redisClient = getRedisClient();
    let redisMaleCount = 0;
    let redisFemaleCount = 0;
    let redisMaleUsers: string[] = [];
    let redisFemaleUsers: string[] = [];
    
    try {
      redisMaleCount = await redisClient.zcard('match:queue:male');
      redisFemaleCount = await redisClient.zcard('match:queue:female');
      
      // Redis에서 대기 중인 사용자 ID 가져오기
      redisMaleUsers = await redisClient.zrange('match:queue:male', 0, -1);
      redisFemaleUsers = await redisClient.zrange('match:queue:female', 0, -1);
      
      // Redis에만 있는 사용자 정보 가져오기
      const redisOnlyMaleUsers = redisMaleUsers.filter(id => 
        !maleUserDetails.some(user => user.userId === id)
      );
      
      const redisOnlyFemaleUsers = redisFemaleUsers.filter(id => 
        !femaleUserDetails.some(user => user.userId === id)
      );
      
      // Redis에만 있는 사용자 정보 가져오기
      if (redisOnlyMaleUsers.length > 0 || redisOnlyFemaleUsers.length > 0) {
        logger.info(`Redis에만 존재하는 대기 사용자: 남성=${redisOnlyMaleUsers.length}, 여성=${redisOnlyFemaleUsers.length}`);
        
        // Redis에만 있는 모든 사용자 ID 목록
        const redisOnlyUserIds = [...redisOnlyMaleUsers, ...redisOnlyFemaleUsers];
        
        // MongoDB에서 해당 사용자 정보 조회
        const redisOnlyUsers = await User.find({
          _id: { $in: redisOnlyUserIds }
        }).select('_id nickname gender');
        
        // Redis 남성 사용자 상세 정보 추가
        const redisMaleUserDetails = redisOnlyUsers
          .filter(user => user.gender === 'male')
          .map(user => ({
            id: 'redis-only',
            userId: user._id,
            nickname: user.nickname,
            waitingSince: new Date(), // 정확한 시간 알 수 없음
            source: 'redis-only'
          }));
          
        // Redis 여성 사용자 상세 정보 추가  
        const redisFemaleUserDetails = redisOnlyUsers
          .filter(user => user.gender === 'female')
          .map(user => ({
            id: 'redis-only',
            userId: user._id,
            nickname: user.nickname,
            waitingSince: new Date(), // 정확한 시간 알 수 없음
            source: 'redis-only'
          }));
          
        // MongoDB 결과와 Redis 결과 병합
        maleUserDetails.push(...redisMaleUserDetails);
        femaleUserDetails.push(...redisFemaleUserDetails);
      }
    } catch (redisError) {
      console.error('Redis 대기열 정보 조회 중 오류:', redisError);
    }
    
    res.json({
      sync: syncResult,
      mongodb: {
        total: maleCount + femaleCount,
        male: {
          count: maleCount,
          users: maleUserDetails
        },
        female: {
          count: femaleCount,
          users: femaleUserDetails
        }
      },
      redis: {
        total: redisMaleCount + redisFemaleCount,
        male: {
          count: redisMaleCount,
          users: redisMaleUsers
        },
        female: {
          count: redisFemaleCount,
          users: redisFemaleUsers
        }
      },
      inconsistencies: {
        male: redisMaleCount !== maleCount,
        female: redisFemaleCount !== femaleCount
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('대기열 통계 조회 에러:', error);
    res.status(500).json({ message: '대기열 통계 조회 중 오류가 발생했습니다.' });
  }
};

// 단일 사용자를 MongoDB에서 Redis로 동기화
export async function syncUserToRedis(userId: string, gender: string): Promise<boolean> {
  try {
    const queueName = gender === 'male' ? 'match:queue:male' : 'match:queue:female';
    await addToQueue(queueName, userId);
    logger.info(`사용자 ${userId} 동기화: MongoDB → Redis`);
    return true;
  } catch (error) {
    logger.error(`사용자 ${userId} Redis 동기화 실패:`, error);
    return false;
  }
}

// 단일 사용자를 Redis에서 MongoDB로 동기화
export async function syncUserToMongodb(userId: string): Promise<boolean> {
  try {
    // 사용자 정보 확인
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`Redis 동기화 오류: 사용자 ${userId}를 찾을 수 없음`);
      return false;
    }
    
    // 이미 대기 중인지 확인
    const existingEntry = await MatchQueue.findOne({ 
      userId, 
      isWaiting: true 
    });
    
    if (existingEntry) {
      logger.info(`사용자 ${userId}는 이미 MongoDB 대기열에 있음`);
      return true;
    }
    
    // 새 대기열 항목 생성
    const queueEntry = new MatchQueue({
      userId,
      gender: user.gender,
      isWaiting: true
    });
    
    await queueEntry.save();
    
    // User 모델 업데이트
    await User.findByIdAndUpdate(userId, { isWaitingForMatch: true });
    
    logger.info(`사용자 ${userId} 동기화: Redis → MongoDB`);
    return true;
  } catch (error) {
    logger.error(`사용자 ${userId} MongoDB 동기화 실패:`, error);
    return false;
  }
} 