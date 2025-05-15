import { logger } from '../utils/logger';
import User from '../models/User';
import CreditTransaction from '../models/CreditTransaction';
import mongoose from 'mongoose';

// 사용자 ID로 크레딧 정보 조회
export async function getCreditByUserId(userId: string): Promise<{ credit: number } | null> {
  try {
    const user = await User.findById(userId).select('credit');
    if (!user) {
      logger.warn(`사용자 크레딧 정보 없음: ${userId}`);
      return null;
    }
    
    return { credit: user.credit };
  } catch (error) {
    logger.error(`사용자 크레딧 조회 중 오류: ${userId}`, error);
    return null;
  }
}

// 크레딧 차감
export async function deductUserCredit(
  userId: string, 
  amount: number, 
  reason: string,
  session?: mongoose.ClientSession
): Promise<any> {
  logger.info(`크레딧 차감 요청: 사용자=${userId}, 금액=${amount}, 사유=${reason}`);
  
  try {
    // 1. 사용자 찾기
    const user = await User.findById(userId, null, { session });
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: '사용자를 찾을 수 없습니다'
      };
    }
    
    // 2. 잔액 확인
    if (user.credit < amount) {
      return {
        success: false,
        error: 'insufficient_credit',
        message: '크레딧이 부족합니다',
        currentCredit: user.credit,
        requiredCredit: amount
      };
    }
    
    // 3. 크레딧 차감
    user.credit -= amount;
    await user.save({ session });
    
    // 4. 트랜잭션 기록
    await CreditTransaction.create([{
      userId,
      amount: -amount,
      type: 'DEDUCTION',
      reason,
      balanceAfter: user.credit
    }], { session: session });
    
    return {
      success: true,
      deductedAmount: amount,
      currentCredit: user.credit
    };
  } catch (error) {
    logger.error('크레딧 차감 중 오류:', error);
    return {
      success: false,
      error: 'credit_deduction_failed',
      message: '크레딧 차감 중 오류가 발생했습니다'
    };
  }
}

// 크레딧 추가
export async function addUserCredit(
  userId: string, 
  amount: number, 
  reason: string,
  session?: mongoose.ClientSession
): Promise<any> {
  logger.info(`크레딧 추가 요청: 사용자=${userId}, 금액=${amount}, 사유=${reason}`);
  
  try {
    // 1. 사용자 찾기
    const user = await User.findById(userId, null, { session });
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: '사용자를 찾을 수 없습니다'
      };
    }
    
    // 2. 크레딧 추가
    user.credit += amount;
    await user.save({ session });
    
    // 3. 트랜잭션 기록
    await CreditTransaction.create([{
      userId,
      amount: amount,
      type: 'ADDITION',
      reason,
      balanceAfter: user.credit
    }], { session: session });
    
    return {
      success: true,
      addedAmount: amount,
      currentCredit: user.credit
    };
  } catch (error) {
    logger.error('크레딧 추가 중 오류:', error);
    return {
      success: false,
      error: 'credit_addition_failed',
      message: '크레딧 추가 중 오류가 발생했습니다'
    };
  }
}

// 크레딧 잔액 조회
export async function getUserCredit(userId: string): Promise<any> {
  try {
    const user = await User.findById(userId).select('credit');
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: '사용자를 찾을 수 없습니다'
      };
    }
    
    return {
      success: true,
      credit: user.credit
    };
  } catch (error) {
    logger.error('크레딧 잔액 조회 중 오류:', error);
    return {
      success: false,
      error: 'credit_check_failed',
      message: '크레딧 잔액 조회 중 오류가 발생했습니다'
    };
  }
}

// 크레딧 거래 내역 조회
export async function getCreditTransactions(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<any> {
  try {
    const skip = (page - 1) * limit;
    
    const transactions = await CreditTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await CreditTransaction.countDocuments({ userId });
    
    return {
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('크레딧 거래 내역 조회 중 오류:', error);
    return {
      success: false,
      error: 'transaction_history_failed',
      message: '크레딧 거래 내역 조회 중 오류가 발생했습니다'
    };
  }
} 