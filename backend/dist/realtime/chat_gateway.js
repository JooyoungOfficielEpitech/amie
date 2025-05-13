"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// 채팅방 관련 이벤트와 메시지 송수신을 처리하는 클래스
class ChatGateway {
    constructor(io) {
        this.io = io;
        this.initialize();
    }
    // 초기화 및 이벤트 리스너 설정
    initialize() {
        // 채팅 네임스페이스 설정
        const chatNamespace = this.io.of('/chat');
        // --- Authentication Middleware for /chat namespace --- 
        chatNamespace.use(async (socket, next) => {
            console.log('[ChatGateway Auth] Attempting auth...');
            try {
                const token = socket.handshake.auth.token;
                console.log('[ChatGateway Auth] Received token:', token ? 'Token received' : 'No token');
                if (!token) {
                    console.error('[ChatGateway Auth] Error: No token provided.');
                    return next(new Error('Authentication error: No token'));
                }
                let decoded;
                try {
                    decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'user-secret-key');
                    console.log('[ChatGateway Auth] Token decoded successfully:', decoded);
                }
                catch (jwtError) {
                    console.error('[ChatGateway Auth] Error: JWT verification failed.', jwtError.message);
                    return next(new Error('Authentication error: Invalid token'));
                }
                if (!decoded || !decoded.id) {
                    console.error('[ChatGateway Auth] Error: Decoded token is invalid or missing ID.');
                    return next(new Error('Authentication error: Invalid decoded token'));
                }
                console.log(`[ChatGateway Auth] Finding user with ID: ${decoded.id}`);
                const user = await User_1.default.findById(decoded.id);
                console.log('[ChatGateway Auth] User found:', user ? user._id : 'Not found');
                if (!user) {
                    console.error('[ChatGateway Auth] Error: User not found in DB.');
                    return next(new Error('Authentication error: User not found'));
                }
                socket.userId = user._id.toString();
                socket.userInfo = {
                    id: user._id.toString(),
                    nickname: user.nickname,
                    gender: user.gender,
                };
                console.log(`[ChatGateway Auth] Auth successful for user: ${socket.userId}`);
                next(); // Proceed to connection handler
            }
            catch (error) {
                console.error('[ChatGateway Auth] General error during auth:', error.message);
                return next(new Error('Authentication error: Server error'));
            }
        });
        // --- End Authentication Middleware ---
        chatNamespace.on('connection', async (socket) => {
            // userId should be set here now
            console.log(`User connected to chat: ${socket.userId}`);
            // Add check for userId just in case middleware failed unexpectedly
            if (!socket.userId) {
                console.error('Chat connection established but userId is missing!');
                socket.disconnect();
                return;
            }
            // 사용자의 채팅방 자동 참여
            this.joinUserRooms(socket);
            // 채팅방 참여 이벤트
            socket.on('join-room', (roomId) => {
                this.joinRoom(socket, roomId);
            });
            // 채팅방 나가기 이벤트 (이름 변경 및 로직 수정 필요)
            socket.on('leave_chat', async (roomId) => {
                await this.handleLeaveChat(socket, roomId); // 호출 함수 변경
            });
            // 메시지 전송 이벤트
            socket.on('send-message', async (data) => {
                await this.handleSendMessage(socket, data);
            });
            // 타이핑 중 이벤트
            socket.on('typing', (data) => {
                this.handleTyping(socket, data);
            });
            // 읽음 상태 이벤트
            socket.on('read-messages', (data) => {
                this.handleReadMessages(socket, data);
            });
            // 연결 해제 이벤트
            socket.on('disconnect', () => {
                console.log(`User disconnected from chat: ${socket.userId}`);
                if (socket.userId) {
                    // 소켓이 참여하고 있던 방 목록 (자신의 ID 제외)
                    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
                    rooms.forEach(roomId => {
                        // 해당 방에 있는 다른 사용자들에게 알림
                        socket.to(roomId).emit('user-disconnected', {
                            roomId,
                            userId: socket.userId
                        });
                        console.log(`Notified room ${roomId} about user ${socket.userId} disconnection.`);
                    });
                }
                else {
                    console.log('Disconnected socket had no userId.');
                }
            });
        });
    }
    // 사용자가 참여 중인 모든 채팅방에 자동 참여
    async joinUserRooms(socket) {
        try {
            if (!socket.userId)
                return;
            // 사용자가 참여 중인 모든 활성화된 채팅방 조회
            const chatRooms = await ChatRoom_1.default.find({
                $or: [{ user1Id: socket.userId }, { user2Id: socket.userId }],
                isActive: true
            });
            // 각 채팅방에 소켓 연결
            for (const room of chatRooms) {
                socket.join(room._id);
                console.log(`User ${socket.userId} joined room ${room._id}`);
            }
            // 참여 중인 채팅방 목록 전송
            socket.emit('joined-rooms', chatRooms.map(room => room._id));
        }
        catch (error) {
            console.error('Error joining user rooms:', error);
            socket.emit('error', { message: '채팅방 참여 중 오류가 발생했습니다.' });
        }
    }
    // 특정 채팅방 참여
    async joinRoom(socket, roomId) {
        try {
            if (!socket.userId)
                return;
            // 채팅방 존재 및 참여 권한 확인
            const chatRoom = await ChatRoom_1.default.findOne({
                _id: roomId,
                $or: [{ user1Id: socket.userId }, { user2Id: socket.userId }],
                isActive: true
            });
            if (!chatRoom) {
                return socket.emit('error', { message: '채팅방을 찾을 수 없거나 참여 권한이 없습니다.' });
            }
            // 채팅방 참여
            socket.join(roomId);
            console.log(`User ${socket.userId} joined room ${roomId}`);
            // 채팅방 참여 알림
            socket.emit('room-joined', { roomId });
            // 최근 메시지 로드 (최근 20개)
            const recentMessages = await Message_1.default.find({ chatRoomId: roomId })
                .sort({ createdAt: -1 })
                .limit(20);
            socket.emit('recent-messages', { roomId, messages: recentMessages.reverse() });
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: '채팅방 참여 중 오류가 발생했습니다.' });
        }
    }
    // 채팅방 나가기 (기존 leaveRoom 함수 삭제 또는 주석 처리)
    /*
    private leaveRoom(socket: UserSocket, roomId: string) {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room ${roomId}`);
      socket.emit('room-left', { roomId });
    }
    */
    // --- Handle Leave Chat Event ---
    async handleLeaveChat(socket, roomId) {
        try {
            if (!socket.userId) {
                console.error('[handleLeaveChat] Error: User not authenticated.');
                return socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
            }
            const userId = socket.userId;
            console.log(`[handleLeaveChat] User ${userId} requested to leave room ${roomId}`);
            // Find the chat room and verify the user is a participant
            const chatRoom = await ChatRoom_1.default.findOne({
                _id: roomId,
                $or: [{ user1Id: userId }, { user2Id: userId }],
                // isActive: true // Check even if already inactive? Or only allow leaving active rooms?
                // Let's allow leaving inactive rooms too, just update the status.
            });
            if (!chatRoom) {
                console.log(`[handleLeaveChat] Chat room ${roomId} not found or user ${userId} is not a participant.`);
                return socket.emit('error', { message: '채팅방을 찾을 수 없거나 참여자가 아닙니다.' });
            }
            // Update the chat room status to inactive in the database
            if (chatRoom.isActive) {
                chatRoom.isActive = false;
                await chatRoom.save();
                console.log(`[handleLeaveChat] Chat room ${roomId} marked as inactive.`);
            }
            else {
                console.log(`[handleLeaveChat] Chat room ${roomId} was already inactive.`);
            }
            // Make the socket leave the room
            socket.leave(roomId);
            console.log(`[handleLeaveChat] User ${userId} socket left room ${roomId}`);
            // Notify the client that leaving was successful
            socket.emit('chat_left', { roomId }); // Send confirmation
            // Optionally, notify the other participant
            const otherParticipantId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
            if (otherParticipantId) {
                // Emit partner_left event directly to the room ID
                this.io.of('/chat').to(roomId).emit('partner_left', {
                    roomId,
                });
                console.log(`[handleLeaveChat] Emitted 'partner_left' to room ${roomId} because user ${userId} left.`);
            }
        }
        catch (error) {
            console.error('[handleLeaveChat] Error:', error);
            socket.emit('error', { message: '채팅방 나가기 처리 중 오류가 발생했습니다.' });
        }
    }
    // --- End Handle Leave Chat Event ---
    // 메시지 전송 처리
    async handleSendMessage(socket, data) {
        try {
            if (!socket.userId)
                return;
            const { chatRoomId, message } = data;
            if (!message.trim()) {
                return socket.emit('error', { message: '메시지 내용을 입력해주세요.' });
            }
            // 채팅방 존재 및 참여 권한 확인
            const chatRoom = await ChatRoom_1.default.findOne({
                _id: chatRoomId,
                $or: [{ user1Id: socket.userId }, { user2Id: socket.userId }],
                isActive: true
            });
            if (!chatRoom) {
                return socket.emit('error', { message: '채팅방을 찾을 수 없거나 참여 권한이 없습니다.' });
            }
            // 메시지 저장
            const newMessage = new Message_1.default({
                chatRoomId,
                senderId: socket.userId,
                message: message.trim()
            });
            await newMessage.save();
            // 채팅방의 모든 참여자에게 메시지 브로드캐스트
            this.io.of('/chat').to(chatRoomId).emit('new-message', {
                _id: newMessage._id,
                chatRoomId,
                senderId: socket.userId,
                senderNickname: socket.userInfo?.nickname,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            });
            // 채팅방 마지막 업데이트 시간 갱신
            await ChatRoom_1.default.findByIdAndUpdate(chatRoomId, { updatedAt: new Date() });
        }
        catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
        }
    }
    // 타이핑 중 상태 처리
    handleTyping(socket, data) {
        if (!socket.userId)
            return;
        const { chatRoomId, isTyping } = data;
        // 자신을 제외한 채팅방의 모든 사용자에게 타이핑 상태 전송
        socket.to(chatRoomId).emit('user-typing', {
            chatRoomId,
            userId: socket.userId,
            nickname: socket.userInfo?.nickname,
            isTyping
        });
    }
    // 메시지 읽음 상태 처리
    handleReadMessages(socket, data) {
        if (!socket.userId)
            return;
        const { chatRoomId } = data;
        // 채팅방의 다른 사용자에게 메시지 읽음 상태 알림
        socket.to(chatRoomId).emit('messages-read', {
            chatRoomId,
            userId: socket.userId,
            readAt: new Date()
        });
    }
}
exports.ChatGateway = ChatGateway;
