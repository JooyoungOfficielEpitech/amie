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
exports.CreditService = void 0;
const CreditLog_1 = __importStar(require("../models/CreditLog"));
const User_1 = __importDefault(require("../models/User"));
class CreditService {
    // 크레딧 충전
    async chargeCredit(userId, amount, description) {
        try {
            // 사용자의 크레딧 업데이트
            const user = await User_1.default.findByIdAndUpdate(userId, { $inc: { credit: amount } }, { new: true });
            if (!user) {
                throw new Error('사용자를 찾을 수 없습니다');
            }
            // 크레딧 로그 생성
            const creditLog = await CreditLog_1.default.create({
                userId: userId,
                amount,
                action: CreditLog_1.CreditAction.CHARGE
            });
            return creditLog;
        }
        catch (error) {
            throw error;
        }
    }
    // 크레딧 사용
    async useCredit(userId, amount, service, description) {
        try {
            // 사용자 조회
            const user = await User_1.default.findById(userId);
            if (!user) {
                throw new Error('사용자를 찾을 수 없습니다');
            }
            // 크레딧이 충분한지 확인
            if (user.credit < amount) {
                throw new Error('크레딧이 부족합니다');
            }
            // 사용자의 크레딧 차감
            await User_1.default.findByIdAndUpdate(userId, { $inc: { credit: -amount } });
            // 크레딧 로그 생성 (서비스에 따라 액션 결정)
            let action = CreditLog_1.CreditAction.MATCH; // 기본값
            if (service === 'profileUnlock') {
                action = CreditLog_1.CreditAction.PROFILE_UNLOCK;
            }
            const creditLog = await CreditLog_1.default.create({
                userId: userId,
                amount: -amount,
                action: action
            });
            return creditLog;
        }
        catch (error) {
            throw error;
        }
    }
    // 사용자의 크레딧 로그 조회
    async getCreditLogs(userId) {
        return CreditLog_1.default.find({ userId }).sort({ createdAt: -1 });
    }
    // 사용자의 현재 크레딧 조회
    async getCurrentCredit(userId) {
        const user = await User_1.default.findById(userId).select('credit');
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다');
        }
        return user.credit;
    }
    // 지정된 액션으로 크레딧 차감 (트랜잭션 제거 버전)
    async deductCredits(userId, cost, action, description) {
        if (cost <= 0) {
            throw new Error('차감 비용은 양수여야 합니다.');
        }
        // 트랜잭션 시작/종료 로직 제거
        try {
            const user = await User_1.default.findById(userId); // 세션 제거
            if (!user) {
                throw new Error('사용자를 찾을 수 없습니다.');
            }
            if (user.credit < cost) {
                throw new Error('크레딧 잔액이 부족합니다.');
            }
            // 사용자 크레딧 업데이트
            user.credit -= cost;
            await user.save(); // 세션 제거
            // 크레딧 로그 생성
            const creditLog = new CreditLog_1.default({
                userId,
                action,
                amount: -cost, // 실제 차감액은 음수로 기록
                description
            });
            await creditLog.save(); // 세션 제거
            // 커밋/어보트 로직 제거
            return creditLog;
        }
        catch (error) {
            // 롤백 로직 제거
            throw error;
        }
        // 세션 종료 로직 제거
    }
}
exports.CreditService = CreditService;
