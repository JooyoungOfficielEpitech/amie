"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const creditLogController = __importStar(require("../controllers/creditLogController"));
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: CreditLogs
 *   description: 크레딧 로그 관리 API
 */
/**
 * @swagger
 * /api/credits:
 *   post:
 *     summary: 크레딧 로그 생성
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - action
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *                 example: user-uuid
 *               action:
 *                 type: string
 *                 enum: [CHARGE, MATCH, PROFILE_UNLOCK]
 *                 description: 크레딧 액션 유형
 *                 example: CHARGE
 *               amount:
 *                 type: number
 *                 description: 크레딧 양 (충전은 양수, 사용은 음수)
 *                 example: 50
 *     responses:
 *       201:
 *         description: 크레딧 로그 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 크레딧 로그가 생성되었습니다.
 *                 creditLog:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     action:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 updatedCredit:
 *                   type: number
 *                   example: 100
 *       400:
 *         description: 잘못된 요청 (유효하지 않은 액션 또는 금액)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', creditLogController.createCreditLog);
/**
 * @swagger
 * /api/credits/user/{userId}:
 *   get:
 *     summary: 특정 사용자의 크레딧 로그 조회
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 크레딧 로그 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLogs:
 *                   type: integer
 *                   example: 45
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       action:
 *                         type: string
 *                         enum: [CHARGE, MATCH, PROFILE_UNLOCK]
 *                       amount:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 currentCredit:
 *                   type: number
 *                   example: 120
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/user/:userId', creditLogController.getUserCreditLogs);
/**
 * @swagger
 * /api/credits/{logId}:
 *   get:
 *     summary: 특정 크레딧 로그 조회
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: 크레딧 로그 ID
 *     responses:
 *       200:
 *         description: 크레딧 로그 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 action:
 *                   type: string
 *                   enum: [CHARGE, MATCH, PROFILE_UNLOCK]
 *                 amount:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 크레딧 로그를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:logId', creditLogController.getCreditLog);
/**
 * @swagger
 * /api/credits/charge:
 *   post:
 *     summary: 크레딧 충전
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *                 example: user-uuid
 *               amount:
 *                 type: number
 *                 description: 충전할 크레딧 양 (양수)
 *                 example: 50
 *     responses:
 *       201:
 *         description: 크레딧 충전 성공
 *       400:
 *         description: 잘못된 요청 (유효하지 않은 금액)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/charge', creditLogController.chargeCredit);
/**
 * @swagger
 * /api/credits/use/match:
 *   post:
 *     summary: 매칭 서비스에 크레딧 사용
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *                 example: user-uuid
 *               amount:
 *                 type: number
 *                 description: 사용할 크레딧 양 (음수)
 *                 example: -10
 *     responses:
 *       201:
 *         description: 크레딧 사용 성공
 *       400:
 *         description: 잘못된 요청 (유효하지 않은 금액)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/use/match', creditLogController.useMatchCredit);
/**
 * @swagger
 * /api/credits/use/profile-unlock:
 *   post:
 *     summary: 프로필 잠금해제에 크레딧 사용
 *     tags: [CreditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *                 example: user-uuid
 *               amount:
 *                 type: number
 *                 description: 사용할 크레딧 양 (음수)
 *                 example: -20
 *     responses:
 *       201:
 *         description: 크레딧 사용 성공
 *       400:
 *         description: 잘못된 요청 (유효하지 않은 금액)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/use/profile-unlock', creditLogController.useProfileUnlockCredit);
exports.default = router;
