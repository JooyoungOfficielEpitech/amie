"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestMatch = requestMatch;
exports.cancelMatch = cancelMatch;
exports.checkMatchStatus = checkMatchStatus;
exports.runBatchMatching = runBatchMatching;
const matching_service_1 = require("../services/matching.service");
const logger_1 = require("../utils/logger");
// 매칭 요청 처리
async function requestMatch(req, res) {
    try {
        const userId = req.user?.id;
        const { gender } = req.user;
        const userInfo = req.body.userInfo || {};
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'unauthorized',
                message: '인증되지 않은 사용자입니다'
            });
        }
        const result = await (0, matching_service_1.processMatchRequest)(userId, gender, userInfo);
        if (result.success) {
            return res.status(200).json(result);
        }
        else {
            return res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error('매칭 요청 처리 중 오류:', error);
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
            message: '서버 오류가 발생했습니다'
        });
    }
}
// 매칭 취소 처리
async function cancelMatch(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'unauthorized',
                message: '인증되지 않은 사용자입니다'
            });
        }
        const result = await (0, matching_service_1.cancelMatchRequest)(userId);
        if (result.success) {
            return res.status(200).json(result);
        }
        else {
            return res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error('매칭 취소 처리 중 오류:', error);
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
            message: '서버 오류가 발생했습니다'
        });
    }
}
// 매칭 상태 조회
async function checkMatchStatus(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'unauthorized',
                message: '인증되지 않은 사용자입니다'
            });
        }
        const result = await (0, matching_service_1.getMatchStatus)(userId);
        if (result.success) {
            return res.status(200).json(result);
        }
        else {
            return res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error('매칭 상태 조회 중 오류:', error);
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
            message: '서버 오류가 발생했습니다'
        });
    }
}
// 배치 매칭 처리 (관리자용 또는 스케줄러용)
async function runBatchMatching(req, res) {
    try {
        // 관리자 권한 체크는 미들웨어로 처리한다고 가정
        const result = await (0, matching_service_1.processBatchMatching)();
        if (result.success) {
            return res.status(200).json(result);
        }
        else {
            return res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error('배치 매칭 처리 중 오류:', error);
        return res.status(500).json({
            success: false,
            error: 'internal_server_error',
            message: '서버 오류가 발생했습니다'
        });
    }
}
