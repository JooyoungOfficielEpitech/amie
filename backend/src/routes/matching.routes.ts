import { Router, Request, Response, NextFunction } from 'express';
import { 
  requestMatch, 
  cancelMatch, 
  checkMatchStatus, 
  runBatchMatching 
} from '../controllers/matching.controller';
import { authenticateJWT, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// 인증이 필요한 라우트
router.use(authenticateJWT as any);

// 매칭 요청
router.post('/request', requestMatch as any);

// 매칭 취소
router.post('/cancel', cancelMatch as any);

// 매칭 상태 조회
router.get('/status', checkMatchStatus as any);

// 관리자용 배치 매칭 실행 (관리자 권한 필요)
router.post('/batch', isAdmin as any, runBatchMatching as any);

export default router; 