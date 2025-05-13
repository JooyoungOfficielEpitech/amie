"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchGateway = void 0;
const User_1 = __importDefault(require("../models/User"));
const MatchQueue_1 = __importDefault(require("../models/MatchQueue"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
const creditService_1 = require("../services/creditService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// 매칭 관련 이벤트를 처리하는 클래스
class MatchGateway {
    constructor(io) {
        this.io = io;
        this.MATCHING_CREDIT_COST = 10; // 매칭에 필요한 크레딧
        this.creditService = new creditService_1.CreditService(); // 추가: 크레딧 서비스 인스턴스 생성
        this.matchingUsers = new Map(); // 매칭 대기중인 사용자들
        this.matchingInterval = null;
        this.initialize();
    }
    // 초기화 및 이벤트 리스너 설정
    async initialize() {
        // 매칭 네임스페이스 설정
        const matchNamespace = this.io.of('/match');
        // --- Authentication logic directly within the namespace connection handler ---
        matchNamespace.use(async (socket, next) => {
            console.log('[MatchGateway Auth] Attempting auth...');
            try {
                const token = socket.handshake.auth.token;
                console.log('[MatchGateway Auth] Received token:', token ? 'Token received' : 'No token');
                if (!token) {
                    console.error('[MatchGateway Auth] Error: No token provided.');
                    return next(new Error('Authentication error: No token')); // Use next(error) for namespace middleware
                }
                let decoded;
                try {
                    decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'user-secret-key');
                    console.log('[MatchGateway Auth] Token decoded successfully:', decoded);
                }
                catch (jwtError) {
                    console.error('[MatchGateway Auth] Error: JWT verification failed.', jwtError.message);
                    return next(new Error('Authentication error: Invalid token'));
                }
                if (!decoded || !decoded.id) {
                    console.error('[MatchGateway Auth] Error: Decoded token is invalid or missing ID.');
                    return next(new Error('Authentication error: Invalid decoded token'));
                }
                console.log(`[MatchGateway Auth] Finding user with ID: ${decoded.id}`);
                const user = await User_1.default.findById(decoded.id);
                console.log('[MatchGateway Auth] User found:', user ? user._id : 'Not found');
                if (!user) {
                    console.error('[MatchGateway Auth] Error: User not found in DB.');
                    return next(new Error('Authentication error: User not found'));
                }
                socket.userId = user._id.toString();
                socket.userInfo = {
                    id: user._id.toString(),
                    nickname: user.nickname,
                    gender: user.gender,
                };
                console.log(`[MatchGateway Auth] Auth successful for user: ${socket.userId}`);
                next(); // Proceed to connection handler
            }
            catch (error) {
                console.error('[MatchGateway Auth] General error during auth:', error.message);
                return next(new Error('Authentication error: Server error'));
            }
        });
        // --- End of Authentication logic ---
        matchNamespace.on('connection', async (socket) => {
            // Now userId should be set here if authentication was successful
            console.log(`User connected to match: ${socket.userId}`);
            // Handle cases where middleware failed but connection still established (should ideally not happen with next(error))
            if (!socket.userId) {
                console.error('Connection established but userId is still missing!');
                socket.disconnect(); // Disconnect if userId is missing
                return;
            }
            // --- Check initial match status from DB --- 
            try {
                const user = await User_1.default.findById(socket.userId);
                if (user && user.isWaitingForMatch) {
                    console.log(`[MatchGateway Connection] User ${socket.userId} was already waiting. Restoring state.`);
                    this.matchingUsers.set(socket.userId, socket); // Add to in-memory map
                    socket.emit('current_match_status', { isMatching: true }); // Notify frontend
                }
                else {
                    // Ensure DB state is false if not waiting (consistency check)
                    if (user && !user.isWaitingForMatch && this.matchingUsers.has(socket.userId)) {
                        console.warn(`[MatchGateway Connection] User ${socket.userId} is not waiting in DB but was in memory map. Removing from map.`);
                        this.matchingUsers.delete(socket.userId);
                    }
                    // Optionally notify frontend that they are not matching
                    // socket.emit('current_match_status', { isMatching: false }); 
                }
            }
            catch (error) {
                console.error(`[MatchGateway Connection] Error checking initial status for ${socket.userId}:`, error);
                // Handle error appropriately
            }
            // --- End Check initial match status --- 
            // --- Start Match Event Listener ---
            socket.on('start_match', async () => {
                await this.handleStartMatch(socket);
            });
            // --- End Start Match Event Listener ---
            // Change listener from 'stop_match' to 'cancel_match'
            socket.on('cancel_match', async () => {
                await this.handleCancelMatch(socket);
            });
            // 매칭 상태 확인 이벤트 (Keep as is or remove if not used by frontend)
            socket.on('check-match-status', async () => {
                await this.handleCheckMatchStatus(socket);
            });
            // 연결 해제 이벤트
            socket.on('disconnect', () => {
                console.log(`User disconnected from match: ${socket.userId}`);
                // Only remove from the in-memory map, DB state persists
                if (socket.userId) {
                    this.matchingUsers.delete(socket.userId);
                    console.log(`[MatchGateway Disconnect] Removed user ${socket.userId} from in-memory map only.`);
                }
            });
        });
        // 주기적인 매칭 처리 (10초마다)
        setInterval(() => {
            this.processMatching();
        }, 10000);
    }
    // --- Start Match Handler ---
    async handleStartMatch(socket) {
        try {
            if (!socket.userId)
                return;
            const userId = socket.userId;
            console.log(`[handleStartMatch] Received start_match from user ${userId}`);
            // 이미 매칭 대기 중인지 확인
            const existingQueue = await MatchQueue_1.default.findOne({
                userId: userId,
                isWaiting: true
            });
            if (existingQueue) {
                console.log(`[handleStartMatch] User ${userId} is already in the matching queue.`);
                return socket.emit('match_error', { message: '이미 매칭 대기 중입니다.' });
            }
            // 사용자 정보 조회
            const user = await User_1.default.findById(userId);
            if (!user) {
                console.log(`[handleStartMatch] User ${userId} not found.`);
                return socket.emit('match_error', { message: '사용자 정보를 찾을 수 없습니다.' });
            }
            const userGender = user.gender;
            if (!userGender) {
                console.log(`[handleStartMatch] User ${userId} has no gender specified.`);
                return socket.emit('match_error', { message: '성별 정보가 없어 매칭할 수 없습니다.' });
            }
            console.log(`[handleStartMatch] Proceeding with match request for user ${userId}`);
            // 매칭 대기열에 등록
            console.log(`[handleStartMatch] Adding user ${userId} to DB match queue.`);
            const matchQueue = new MatchQueue_1.default({
                userId: userId,
                gender: userGender,
                isWaiting: true
            });
            await matchQueue.save();
            // User 모델의 isWaitingForMatch 필드도 업데이트
            console.log(`[handleStartMatch] Updating User.isWaitingForMatch to true for user ${userId}`);
            await User_1.default.findByIdAndUpdate(userId, { isWaitingForMatch: true });
            // 매칭 대기 중인 사용자 목록에 추가 (In-memory map for faster access if needed)
            this.matchingUsers.set(userId, socket);
            console.log(`[handleStartMatch] User ${userId} added to the in-memory matching users map.`);
            // 즉시 매칭 시도 (Keep existing logic)
            console.log(`[handleStartMatch] Attempting immediate match for user ${userId}.`);
            this.tryMatchForUser(userId, userGender);
            console.log(`[handleStartMatch] Request processed successfully for user ${userId}.`);
        }
        catch (error) {
            console.error('[handleStartMatch] Error:', error);
            socket.emit('match_error', { message: '매칭 시작 중 오류가 발생했습니다.' });
        }
    }
    // --- End Start Match Handler ---
    // 매칭 요청 처리 (Rename or remove this if replaced by handleStartMatch)
    /*
    private async handleMatchRequest(socket: UserSocket) {
       // ... original handleMatchRequest code ...
    }
    */
    // 매칭 취소 처리 (handleCancelMatch remains mostly the same)
    async handleCancelMatch(socket) {
        try {
            if (!socket.userId)
                return; // No user ID, nothing to cancel
            const userId = socket.userId;
            console.log(`[handleCancelMatch] Attempting to cancel match for user: ${userId}`);
            // 대기 중인 매칭 요청 확인
            const queueEntry = await MatchQueue_1.default.findOne({
                userId: userId,
                isWaiting: true
            });
            // If not waiting in DB queue, nothing to cancel there
            if (!queueEntry) {
                console.log(`[handleCancelMatch] User ${userId} not found waiting in DB queue.`);
                // Also remove from the in-memory map just in case
                if (this.matchingUsers.has(userId)) {
                    this.matchingUsers.delete(userId);
                    console.log(`[handleCancelMatch] Removed user ${userId} from in-memory matching users map.`);
                }
                // Emit cancelled event even if not found, as the goal is achieved (not waiting)
                socket.emit('match_cancelled');
                return;
            }
            // 매칭 대기 상태 변경 (DB)
            queueEntry.isWaiting = false;
            await queueEntry.save();
            console.log(`[handleCancelMatch] Updated DB queue entry for user ${userId} to not waiting.`);
            // User 모델의 isWaitingForMatch 필드도 false로 업데이트
            console.log(`[handleCancelMatch] Updating User.isWaitingForMatch to false for user ${userId}`);
            await User_1.default.findByIdAndUpdate(userId, { isWaitingForMatch: false });
            // 매칭 대기 중인 사용자 목록에서 제거 (In-memory map)
            if (this.matchingUsers.has(userId)) {
                this.matchingUsers.delete(userId);
                console.log(`[handleCancelMatch] Removed user ${userId} from in-memory map.`);
            }
            else {
                console.warn(`[handleCancelMatch] User ${userId} was in DB queue but not in in-memory map.`);
            }
            // Emit success event to the client
            socket.emit('match_cancelled');
            console.log(`[handleCancelMatch] Emitted 'match_cancelled' to user ${userId}`);
        }
        catch (error) {
            console.error('[handleCancelMatch] Error:', error);
            // Emit error event to the client
            socket.emit('cancel_error', { message: error.message || '매칭 취소 중 오류가 발생했습니다.' });
        }
    }
    // 매칭 상태 확인 처리
    async handleCheckMatchStatus(socket) {
        try {
            if (!socket.userId)
                return;
            // 현재 대기 중인 매칭 요청 확인
            const queueEntry = await MatchQueue_1.default.findOne({
                userId: socket.userId,
                isWaiting: true
            });
            // 대기 중인 매칭이 있는 경우
            if (queueEntry) {
                return socket.emit('match-status', {
                    isWaiting: true,
                    matchedUser: null,
                    queuedAt: queueEntry.createdAt
                });
            }
            // 최근 매칭된 결과 확인 (최근 1시간 이내)
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);
            // 타입 단언을 사용하여 업데이트 시간 속성에 접근합니다
            const recentMatch = await MatchQueue_1.default.findOne({
                userId: socket.userId,
                isWaiting: false,
                updatedAt: { $gte: oneHourAgo }
            }).sort({ updatedAt: -1 });
            if (!recentMatch) {
                return socket.emit('match-status', {
                    isWaiting: false,
                    matchedUser: null
                });
            }
            // 최근 생성된 채팅방 찾기
            const recentChatRoom = await ChatRoom_1.default.findOne({
                $or: [
                    { user1Id: socket.userId },
                    { user2Id: socket.userId }
                ],
                createdAt: { $gte: recentMatch.updatedAt }
            }).sort({ createdAt: -1 });
            if (!recentChatRoom) {
                return socket.emit('match-status', {
                    isWaiting: false,
                    matchedUser: null
                });
            }
            // 매칭된 상대방 ID 찾기
            const matchedUserId = recentChatRoom.user1Id === socket.userId
                ? recentChatRoom.user2Id
                : recentChatRoom.user1Id;
            // 매칭된 상대방 정보
            const matchedUser = await User_1.default.findById(matchedUserId).select('_id nickname birthYear height city profileImages gender');
            if (!matchedUser) {
                return socket.emit('match-status', {
                    isWaiting: false,
                    matchedUser: null
                });
            }
            // 상대방 정보 반환 (프로필 이미지는 블러 처리)
            const blurredProfileImages = matchedUser.profileImages.map((img) => `blurred-${img}`);
            socket.emit('match-status', {
                isWaiting: false,
                matchedUser: {
                    id: matchedUser._id,
                    nickname: matchedUser.nickname,
                    birthYear: matchedUser.birthYear,
                    height: matchedUser.height,
                    city: matchedUser.city,
                    gender: matchedUser.gender,
                    profileImages: blurredProfileImages,
                    chatRoomId: recentChatRoom._id
                }
            });
        }
        catch (error) {
            console.error('Check match status error:', error);
            socket.emit('match_error', { message: '매칭 상태 확인 중 오류가 발생했습니다.' });
        }
    }
    // 매칭 처리 루프
    async processMatching() {
        // 대기열에 있는 모든 사용자 조회
        const waitingUsers = await MatchQueue_1.default.find({ isWaiting: true })
            .sort({ createdAt: 1 }); // 오래 기다린 사용자 우선
        // 성별별 대기 목록
        const maleWaiting = waitingUsers.filter((user) => user.gender === 'male');
        const femaleWaiting = waitingUsers.filter((user) => user.gender === 'female');
        // 매칭 가능한 쌍만큼 반복
        const pairsToMatch = Math.min(maleWaiting.length, femaleWaiting.length);
        for (let i = 0; i < pairsToMatch; i++) {
            const maleUser = maleWaiting[i];
            const femaleUser = femaleWaiting[i];
            // 두 사용자 매칭
            await this.matchUsers(maleUser.userId, femaleUser.userId);
        }
    }
    // 특정 사용자의 성별에 맞는 매칭 찾기
    async tryMatchForUser(userId, gender) {
        console.log(`[tryMatchForUser] Checking matches for user: ${userId} (${gender})`);
        const targetGender = gender === 'male' ? 'female' : 'male';
        // Find a user in the in-memory map of the opposite gender who is ALSO waiting in DB
        let matchedUserId = null;
        for (const [otherUserId, otherSocket] of this.matchingUsers.entries()) {
            if (otherUserId !== userId && otherSocket.userInfo?.gender === targetGender) {
                // Verify the potential match is also waiting in the DB
                const potentialMatchUser = await User_1.default.findById(otherUserId);
                if (potentialMatchUser && potentialMatchUser.isWaitingForMatch) {
                    matchedUserId = otherUserId;
                    break; // Found a valid match
                }
            }
        }
        if (matchedUserId) {
            console.log(`[tryMatchForUser] Found potential match: ${userId} and ${matchedUserId}`);
            // Ensure the current user is also still waiting in DB before proceeding
            const currentUser = await User_1.default.findById(userId);
            if (currentUser && currentUser.isWaitingForMatch) {
                await this.matchUsers(userId, matchedUserId);
            }
            else {
                console.log(`[tryMatchForUser] Current user ${userId} is no longer waiting in DB. Aborting match.`);
            }
        }
        else {
            console.log(`[tryMatchForUser] No suitable match found immediately for ${userId}`);
        }
    }
    // 두 사용자 매칭 처리
    async matchUsers(maleUserId, femaleUserId) {
        try {
            // 두 사용자의 대기 상태 변경
            await MatchQueue_1.default.updateMany({ userId: { $in: [maleUserId, femaleUserId] }, isWaiting: true }, { isWaiting: false });
            // User 모델의 isWaitingForMatch 필드도 false로 업데이트
            await User_1.default.updateMany({ _id: { $in: [maleUserId, femaleUserId] } }, { isWaitingForMatch: false });
            // 채팅방 생성
            const chatRoom = new ChatRoom_1.default({
                user1Id: maleUserId,
                user2Id: femaleUserId,
                isActive: true
            });
            await chatRoom.save();
            // 매칭 성사 시 양쪽 사용자의 크레딧 차감 (각 10 크레딧)
            try {
                // 남성 사용자 크레딧 차감
                await this.creditService.useCredit(maleUserId, this.MATCHING_CREDIT_COST, 'match', '매칭 성사');
                // 여성 사용자 크레딧 차감
                await this.creditService.useCredit(femaleUserId, this.MATCHING_CREDIT_COST, 'match', '매칭 성사');
                console.log(`[matchUsers] Credits deducted from users: ${maleUserId} and ${femaleUserId}`);
            }
            catch (creditError) {
                console.error('[matchUsers] Error deducting credits:', creditError);
                // 크레딧 차감 실패 시에도 매칭은 진행 (중요! 사용자 경험 고려)
                // 실제 환경에서는 롤백 또는 다른 대응책이 필요할 수 있음
            }
            // 두 사용자에게 매칭 알림
            const maleSocket = this.matchingUsers.get(maleUserId);
            const femaleSocket = this.matchingUsers.get(femaleUserId);
            // 매칭 대기자 목록에서 제거
            this.matchingUsers.delete(maleUserId);
            this.matchingUsers.delete(femaleUserId);
            // 남성 사용자 정보
            const maleUser = await User_1.default.findById(maleUserId)
                .select('_id nickname birthYear height city profileImages');
            // 여성 사용자 정보
            const femaleUser = await User_1.default.findById(femaleUserId)
                .select('_id nickname birthYear height city profileImages');
            if (maleUser && femaleUser) {
                // 남성 사용자에게 알림
                if (maleSocket) {
                    const blurredFemaleImages = femaleUser.profileImages.map((img) => `blurred-${img}`);
                    maleSocket.emit('match_success', {
                        roomId: chatRoom._id.toString(),
                        partner: {
                            id: femaleUser._id,
                            nickname: femaleUser.nickname,
                            age: new Date().getFullYear() - (femaleUser.birthYear || 0),
                            height: femaleUser.height,
                            city: femaleUser.city,
                            profilePictures: blurredFemaleImages
                        },
                        creditUsed: this.MATCHING_CREDIT_COST // 매칭에 사용된 크레딧
                    });
                }
                // 여성 사용자에게 알림
                if (femaleSocket) {
                    const blurredMaleImages = maleUser.profileImages.map((img) => `blurred-${img}`);
                    femaleSocket.emit('match_success', {
                        roomId: chatRoom._id.toString(),
                        partner: {
                            id: maleUser._id,
                            nickname: maleUser.nickname,
                            age: new Date().getFullYear() - (maleUser.birthYear || 0),
                            height: maleUser.height,
                            city: maleUser.city,
                            profilePictures: blurredMaleImages
                        },
                        creditUsed: this.MATCHING_CREDIT_COST // 매칭에 사용된 크레딧
                    });
                }
            }
            console.log(`Matched users: ${maleUserId} and ${femaleUserId}, created chat room: ${chatRoom._id}`);
        }
        catch (error) {
            console.error('Match users error:', error);
            // Notify users about the error?
            const maleSocket = this.matchingUsers.get(maleUserId);
            const femaleSocket = this.matchingUsers.get(femaleUserId);
            if (maleSocket)
                maleSocket.emit('match_error', { message: '매칭 처리 중 오류 발생' });
            if (femaleSocket)
                femaleSocket.emit('match_error', { message: '매칭 처리 중 오류 발생' });
            // Clean up? Remove users from matchingUsers map?
            this.matchingUsers.delete(maleUserId);
            this.matchingUsers.delete(femaleUserId);
        }
    }
}
exports.MatchGateway = MatchGateway;
