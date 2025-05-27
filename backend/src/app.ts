import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';
import matchQueueRoutes from './routes/matchQueueRoutes';
import chatRoomRoutes from './routes/chatRoomRoutes';
import messageRoutes from './routes/messageRoutes';
import creditLogRoutes from './routes/creditLogRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import userProfileRoutes from './routes/userProfileRoutes';
import matchRoutes from './routes/matchRoutes';
import chatRoutes from './routes/chatRoutes';
import creditRoutes from './routes/creditRoutes';
import { specs, swaggerUi } from './config/swagger';
import path from 'path';
import Admin from './models/Admin';

// 환경 변수 설정
dotenv.config();

// MongoDB 연결
connectDB();

const app: Application = express();

// 미들웨어
app.use(cors({
  origin: '*', // 모든 출처 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Swagger JSON 파일을 정적 파일로 제공
app.use('/swagger', express.static(path.join(__dirname, '../swagger')));

// 라우트
app.use('/auth', authRoutes);
app.use('/user', userProfileRoutes);
app.use('/users', userRoutes);
app.use('/match', matchRoutes);
app.use('/chat', chatRoutes);
app.use('/queue', matchQueueRoutes);
app.use('/chat-rooms', chatRoomRoutes);
app.use('/messages', messageRoutes);
app.use('/credits', creditLogRoutes);
app.use('/credit', creditRoutes);
app.use('/admin', adminRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('API 실행 중...');
});

async function ensureAdminUser() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  const existing = await Admin.findOne({ email: adminEmail });
  if (!existing) {
    const admin = new Admin({
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin'
    });
    await admin.save();
    console.log('기본 관리자 계정이 생성되었습니다:', adminEmail);
  } else {
    console.log('기본 관리자 계정이 이미 존재합니다:', adminEmail);
  }
}

ensureAdminUser();

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ message: '서버 에러가 발생했습니다.' });
});

export default app; 