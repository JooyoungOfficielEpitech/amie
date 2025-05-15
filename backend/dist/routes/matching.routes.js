"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matching_controller_1 = require("../controllers/matching.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// 인증이 필요한 라우트
router.use(auth_middleware_1.authenticateJWT);
// 매칭 요청
router.post('/request', matching_controller_1.requestMatch);
// 매칭 취소
router.post('/cancel', matching_controller_1.cancelMatch);
// 매칭 상태 조회
router.get('/status', matching_controller_1.checkMatchStatus);
// 관리자용 배치 매칭 실행 (관리자 권한 필요)
router.post('/batch', auth_middleware_1.isAdmin, matching_controller_1.runBatchMatching);
exports.default = router;
