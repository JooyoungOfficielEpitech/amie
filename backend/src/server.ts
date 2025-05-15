import http from 'http';
import app from './app';
import { initSocketServer } from './realtime/socket';
import { ChatGateway } from './realtime/chat_gateway';
import { MatchGateway } from './realtime/match_gateway';
import { initScheduler } from './services/scheduler.service';
import { logger } from './utils/logger';

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.IO 서버 초기화
const io = initSocketServer(server);

// 채팅 게이트웨이 초기화
new ChatGateway(io);

// 매칭 게이트웨이 초기화
new MatchGateway(io);

// 스케줄러 초기화
initScheduler();

// 포트 설정
const PORT = process.env.PORT || 3001;

// 서버 시작
server.listen(PORT, () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다`);
  logger.info(`Socket.IO 서버가 활성화되었습니다`);
  logger.info(`웹소켓 상태: 채팅(/chat), 매칭(/match)`);
}); 