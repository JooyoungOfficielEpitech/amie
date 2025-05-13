"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const initSocketServer = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*', // 실제 배포 환경에서는 허용된 도메인만 설정
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    // JWT 인증 미들웨어
    io.use(async (socket, next) => {
        console.log('!!!!!! io.use() MIDDLEWARE CALLED !!!!!!'); // Add log here
        console.log('[Socket Auth Middleware] Attempting auth...'); // Log start
        try {
            const token = socket.handshake.auth.token;
            console.log('[Socket Auth Middleware] Received token:', token ? 'Token received' : 'No token'); // Log token presence
            if (!token) {
                console.error('[Socket Auth Middleware] Error: No token provided.');
                return next(new Error('인증 토큰이 필요합니다.'));
            }
            // JWT 토큰 검증
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'user-secret-key'); // Use the correct secret key
                console.log('[Socket Auth Middleware] Token decoded successfully:', decoded);
            }
            catch (jwtError) {
                console.error('[Socket Auth Middleware] Error: JWT verification failed.', jwtError.message);
                return next(new Error('유효하지 않은 토큰입니다.'));
            }
            if (!decoded || !decoded.id) {
                console.error('[Socket Auth Middleware] Error: Decoded token is invalid or missing ID.');
                return next(new Error('유효하지 않은 토큰입니다.'));
            }
            // 사용자 정보 로드
            console.log(`[Socket Auth Middleware] Finding user with ID: ${decoded.id}`);
            const user = await User_1.default.findById(decoded.id);
            console.log('[Socket Auth Middleware] User found:', user ? user._id : 'Not found'); // Log user finding result
            if (!user) {
                console.error('[Socket Auth Middleware] Error: User not found in DB.');
                return next(new Error('사용자를 찾을 수 없습니다.'));
            }
            // 소켓에 사용자 정보 저장
            socket.userId = user._id.toString(); // Ensure it's a string
            socket.userInfo = {
                id: user._id.toString(),
                nickname: user.nickname,
                gender: user.gender,
            };
            console.log(`[Socket Auth Middleware] Auth successful for user: ${socket.userId}`);
            next();
        }
        catch (error) {
            console.error('[Socket Auth Middleware] General error during auth:', error.message, error.stack);
            return next(new Error('인증 오류가 발생했습니다.'));
        }
    });
    return io;
};
exports.initSocketServer = initSocketServer;
