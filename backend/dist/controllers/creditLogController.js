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
exports.useProfileUnlockCredit = exports.useMatchCredit = exports.chargeCredit = exports.getCreditLog = exports.getUserCreditLogs = exports.createCreditLog = void 0;
const CreditLog_1 = __importStar(require("../models/CreditLog"));
const User_1 = __importDefault(require("../models/User"));
// 크레딧 사용/충전 로그 생성 및 사용자 크레딧 업데이트
const createCreditLog = async (req, res) => {
    try {
        const { userId, action, amount } = req.body;
        // 유효성 검사
        if (!userId || !action || amount === undefined) {
            return res.status(400).json({ message: '사용자 ID, 작업 유형, 크레딧 수량은 필수 항목입니다.' });
        }
        // 액션 유효성 검사
        if (!Object.values(CreditLog_1.CreditAction).includes(action)) {
            return res.status(400).json({
                message: '유효하지 않은 작업 유형입니다. 유효한 작업 유형: ' + Object.values(CreditLog_1.CreditAction).join(', ')
            });
        }
        // 수량 유효성 검사 (액션에 따라 양수/음수 확인)
        if (action === CreditLog_1.CreditAction.CHARGE && amount <= 0) {
            return res.status(400).json({ message: '충전 수량은 양수여야 합니다.' });
        }
        if ((action === CreditLog_1.CreditAction.MATCH || action === CreditLog_1.CreditAction.PROFILE_UNLOCK) && amount >= 0) {
            return res.status(400).json({ message: '사용 수량은 음수여야 합니다.' });
        }
        // 사용자 존재 확인
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 크레딧 사용 시 잔액 확인
        if (action !== CreditLog_1.CreditAction.CHARGE) {
            if (user.credit + amount < 0) { // amount는 음수일 것임
                return res.status(400).json({ message: '크레딧 잔액이 부족합니다.' });
            }
        }
        try {
            // 크레딧 로그 생성
            const creditLog = new CreditLog_1.default({
                userId,
                action,
                amount
            });
            await creditLog.save();
            // 사용자 크레딧 업데이트
            user.credit += amount;
            await user.save();
            res.status(201).json({
                message: '크레딧 로그가 생성되었습니다.',
                creditLog,
                updatedCredit: user.credit
            });
        }
        catch (error) {
            throw error;
        }
    }
    catch (error) {
        console.error('크레딧 로그 생성 에러:', error);
        res.status(500).json({ message: '크레딧 로그 생성 중 오류가 발생했습니다.' });
    }
};
exports.createCreditLog = createCreditLog;
// 사용자의 크레딧 로그 조회
const getUserCreditLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        // 페이지와 제한 숫자로 변환
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        // 사용자 존재 확인
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 로그 총 개수
        const totalLogs = await CreditLog_1.default.countDocuments({ userId });
        // 로그 조회 (최신순)
        const logs = await CreditLog_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        res.json({
            totalLogs,
            totalPages: Math.ceil(totalLogs / limitNum),
            currentPage: pageNum,
            logs,
            currentCredit: user.credit
        });
    }
    catch (error) {
        console.error('크레딧 로그 조회 에러:', error);
        res.status(500).json({ message: '크레딧 로그 조회 중 오류가 발생했습니다.' });
    }
};
exports.getUserCreditLogs = getUserCreditLogs;
// 특정 크레딧 로그 조회
const getCreditLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const log = await CreditLog_1.default.findById(logId);
        if (!log) {
            return res.status(404).json({ message: '존재하지 않는 크레딧 로그입니다.' });
        }
        res.json(log);
    }
    catch (error) {
        console.error('크레딧 로그 조회 에러:', error);
        res.status(500).json({ message: '크레딧 로그 조회 중 오류가 발생했습니다.' });
    }
};
exports.getCreditLog = getCreditLog;
// 크레딧 충전
const chargeCredit = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        // 유효성 검사
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ message: '사용자 ID와 양수 금액이 필요합니다.' });
        }
        // 로그 생성 및 사용자 크레딧 업데이트를 위해 createCreditLog 호출
        req.body.action = CreditLog_1.CreditAction.CHARGE;
        await (0, exports.createCreditLog)(req, res);
    }
    catch (error) {
        console.error('크레딧 충전 에러:', error);
        res.status(500).json({ message: '크레딧 충전 중 오류가 발생했습니다.' });
    }
};
exports.chargeCredit = chargeCredit;
// 매칭에 크레딧 사용
const useMatchCredit = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        // 유효성 검사 (amount는 음수여야 함)
        if (!userId || !amount || amount >= 0) {
            return res.status(400).json({ message: '사용자 ID와 음수 금액이 필요합니다.' });
        }
        // 로그 생성 및 사용자 크레딧 업데이트를 위해 createCreditLog 호출
        req.body.action = CreditLog_1.CreditAction.MATCH;
        await (0, exports.createCreditLog)(req, res);
    }
    catch (error) {
        console.error('매칭 크레딧 사용 에러:', error);
        res.status(500).json({ message: '매칭 크레딧 사용 중 오류가 발생했습니다.' });
    }
};
exports.useMatchCredit = useMatchCredit;
// 프로필 잠금해제에 크레딧 사용
const useProfileUnlockCredit = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        // 유효성 검사 (amount는 음수여야 함)
        if (!userId || !amount || amount >= 0) {
            return res.status(400).json({ message: '사용자 ID와 음수 금액이 필요합니다.' });
        }
        // 로그 생성 및 사용자 크레딧 업데이트를 위해 createCreditLog 호출
        req.body.action = CreditLog_1.CreditAction.PROFILE_UNLOCK;
        await (0, exports.createCreditLog)(req, res);
    }
    catch (error) {
        console.error('프로필 잠금해제 크레딧 사용 에러:', error);
        res.status(500).json({ message: '프로필 잠금해제 크레딧 사용 중 오류가 발생했습니다.' });
    }
};
exports.useProfileUnlockCredit = useProfileUnlockCredit;
