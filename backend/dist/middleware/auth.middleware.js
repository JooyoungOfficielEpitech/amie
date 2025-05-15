"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Admin_1 = __importDefault(require("../models/Admin"));
const logger_1 = require("../utils/logger");
// 사용자 JWT 인증 미들웨어
const authenticateJWT = async (req, res, next) => {
    let token;
    // Authorization 헤더에서 Bearer 토큰 추출
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // 토큰 검증
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            // 토큰에서 추출한 ID로 사용자 정보 조회 (비밀번호 해시 제외)
            req.user = await User_1.default.findById(decoded.id).select('-passwordHash');
            if (!req.user) {
                logger_1.logger.warn(`인증 실패: 사용자 ID=${decoded.id}를 찾을 수 없음`);
                res.status(401).json({
                    success: false,
                    error: 'user_not_found',
                    message: '인증 실패: 사용자를 찾을 수 없습니다'
                });
                return;
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('JWT 인증 오류:', error);
            res.status(401).json({
                success: false,
                error: 'invalid_token',
                message: '인증되지 않았습니다'
            });
            return;
        }
    }
    else {
        logger_1.logger.warn('토큰이 제공되지 않음');
        res.status(401).json({
            success: false,
            error: 'no_token',
            message: '인증 토큰이 필요합니다'
        });
        return;
    }
};
exports.authenticateJWT = authenticateJWT;
// 관리자 권한 확인 미들웨어
const isAdmin = async (req, res, next) => {
    try {
        // 먼저 사용자 인증 확인
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'not_authenticated',
                message: '인증이 필요합니다'
            });
            return;
        }
        // 관리자 DB에서 확인
        const admin = await Admin_1.default.findOne({ userId: req.user._id });
        if (!admin) {
            logger_1.logger.warn(`관리자 권한 거부: 사용자=${req.user._id}`);
            res.status(403).json({
                success: false,
                error: 'forbidden',
                message: '관리자 권한이 필요합니다'
            });
            return;
        }
        // 관리자 정보 추가
        req.admin = admin;
        next();
    }
    catch (error) {
        logger_1.logger.error('관리자 권한 확인 중 오류:', error);
        res.status(500).json({
            success: false,
            error: 'internal_error',
            message: '서버 오류가 발생했습니다'
        });
        return;
    }
};
exports.isAdmin = isAdmin;
