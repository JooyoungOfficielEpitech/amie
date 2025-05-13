"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./realtime/socket");
const chat_gateway_1 = require("./realtime/chat_gateway");
const match_gateway_1 = require("./realtime/match_gateway");
// HTTP 서버 생성
const server = http_1.default.createServer(app_1.default);
// Socket.IO 서버 초기화
const io = (0, socket_1.initSocketServer)(server);
// 채팅 게이트웨이 초기화
new chat_gateway_1.ChatGateway(io);
// 매칭 게이트웨이 초기화
new match_gateway_1.MatchGateway(io);
// 포트 설정
const PORT = process.env.PORT || 3001;
// 서버 시작
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`Socket.IO 서버가 활성화되었습니다.`);
    console.log(`웹소켓 상태: 채팅(/chat), 매칭(/match)`);
});
