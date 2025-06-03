import { Request, Response, NextFunction, RequestHandler } from 'express';

// 비동기 라우터 핸들러를 위한 래퍼
// try/catch 없이도 에러를 next() 로 전달하여 Express 에러 핸들링 미들웨어로 전달
export default function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
} 