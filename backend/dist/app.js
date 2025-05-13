"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const matchQueueRoutes_1 = __importDefault(require("./routes/matchQueueRoutes"));
const chatRoomRoutes_1 = __importDefault(require("./routes/chatRoomRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const creditLogRoutes_1 = __importDefault(require("./routes/creditLogRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userProfileRoutes_1 = __importDefault(require("./routes/userProfileRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const creditRoutes_1 = __importDefault(require("./routes/creditRoutes"));
const swagger_1 = require("./config/swagger");
const path_1 = __importDefault(require("path"));
// 환경 변수 설정
dotenv_1.default.config();
// MongoDB 연결
(0, db_1.default)();
const app = (0, express_1.default)();
// 미들웨어
app.use((0, cors_1.default)({
    origin: '*', // 모든 출처 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Swagger UI 설정
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.specs, { explorer: true }));
// Swagger JSON 파일을 정적 파일로 제공
app.use('/swagger', express_1.default.static(path_1.default.join(__dirname, '../swagger')));
// 라우트
app.use('/api/auth', authRoutes_1.default);
app.use('/api/user', userProfileRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/match', matchRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/queue', matchQueueRoutes_1.default);
app.use('/api/chat-rooms', chatRoomRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/credits', creditLogRoutes_1.default);
app.use('/api/credit', creditRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// 기본 라우트
app.get('/', (req, res) => {
    res.send('API 실행 중...');
});
// 에러 핸들러
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: '서버 에러가 발생했습니다.' });
});
exports.default = app;
