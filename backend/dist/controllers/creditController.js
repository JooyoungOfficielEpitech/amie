"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentCredit = exports.getCreditUsageInfo = exports.useCredit = exports.chargeCredit = exports.getCreditLogs = exports.CREDIT_DESCRIPTIONS = exports.CREDIT_COSTS = void 0;
const creditService_1 = require("../services/creditService");
const creditService = new creditService_1.CreditService();
// 크레딧 비용 상수를 중앙에서 관리
exports.CREDIT_COSTS = {
    MATCHING: 10,
    PROFILE_UNLOCK: 5
};
// 크레딧 설명 상수
exports.CREDIT_DESCRIPTIONS = {
    MATCHING: '매칭 서비스 이용',
    PROFILE_UNLOCK: '프로필 잠금 해제'
};
// 크레딧 사용 내역 조회
const getCreditLogs = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        const creditLogs = await creditService.getCreditLogs(userId);
        return res.status(200).json({
            success: true,
            data: creditLogs
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '크레딧 사용 내역 조회 중 오류가 발생했습니다.'
        });
    }
};
exports.getCreditLogs = getCreditLogs;
// 크레딧 충전
const chargeCredit = async (req, res) => {
    try {
        const { amount, description } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: '유효한 크레딧 금액을 입력해주세요.' });
        }
        const creditLog = await creditService.chargeCredit(userId, amount, description || '크레딧 충전');
        return res.status(200).json({
            success: true,
            data: creditLog
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '크레딧 충전 중 오류가 발생했습니다.'
        });
    }
};
exports.chargeCredit = chargeCredit;
// 크레딧 사용
const useCredit = async (req, res) => {
    try {
        const { amount, service, description } = req.body;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: '유효한 크레딧 금액을 입력해주세요.' });
        }
        if (!service) {
            return res.status(400).json({ message: '서비스 정보가 필요합니다.' });
        }
        const creditLog = await creditService.useCredit(userId, amount, service, description || `${service} 서비스 이용`);
        return res.status(200).json({
            success: true,
            data: creditLog
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '크레딧 사용 중 오류가 발생했습니다.'
        });
    }
};
exports.useCredit = useCredit;
// 크레딧 사용 정보 조회
const getCreditUsageInfo = async (req, res) => {
    const creditUsageInfo = {
        matching: {
            description: exports.CREDIT_DESCRIPTIONS.MATCHING,
            cost: exports.CREDIT_COSTS.MATCHING
        },
        profileUnlock: {
            description: exports.CREDIT_DESCRIPTIONS.PROFILE_UNLOCK,
            cost: exports.CREDIT_COSTS.PROFILE_UNLOCK
        }
    };
    res.status(200).json({
        success: true,
        data: creditUsageInfo
    });
};
exports.getCreditUsageInfo = getCreditUsageInfo;
// 현재 크레딧 조회
const getCurrentCredit = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        const credit = await creditService.getCurrentCredit(userId);
        return res.status(200).json({
            success: true,
            data: { credit }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '크레딧 조회 중 오류가 발생했습니다.'
        });
    }
};
exports.getCurrentCredit = getCurrentCredit;
