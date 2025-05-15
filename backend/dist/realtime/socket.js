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
        },
        // 소켓 서버 타임아웃 설정 추가
        pingTimeout: 60000, // 핑 타임아웃을 60초로 설정 (기본값보다 증가)
        pingInterval: 25000, // 핑 간격을 25초로 설정 (기본값보다 증가)
        connectTimeout: 30000 // 연결 타임아웃 30초
    });
    // JWT 인증 미들웨어
    io.use(async (socket, next) => {
        console.log('!!!!!! io.use() MIDDLEWARE CALLED !!!!!!'); // Add log here
        console.log('[Socket Auth Middleware] Attempting auth...'); // Log start
        /*
        // !!!!! 긴급 수정: 인증 문제 디버깅을 위해 인증 절차를 일시적으로 우회 !!!!!
        console.log('[Socket Auth Middleware] *** WARNING: Auth check bypassed for debugging ***');
        
        // 테스트용 임시 사용자 ID 설정 (실제 환경에서는 제거)
        socket.userId = '5f0194f2-b076-49b7-bf4d-65502cb2b901'; // 기존 로그에서 확인된 사용자 ID
        socket.userInfo = {
          id: '5f0194f2-b076-49b7-bf4d-65502cb2b901',
          nickname: 'fem',
          gender: 'female',
        };
        
        // 인증 성공으로 처리
        console.log(`[Socket Auth Middleware] Auth successful for user (BYPASS MODE): ${socket.userId}`);
        next();
        */
        // 원래 인증 코드 활성화
        try {
            // 헤더의 auth 객체에서 토큰 확인
            const authToken = socket.handshake.auth.token;
            // URL 쿼리 스트링에서 토큰 확인
            const queryToken = socket.handshake.query.token;
            // 둘 중 하나 사용
            let token = authToken || queryToken;
            // 문자열로 변환 (queryToken은 문자열 배열일 수 있음)
            if (token && Array.isArray(token)) {
                token = token[0];
            }
            console.log('[Socket Auth Middleware] Received token from:', authToken ? 'auth object' : (queryToken ? 'query string' : 'nowhere'), token ? `Token received (${typeof token})` : 'No token');
            // 토큰 디버깅: 첫 몇 글자만 출력
            if (token) {
                console.log('[Socket Auth Middleware] Token preview:', typeof token === 'string' ? token.slice(0, 20) + '...' : 'Token is not a string');
            }
            if (!token) {
                console.error('[Socket Auth Middleware] Error: No token provided.');
                return next(new Error('인증 토큰이 필요합니다.'));
            }
            // JWT 토큰 검증
            let decoded;
            try {
                // 토큰을 문자열로 변환 시도
                const tokenStr = typeof token === 'string' ? token : String(token);
                console.log('[Socket Auth Middleware] Verifying token...');
                // 실제 시크릿 키의 일부를 디버깅용으로 출력 (보안상의 이유로 전체 키는 출력하지 않음)
                const secretKeyPreview = process.env.JWT_SECRET ?
                    process.env.JWT_SECRET.substring(0, 5) + '...' + process.env.JWT_SECRET.substring(process.env.JWT_SECRET.length - 5) :
                    'No secret key';
                console.log('[Socket Auth Middleware] JWT secret preview:', secretKeyPreview);
                decoded = jsonwebtoken_1.default.verify(tokenStr, process.env.JWT_SECRET || 'user-secret-key');
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
            // 인증 정보를 handshake에도 저장 (다른 네임스페이스에서 사용 가능하도록)
            socket.handshake.auth.userId = user._id.toString();
            socket.handshake.query.userId = user._id.toString();
            console.log(`[Socket Auth Middleware] Auth successful for user: ${socket.userId}, gender: ${user.gender}`);
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
