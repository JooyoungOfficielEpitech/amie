import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import ChatRoom from '../models/ChatRoom';
import User from '../models/User';
import jwt from 'jsonwebtoken';

// 소켓에 사용자 정보를 추가하는 인터페이스
interface UserSocket extends Socket {
  userId?: string;
  userInfo?: any;
}

// 채팅방 관련 이벤트와 메시지 송수신을 처리하는 클래스
export class ChatGateway {
  // 사용자 ID와 소켓 ID를 매핑하는 Map 추가
  private socketUserMap = new Map<string, string>();
  private userSocketsMap = new Map<string, Set<string>>();
  
  constructor(private io: Server) {
    this.initialize();
  }

  // 초기화 및 이벤트 리스너 설정
  private initialize() {
    // 채팅 네임스페이스 설정
    const chatNamespace = this.io.of('/chat');

    // --- Authentication Middleware for /chat namespace --- 
    chatNamespace.use(async (socket: UserSocket, next) => {
        console.log('[ChatGateway Auth] Attempting auth...');
        
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            
            console.log(`[ChatGateway Auth] 소켓 연결 시도: ${socket.id}, 토큰 존재: ${!!token}`);
            
            if (!token) {
                console.log(`[ChatGateway Auth] 인증 토큰 없음: ${socket.id}`);
                return next(new Error('Authentication token required'));
            }
            
            // 토큰 검증 및 사용자 ID 추출
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
            const userId = decoded.id;
            
            console.log(`[ChatGateway Auth] 사용자 인증 성공: ${socket.id}, userId: ${userId}`);
            
            // 사용자 소켓에 ID 저장
            socket.userId = userId;
            
            // 소켓 ID와 사용자 ID 매핑 저장
            this.socketUserMap.set(socket.id, userId);
            
            // 사용자 ID와 소켓 ID 매핑 저장
            if (!this.userSocketsMap.has(userId)) {
                this.userSocketsMap.set(userId, new Set());
            }
            this.userSocketsMap.get(userId)?.add(socket.id);
            
            socket.userInfo = {
                id: userId,
            };
            console.log(`[ChatGateway Auth] Auth successful for user: ${socket.userId}`);
            next(); // Proceed to connection handler
        } catch (error: any) {
            console.error('[ChatGateway Auth] General error during auth:', error.message);
            return next(new Error('Authentication error: Server error'));
        }
    });
    // --- End Authentication Middleware ---

    chatNamespace.on('connection', async (socket: UserSocket) => {
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
      socket.on('join-room', (roomId: string) => {
        this.joinRoom(socket, roomId);
      });

      // 채팅방 나가기 이벤트 (이름 변경 및 로직 수정 필요)
      socket.on('leave_chat', async (roomId: string) => { // 이벤트 이름 변경
        await this.handleLeaveChat(socket, roomId); // 호출 함수 변경
      });

      // 메시지 전송 이벤트
      socket.on('send-message', async (data: { chatRoomId: string, message: string }) => {
        await this.handleSendMessage(socket, data);
      });

      // 타이핑 중 이벤트
      socket.on('typing', (data: { chatRoomId: string, isTyping: boolean }) => {
        this.handleTyping(socket, data);
      });
      
      // 읽음 상태 이벤트
      socket.on('read-messages', (data: { chatRoomId: string }) => {
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
        } else {
          console.log('Disconnected socket had no userId.');
        }
      });
    });
  }

  // 사용자가 참여 중인 모든 채팅방에 자동 참여
  private async joinUserRooms(socket: UserSocket) {
    try {
      if (!socket.userId) return;

      // 사용자가 참여 중인 모든 활성화된 채팅방 조회
      const chatRooms = await ChatRoom.find({
        $or: [
          { user1Id: socket.userId, user1Left: false },
          { user2Id: socket.userId, user2Left: false }
        ]
      });

      // 각 채팅방에 소켓 연결
      for (const room of chatRooms) {
        socket.join(room._id);
        console.log(`User ${socket.userId} joined room ${room._id}`);
      }

      // 참여 중인 채팅방 목록 전송
      socket.emit('joined-rooms', chatRooms.map(room => room._id));
    } catch (error) {
      console.error('Error joining user rooms:', error);
      socket.emit('error', { message: '채팅방 참여 중 오류가 발생했습니다.' });
    }
  }

  // 특정 채팅방 참여
  private async joinRoom(socket: UserSocket, roomId: string) {
    try {
      if (!socket.userId) return;

      // 채팅방 존재 및 참여 권한 확인
      const chatRoom = await ChatRoom.findOne({
        _id: roomId,
        $or: [
          { user1Id: socket.userId, user1Left: false },
          { user2Id: socket.userId, user2Left: false }
        ]
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
      const recentMessages = await Message.find({ chatRoomId: roomId })
        .sort({ createdAt: -1 })
        .limit(20);
      
      socket.emit('recent-messages', { roomId, messages: recentMessages.reverse() });
    } catch (error) {
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
  private async handleLeaveChat(socket: UserSocket, roomId: string) {
    try {
      const userId = String(socket.userId);
      const roomIdStr = String(roomId);

      // Find the chat room and verify the user is a participant
      const chatRoom = await ChatRoom.findOne({
        _id: roomIdStr,
        $or: [{ user1Id: userId }, { user2Id: userId }]
      });

      if (!chatRoom) {
        // 이미 나간 경우도 성공 처리
        socket.leave(roomIdStr);
        return socket.emit('chat_left', { roomId: roomIdStr });
      }

      // 이미 나간 상태라면 중복 나가기 허용 (성공 처리)
      if (
        (chatRoom.user1Id === userId && chatRoom.user1Left) ||
        (chatRoom.user2Id === userId && chatRoom.user2Left)
      ) {
        socket.leave(roomIdStr);
        return socket.emit('chat_left', { roomId: roomIdStr });
      }

      // Update the user's leave status
      if (chatRoom.user1Id === userId) {
        chatRoom.user1Left = true;
      } else {
        chatRoom.user2Left = true;
      }
      await chatRoom.save();

      socket.leave(roomIdStr);
      socket.emit('chat_left', { roomId: roomIdStr });

      // Notify the other participant
      const otherParticipantId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
      if (otherParticipantId) {
        console.log(`[handleLeaveChat] Emitting 'partner_left' to room ${roomIdStr} (otherParticipantId: ${otherParticipantId})`);
        this.io.of('/chat').to(roomIdStr).emit('partner_left', { 
          roomId: roomIdStr,
          userId: otherParticipantId
        });
      }
    } catch (error) {
      console.error('[handleLeaveChat] Error:', error, { roomId, userId: socket.userId });
      // 무조건 성공 처리
      socket.emit('chat_left', { roomId });
    }
  }
  // --- End Handle Leave Chat Event ---

  // 메시지 전송 처리
  private async handleSendMessage(socket: UserSocket, data: { chatRoomId: string, message: string }) {
    try {
      if (!socket.userId) {
        console.log(`[ChatGateway] 인증되지 않은 사용자의 메시지 전송 시도: ${socket.id}`);
        socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
        return;
      }
      
      const { chatRoomId, message } = data;
      
      if (!message.trim()) {
        return socket.emit('error', { message: '메시지 내용을 입력해주세요.' });
      }

      // 채팅방 존재 및 참여 권한 확인
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        $or: [
          { user1Id: socket.userId, user1Left: false },
          { user2Id: socket.userId, user2Left: false }
        ]
      });

      if (!chatRoom) {
        console.log(`[ChatGateway] 채팅방 없음 또는 접근 권한 없음: ${chatRoomId}, 유저=${socket.userId}`);
        return socket.emit('error', { message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
      }

      // 상대방이 나갔는지 확인
      const isUser1 = chatRoom.user1Id === socket.userId;
      const partnerLeft = isUser1 ? chatRoom.user2Left : chatRoom.user1Left;
      if (partnerLeft) {
        return socket.emit('error', { message: '상대방이 채팅방을 나갔습니다.' });
      }

      // 사용자 정보 가져오기
      let userInfo = socket.userInfo;
      if (!userInfo || !userInfo.nickname) {
        // 소켓에 유저 정보가 없으면 DB에서 가져옴
        try {
          const user = await User.findById(socket.userId);
          if (user) {
            userInfo = {
              nickname: user.nickname || '알 수 없음',
              gender: user.gender
            };
            // 소켓에 저장해서 다음에 또 쓸 수 있게
            socket.userInfo = userInfo;
          }
        } catch (err) {
          console.error('[handleSendMessage] Error fetching user info:', err);
        }
      }

      console.log(`[handleSendMessage] User ${socket.userId} sending message to room ${chatRoomId}`);

      // 메시지 저장
      const newMessage = new Message({
        chatRoomId,
        senderId: socket.userId,
        senderNickname: userInfo?.nickname || '알 수 없음',
        senderGender: userInfo?.gender,
        message: message.trim()
      });
      
      await newMessage.save();
      
      // 채팅방의 모든 참여자에게 메시지 브로드캐스트
      this.io.of('/chat').to(chatRoomId).emit('new-message', {
        _id: newMessage._id,
        chatRoomId,
        senderId: socket.userId,
        senderNickname: userInfo?.nickname || '알 수 없음',
        senderGender: userInfo?.gender,
        message: newMessage.message,
        createdAt: newMessage.createdAt
      });
      
      // 채팅방 마지막 업데이트 시간 갱신
      await ChatRoom.findByIdAndUpdate(chatRoomId, { updatedAt: new Date() });
    } catch (error) {
      console.error(`[ChatGateway] 메시지 전송 오류:`, error);
      socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
    }
  }

  // 타이핑 중 상태 처리
  private handleTyping(socket: UserSocket, data: { chatRoomId: string, isTyping: boolean }) {
    if (!socket.userId) return;
    
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
  private handleReadMessages(socket: UserSocket, data: { chatRoomId: string }) {
    if (!socket.userId) return;
    
    const { chatRoomId } = data;
    
    // 채팅방의 다른 사용자에게 메시지 읽음 상태 알림
    socket.to(chatRoomId).emit('messages-read', {
      chatRoomId,
      userId: socket.userId,
      readAt: new Date()
    });
  }
} 