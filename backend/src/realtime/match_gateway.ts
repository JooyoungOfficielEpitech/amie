import { Server, Socket } from 'socket.io';
import { 
  processMatchRequest, 
  cancelMatchRequest, 
  getMatchStatus,
  isUserWaitingForMatch
} from '../services/matching.service';
import { logger } from '../utils/logger';
import { subscribeToChannel, CHANNELS } from '../services/redis.service';
import User, { Gender } from '../models/User';
import { getCreditByUserId } from '../services/credit.service';

interface UserSocket extends Socket {
  userId?: string;
  userInfo?: any;
}

export class MatchGateway {
  private namespace: any;
  
  // 사용자 ID와 소켓 ID를 매핑하는 객체
  private userSocketMap = new Map<string, string>();
  private socketUserMap = new Map<string, string>();
  
  constructor(io: Server) {
    // 매칭 네임스페이스 설정
    this.namespace = io.of('/match');
    
    // Redis 이벤트 구독 설정
    this.subscribeToRedisEvents();
    
    // 연결 이벤트 핸들러 등록
    this.namespace.on('connection', this.handleConnection.bind(this));
    
    logger.info('매칭 게이트웨이 초기화 완료');
  }
  
  // 클라이언트 연결 처리
  private handleConnection(socket: UserSocket) {
    logger.info(`매칭 소켓 연결됨: ${socket.id}`);
    
    // 인증 정보 확인
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    
    if (userId) {
      // 사용자 ID와 소켓 ID 매핑
      this.userSocketMap.set(userId as string, socket.id);
      this.socketUserMap.set(socket.id, userId as string);
      
      // 소켓에 사용자 ID 설정
      socket.userId = userId as string;
      
      logger.info(`매칭 소켓 인증됨: ${socket.id}, 사용자: ${userId}`);
      
      // 현재 매칭 상태 확인 및 응답
      this.checkAndSendMatchStatus(socket, userId as string);
      
      // 현재 크레딧 정보 전송
      this.sendCreditInfo(socket, userId as string);
      
      // 이벤트 핸들러 등록
      this.registerEventHandlers(socket);
    } else {
      logger.warn(`인증되지 않은 매칭 소켓 연결: ${socket.id}`);
      socket.emit('match_error', { message: '인증이 필요합니다' });
      socket.disconnect(true);
    }
  }
  
  // 이벤트 핸들러 등록
  private registerEventHandlers(socket: UserSocket): void {
    // 소켓 연결 시 사용자 ID 로그
    console.log(`[MatchGateway] User connected: ${socket.userId}`);

    // 이벤트 핸들러 등록
    socket.on('start_match', () => this.handleStartMatch(socket));
    socket.on('cancel_match', () => this.handleMatchCancel(socket));
    socket.on('toggle_match', (data) => this.handleToggleMatch(socket, data));
    socket.on('check_match_status', () => this.handleCheckMatchStatus(socket));
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
  }
  
  // 크레딧 정보 요청 처리
  private async handleCreditInfoRequest(socket: UserSocket) {
    try {
      const userId = this.socketUserMap.get(socket.id);
      
      if (!userId) {
        socket.emit('match_error', { message: '인증되지 않은 요청입니다' });
        return;
      }
      
      await this.sendCreditInfo(socket, userId);
    } catch (error) {
      logger.error('크레딧 정보 요청 처리 중 오류:', error);
      socket.emit('match_error', { message: '크레딧 정보 요청 중 오류가 발생했습니다' });
    }
  }
  
  // 사용자에게 최신 크레딧 정보 전송
  private async sendCreditInfo(socket: UserSocket, userId: string) {
    try {
      // 크레딧 서비스에서 사용자의 크레딧 정보 조회
      const creditInfo = await getCreditByUserId(userId);
      
      if (creditInfo) {
        socket.emit('credit_update', { credit: creditInfo.credit });
        logger.info(`크레딧 정보 전송: 사용자=${userId}, 크레딧=${creditInfo.credit}`);
      } else {
        logger.warn(`크레딧 정보 없음: 사용자=${userId}`);
      }
    } catch (error) {
      logger.error(`크레딧 정보 조회 중 오류: 사용자=${userId}`, error);
    }
  }
  
  // 매칭 요청 처리
  private async handleMatchRequest(socket: UserSocket, data: any) {
    try {
      const userId = this.socketUserMap.get(socket.id);
      
      if (!userId) {
        socket.emit('match_error', { message: '인증되지 않은 요청입니다' });
        return;
      }

      const gender = socket.userInfo?.gender || data.gender;
      const userInfo = data.userInfo || {};
      
      // 매칭 요청 처리
      const result = await processMatchRequest(userId, gender as Gender, userInfo);
      
      // 결과 응답
      socket.emit('match_request_result', result);
      
      // 크레딧이 변경되었을 수 있으므로 최신 크레딧 정보 전송
      if (result.success) {
        await this.sendCreditInfo(socket, userId);
      }
      
      logger.info(`매칭 요청 결과: 사용자=${userId}, 성공=${result.success}`);
    } catch (error) {
      logger.error('매칭 요청 처리 중 오류:', error);
      socket.emit('match_error', { message: '매칭 요청 중 오류가 발생했습니다' });
    }
  }
  
  // 매칭 취소 처리
  private async handleMatchCancel(socket: UserSocket) {
    try {
      const userId = this.socketUserMap.get(socket.id);
      
      if (!userId) {
        socket.emit('match_error', { message: '인증되지 않은 요청입니다' });
        return;
      }
      
      // 매칭 취소 처리
      const result = await cancelMatchRequest(userId);
      
      // 결과 응답
      socket.emit('match_cancel_result', result);
      
      logger.info(`매칭 취소 결과: 사용자=${userId}, 성공=${result.success}`);
    } catch (error) {
      logger.error('매칭 취소 처리 중 오류:', error);
      socket.emit('match_error', { message: '매칭 취소 중 오류가 발생했습니다' });
    }
  }
  
  // 매칭 상태 확인
  private async handleStatusCheck(socket: UserSocket) {
    try {
      const userId = this.socketUserMap.get(socket.id);
      
      if (!userId) {
        socket.emit('match_error', { message: '인증되지 않은 요청입니다' });
        return;
      }
      
      // 사용자 정보에서 성별 가져오기
      const gender = socket.userInfo?.gender;
      logger.info(`매칭 상태 확인 요청: 사용자=${userId}, 성별=${gender || 'unknown'}`);
      
      // 매칭 상태 확인 및 전송
      const status = await this.checkAndSendMatchStatus(socket, userId);
      
      // 추가 정보 전송: 상태와 함께 성별 정보를 'current_match_status' 이벤트로 전달
      socket.emit('current_match_status', { 
        isMatching: status?.isMatching || false,
        gender: gender,
        userId: userId
      });
      
      logger.info(`매칭 상태 응답 전송: 사용자=${userId}, 매칭 중=${status?.isMatching || false}`);
    } catch (error) {
      logger.error('매칭 상태 확인 중 오류:', error);
      socket.emit('match_error', { message: '매칭 상태 확인 중 오류가 발생했습니다' });
    }
  }
  
  // 연결 해제 처리
  private handleDisconnect(socket: UserSocket, reason: string) {
    const userId = this.socketUserMap.get(socket.id);
    
    if (userId) {
      // 매핑 삭제
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(socket.id);
      
      logger.info(`매칭 소켓 연결 해제: ${socket.id}, 사용자: ${userId}, 이유: ${reason}`);
    } else {
      logger.info(`매칭 소켓 연결 해제: ${socket.id}, 이유: ${reason}`);
    }
  }
  
  // 매칭 상태 확인 및 전송
  private async checkAndSendMatchStatus(socket: UserSocket, userId: string) {
    try {
      const status = await getMatchStatus(userId);
      
      // 기존 'match_status', 새로운 'match_status' 이벤트 전송
      socket.emit('match_status', status);
      
      return status;
    } catch (error) {
      logger.error(`매칭 상태 확인 중 오류: 사용자=${userId}`, error);
      socket.emit('match_error', { message: '매칭 상태 확인 중 오류가 발생했습니다' });
      return null;
    }
  }
  
  // Redis 이벤트 구독 설정
  private subscribeToRedisEvents() {
    // 매칭 성공 이벤트 구독
    subscribeToChannel(CHANNELS.MATCH_SUCCESSFUL, (message) => {
      try {
        const data = JSON.parse(message);
        const { maleId, femaleId, roomId, timestamp } = data;
        
        // 각 사용자에게 매칭 성공 알림
        this.notifyUser(maleId, 'match_success', {
          roomId,
          partnerId: femaleId,
          timestamp
        });
        
        this.notifyUser(femaleId, 'match_success', {
          roomId,
          partnerId: maleId,
          timestamp
        });
        
        // 남성 사용자에게 크레딧 정보 업데이트 전송 (매칭으로 인한 크레딧 차감)
        this.updateUserCreditInfo(maleId);
        
        logger.info(`매칭 성공 알림 전송: 방=${roomId}, 남성=${maleId}, 여성=${femaleId}`);
      } catch (error) {
        logger.error('매칭 성공 이벤트 처리 중 오류:', error);
      }
    });
    
    // 매칭 취소 이벤트 구독
    subscribeToChannel(CHANNELS.MATCH_CANCELLED, (message) => {
      try {
        const data = JSON.parse(message);
        const { userId, timestamp } = data;
        
        // 사용자에게 매칭 취소 알림
        this.notifyUser(userId, 'match_cancelled', {
          timestamp
        });
        
        logger.info(`매칭 취소 알림 전송: 사용자=${userId}`);
      } catch (error) {
        logger.error('매칭 취소 이벤트 처리 중 오류:', error);
      }
    });
    
    // 매칭 요청 이벤트 구독 (필요하면 구현)
    subscribeToChannel(CHANNELS.MATCH_REQUESTED, (message) => {
      try {
        const data = JSON.parse(message);
        const { userId, gender, timestamp } = data;
        logger.info(`매칭 요청 이벤트 수신: 사용자=${userId}, 성별=${gender}`);
        // 필요한 추가 처리 구현
      } catch (error) {
        logger.error('매칭 요청 이벤트 처리 중 오류:', error);
      }
    });
  }
  
  // 특정 사용자에게 알림 전송
  private notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userSocketMap.get(userId);
    
    if (socketId) {
      this.namespace.to(socketId).emit(event, data);
      return true;
    }
    
    logger.warn(`사용자에게 알림 실패: ${userId}, 이벤트=${event}, 연결된 소켓 없음`);
    return false;
  }
  
  // start_match 이벤트 처리 함수 추가
  private async handleStartMatch(socket: UserSocket): Promise<void> {
    try {
      const userId = socket.userId || this.socketUserMap.get(socket.id);
      
      if (!userId) {
        console.log('[MatchGateway] Unauthorized match request');
        socket.emit('match_error', { message: '인증되지 않은 사용자입니다' });
        return;
      }

      // 사용자 정보 조회
      const user = await User.findById(userId);
      if (!user) {
        console.log(`[MatchGateway] User not found: ${userId}`);
        socket.emit('match_error', { message: '사용자 정보를 찾을 수 없습니다' });
        return;
      }

      console.log(`[MatchGateway] Processing match request for user: ${userId}, gender: ${user.gender}`);

      // 기본값으로 성별 설정 (없을 경우)
      const gender = user.gender || Gender.MALE;

      // 매칭 요청 처리
      const result = await processMatchRequest(userId, gender, { socketId: socket.id });

      if (result.success) {
        if (result.status === 'waiting') {
          // 매칭 대기열에 추가됨
          console.log(`[MatchGateway] User added to match queue: ${userId}`);
          socket.emit('match_waiting', { message: result.message });
        } else {
          // 즉시 매칭됨
          console.log(`[MatchGateway] Match success: ${userId} with partner ${result.partnerId}, roomId: ${result.roomId}`);
          socket.emit('match_success', {
            roomId: result.roomId,
            partner: result.partner,
            creditUsed: gender === Gender.MALE ? 10 : 0
          });
        }
      } else {
        // 오류 전송
        console.log(`[MatchGateway] Match error for user ${userId}: ${result.message}`);
        socket.emit('match_error', { message: result.message });
      }
    } catch (error) {
      console.error('[MatchGateway] Error in handleStartMatch:', error);
      socket.emit('match_error', { message: '매칭 처리 중 오류가 발생했습니다' });
    }
  }
  
  // 토글 스위치 이벤트 처리 함수 추가
  private async handleToggleMatch(socket: UserSocket, data: { isEnabled: boolean, gender?: Gender }) {
    try {
      const userId = this.socketUserMap.get(socket.id);
      
      if (!userId) {
        socket.emit('match_error', { message: '인증되지 않은 요청입니다' });
        return;
      }
      
      logger.info(`토글 스위치 상태 변경: 사용자=${userId}, 활성화=${data.isEnabled}`);
      
      // 현재 실제 매칭 상태 확인 (토글 전)
      const currentStatus = await getMatchStatus(userId);
      const isCurrentlyMatching = currentStatus?.isWaiting || false;
      
      // 요청된 상태와 현재 상태가 같으면 중복 요청으로 간주
      if (data.isEnabled === isCurrentlyMatching) {
        logger.info(`토글 요청 무시: 사용자=${userId}, 현재 상태와 동일(${data.isEnabled})`);
        socket.emit('toggle_match_result', { 
          success: true, 
          isMatching: isCurrentlyMatching,
          message: isCurrentlyMatching ? '이미 매칭 중입니다' : '이미 매칭이 취소되었습니다'
        });
        
        // 현재 상태 재전송 (클라이언트 상태 동기화)
        socket.emit('current_match_status', { 
          isMatching: isCurrentlyMatching,
          userId: userId,
          gender: socket.userInfo?.gender
        });
        return;
      }
      
      if (data.isEnabled) {
        // 데이터베이스에서 사용자 정보 조회
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('match_error', { message: '사용자 정보를 찾을 수 없습니다' });
          return;
        }
        
        const gender = user.gender;
        if (!gender) {
          socket.emit('match_error', { message: '성별 정보가 없어 매칭할 수 없습니다' });
          return;
        }
        
        // 크레딧 확인 (성별 관계없이 모두 확인)
        if (user.credit < 10) {
          logger.warn(`토글 매칭 거부: 사용자=${userId}, 크레딧 부족`);
          socket.emit('toggle_match_result', { 
            success: false, 
            isMatching: false,
            message: '크레딧이 부족합니다'
          });
          return;
        }
        
        logger.info(`토글 매칭 요청: 사용자=${userId}, 실제 성별=${gender}`);
        const userInfo = { socketId: socket.id }; // 소켓 ID 포함
        
        // 매칭 요청 처리
        const result = await processMatchRequest(userId, gender as Gender, userInfo);
        
        if (result.success) {
          socket.emit('toggle_match_result', { 
            success: true, 
            isMatching: true,
            message: '매칭이 시작되었습니다' 
          });
          logger.info(`토글 매칭 시작 성공: 사용자=${userId}`);
          
          // 매칭 대기자 목록 관리는 여기서 하지 않고
          // processMatchRequest 함수 내에서 처리하도록 함
        } else {
          socket.emit('toggle_match_result', { 
            success: false, 
            isMatching: false,
            message: result.message || '매칭 시작에 실패했습니다' 
          });
          logger.warn(`토글 매칭 시작 실패: 사용자=${userId}, 이유=${result.message}`);
        }
      } else {
        // 스위치가 꺼지면 매칭 취소 처리
        const result = await cancelMatchRequest(userId);
        
        if (result.success) {
          socket.emit('toggle_match_result', { 
            success: true, 
            isMatching: false,
            message: '매칭이 취소되었습니다' 
          });
          logger.info(`토글 매칭 취소 성공: 사용자=${userId}`);
          
          // 매칭 대기자 목록 관리는 여기서 하지 않고
          // cancelMatchRequest 함수 내에서 처리하도록 함
        } else {
          socket.emit('toggle_match_result', { 
            success: false, 
            isMatching: false,
            message: result.message || '매칭 취소에 실패했습니다'
          });
          logger.warn(`토글 매칭 취소 실패: 사용자=${userId}, 이유=${result.message}`);
        }
      }
      
      // 약간의 지연 후 최종 상태 조회하여 전송 (DB 작업 완료 후)
      setTimeout(async () => {
        try {
          const finalStatus = await getMatchStatus(userId);
          socket.emit('current_match_status', { 
            isMatching: finalStatus?.isWaiting || false,
            userId: userId,
            gender: socket.userInfo?.gender
          });
          logger.info(`토글 후 최종 상태 전송: 사용자=${userId}, 매칭=${finalStatus?.isWaiting || false}`);
        } catch (error) {
          logger.error(`토글 후 상태 조회 오류: 사용자=${userId}`, error);
        }
      }, 300);
      
    } catch (error) {
      logger.error('토글 스위치 처리 중 오류:', error);
      socket.emit('match_error', { message: '토글 스위치 처리 중 오류가 발생했습니다' });
      
      // 오류 발생 시에도 현재 상태 조회하여 전송 (UI 동기화)
      try {
        const currentUserId = this.socketUserMap.get(socket.id);
        if (currentUserId) {
          const errorStatus = await getMatchStatus(currentUserId);
          socket.emit('current_match_status', { 
            isMatching: errorStatus?.isWaiting || false,
            userId: currentUserId,
            gender: socket.userInfo?.gender
          });
        }
      } catch (secondError) {
        logger.error('오류 후 상태 조회 실패:', secondError);
      }
    }
  }
  
  // 사용자의 크레딧 정보 업데이트
  private async updateUserCreditInfo(userId: string) {
    try {
      const socketId = this.userSocketMap.get(userId);
      if (!socketId) return false;
      
      const socket = this.namespace.sockets.get(socketId);
      if (!socket) return false;
      
      await this.sendCreditInfo(socket, userId);
      return true;
    } catch (error) {
      logger.error(`사용자 크레딧 정보 업데이트 중 오류: 사용자=${userId}`, error);
      return false;
    }
  }

  private async handleCheckMatchStatus(socket: UserSocket): Promise<void> {
    try {
      const userId = socket.userId || this.socketUserMap.get(socket.id);
      
      if (!userId) {
        console.log('[MatchGateway] Unauthorized match status check');
        socket.emit('match_error', { message: '인증되지 않은 사용자입니다' });
        return;
      }
      
      // 사용자 정보 조회
      const user = await User.findById(userId);
      if (!user) {
        console.log(`[MatchGateway] User not found in status check: ${userId}`);
        socket.emit('match_error', { message: '사용자 정보를 찾을 수 없습니다' });
        return;
      }

      console.log(`[MatchGateway] Checking match status for user: ${userId}, gender: ${user.gender}`);
      
      // 상태 정보 확인 (Redis와 DB 상태 일관성 확인)
      const status = await getMatchStatus(userId);
      const isWaiting = status?.isWaiting || false;
      
      // 매칭된 채팅방 정보 포함
      const matchedRoomId = status?.matchedRoomId || null;
      
      // 보다 자세한 상태 정보 전송
      socket.emit('current_match_status', { 
        isMatching: isWaiting,
        userId: userId,
        gender: user.gender,
        matchedRoomId: matchedRoomId,
        credit: user.credit,          // 현재 크레딧 정보도 함께 전송
        timestamp: Date.now()         // 클라이언트가 응답 시간을 알 수 있도록
      });
      
      // 소켓 연결 상태 유지 (필요하다면 matchingUsers 대신 다른 방법으로 구현)
      if (isWaiting) {
        // 유저가 매칭 중이면 현재 소켓 정보 캐싱 (간접적으로 메모리 상태 유지)
        this.userSocketMap.set(userId, socket.id);
        console.log(`[MatchGateway] Socket mapping updated for waiting user ${userId}`);
      }
      
      console.log(`[MatchGateway] Sent match status to user ${userId}: isMatching=${isWaiting}, matchedRoom=${matchedRoomId || 'none'}`);
    } catch (error) {
      console.error('[MatchGateway] Error in handleCheckMatchStatus:', error);
      socket.emit('match_error', { message: '상태 확인 중 오류가 발생했습니다' });
    }
  }
} 