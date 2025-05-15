"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCreditByUserId = getCreditByUserId;
exports.deductUserCredit = deductUserCredit;
exports.addUserCredit = addUserCredit;
exports.getUserCredit = getUserCredit;
exports.getCreditTransactions = getCreditTransactions;
const logger_1 = require("../utils/logger");
const User_1 = __importDefault(require("../models/User"));
const CreditTransaction_1 = __importDefault(require("../models/CreditTransaction"));
// 사용자 ID로 크레딧 정보 조회
async function getCreditByUserId(userId) {
    try {
        const user = await User_1.default.findById(userId).select('credit');
        if (!user) {
            logger_1.logger.warn(`사용자 크레딧 정보 없음: ${userId}`);
            return null;
        }
        return { credit: user.credit };
    }
    catch (error) {
        logger_1.logger.error(`사용자 크레딧 조회 중 오류: ${userId}`, error);
        return null;
    }
}
// 크레딧 차감
async function deductUserCredit(userId, amount, reason, session) {
    logger_1.logger.info(`크레딧 차감 요청: 사용자=${userId}, 금액=${amount}, 사유=${reason}`);
    try {
        // 1. 사용자 찾기
        const user = await User_1.default.findById(userId, null, { session });
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
        await CreditTransaction_1.default.create([{
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
    }
    catch (error) {
        logger_1.logger.error('크레딧 차감 중 오류:', error);
        return {
            success: false,
            error: 'credit_deduction_failed',
            message: '크레딧 차감 중 오류가 발생했습니다'
        };
    }
}
// 크레딧 추가
async function addUserCredit(userId, amount, reason, session) {
    logger_1.logger.info(`크레딧 추가 요청: 사용자=${userId}, 금액=${amount}, 사유=${reason}`);
    try {
        // 1. 사용자 찾기
        const user = await User_1.default.findById(userId, null, { session });
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
        await CreditTransaction_1.default.create([{
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
    }
    catch (error) {
        logger_1.logger.error('크레딧 추가 중 오류:', error);
        return {
            success: false,
            error: 'credit_addition_failed',
            message: '크레딧 추가 중 오류가 발생했습니다'
        };
    }
}
// 크레딧 잔액 조회
async function getUserCredit(userId) {
    try {
        const user = await User_1.default.findById(userId).select('credit');
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
    }
    catch (error) {
        logger_1.logger.error('크레딧 잔액 조회 중 오류:', error);
        return {
            success: false,
            error: 'credit_check_failed',
            message: '크레딧 잔액 조회 중 오류가 발생했습니다'
        };
    }
}
// 크레딧 거래 내역 조회
async function getCreditTransactions(userId, page = 1, limit = 10) {
    try {
        const skip = (page - 1) * limit;
        const transactions = await CreditTransaction_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await CreditTransaction_1.default.countDocuments({ userId });
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
    }
    catch (error) {
        logger_1.logger.error('크레딧 거래 내역 조회 중 오류:', error);
        return {
            success: false,
            error: 'transaction_history_failed',
            message: '크레딧 거래 내역 조회 중 오류가 발생했습니다'
        };
    }
}
