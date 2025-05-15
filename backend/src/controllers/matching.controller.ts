import { Request, Response } from 'express';
import { 
  processMatchRequest, 
  cancelMatchRequest, 
  processBatchMatching, 
  getMatchStatus 
} from '../services/matching.service';
import { logger } from '../utils/logger';
import { Gender } from '../models/User';

// 매칭 요청 처리
export async function requestMatch(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { gender } = req.user as { gender: Gender };
    const userInfo = req.body.userInfo || {};
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'unauthorized', 
        message: '인증되지 않은 사용자입니다' 
      });
    }
    
    const result = await processMatchRequest(userId, gender, userInfo);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('매칭 요청 처리 중 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'internal_server_error', 
      message: '서버 오류가 발생했습니다' 
    });
  }
}

// 매칭 취소 처리
export async function cancelMatch(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'unauthorized', 
        message: '인증되지 않은 사용자입니다' 
      });
    }
    
    const result = await cancelMatchRequest(userId);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('매칭 취소 처리 중 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'internal_server_error', 
      message: '서버 오류가 발생했습니다' 
    });
  }
}

// 매칭 상태 조회
export async function checkMatchStatus(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'unauthorized', 
        message: '인증되지 않은 사용자입니다' 
      });
    }
    
    const result = await getMatchStatus(userId);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('매칭 상태 조회 중 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'internal_server_error', 
      message: '서버 오류가 발생했습니다' 
    });
  }
}

// 배치 매칭 처리 (관리자용 또는 스케줄러용)
export async function runBatchMatching(req: Request, res: Response): Promise<Response> {
  try {
    // 관리자 권한 체크는 미들웨어로 처리한다고 가정
    const result = await processBatchMatching();
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error('배치 매칭 처리 중 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'internal_server_error', 
      message: '서버 오류가 발생했습니다' 
    });
  }
} 