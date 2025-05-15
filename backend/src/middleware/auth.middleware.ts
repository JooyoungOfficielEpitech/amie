import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Admin from '../models/Admin';
import { logger } from '../utils/logger';

// JWT 토큰에서 추출한 정보를 Request 객체에 추가하기 위한 인터페이스 확장
declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: any;
    }
  }
}

// 사용자 JWT 인증 미들웨어
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token;

  // Authorization 헤더에서 Bearer 토큰 추출
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 토큰 검증
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // 토큰에서 추출한 ID로 사용자 정보 조회 (비밀번호 해시 제외)
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        logger.warn(`인증 실패: 사용자 ID=${decoded.id}를 찾을 수 없음`);
        res.status(401).json({
          success: false,
          error: 'user_not_found',
          message: '인증 실패: 사용자를 찾을 수 없습니다'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('JWT 인증 오류:', error);
      res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: '인증되지 않았습니다'
      });
      return;
    }
  } else {
    logger.warn('토큰이 제공되지 않음');
    res.status(401).json({
      success: false,
      error: 'no_token',
      message: '인증 토큰이 필요합니다'
    });
    return;
  }
};

// 관리자 권한 확인 미들웨어
export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 먼저 사용자 인증 확인
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'not_authenticated',
        message: '인증이 필요합니다'
      });
      return;
    }
    
    // 관리자 DB에서 확인
    const admin = await Admin.findOne({ userId: req.user._id });
    
    if (!admin) {
      logger.warn(`관리자 권한 거부: 사용자=${req.user._id}`);
      res.status(403).json({
        success: false,
        error: 'forbidden',
        message: '관리자 권한이 필요합니다'
      });
      return;
    }
    
    // 관리자 정보 추가
    req.admin = admin;
    next();
  } catch (error) {
    logger.error('관리자 권한 확인 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: '서버 오류가 발생했습니다'
    });
    return;
  }
}; 