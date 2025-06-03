import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import * as matchQueueController from '../controllers/matchQueueController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MatchQueue
 *   description: 매칭 대기열 관리 API
 */

/**
 * @swagger
 * /api/queue/join:
 *   post:
 *     summary: 매칭 대기열에 참여
 *     tags: [MatchQueue]
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
 *               - preferences
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *                 example: user-uuid
 *               preferences:
 *                 type: object
 *                 properties:
 *                   ageRange:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                         example: 20
 *                       max:
 *                         type: number
 *                         example: 30
 *                   heightRange:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                         example: 160
 *                       max:
 *                         type: number
 *                         example: 180
 *                   cities:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Seoul", "Incheon"]
 *     responses:
 *       201:
 *         description: 매칭 대기열 참여 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 매칭 대기열에 참여했습니다.
 *       400:
 *         description: 잘못된 요청 (이미 대기열에 있음)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/join', asyncHandler(matchQueueController.joinQueue));

/**
 * @swagger
 * /api/queue/{userId}/leave:
 *   put:
 *     summary: 매칭 대기열에서 나가기
 *     tags: [MatchQueue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 매칭 대기열에서 나가기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 매칭 대기열에서 나갔습니다.
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 대기열 항목을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:userId/leave', asyncHandler(matchQueueController.leaveQueue));

/**
 * @swagger
 * /api/queue/{userId}/status:
 *   get:
 *     summary: 매칭 대기열 상태 확인
 *     tags: [MatchQueue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 매칭 대기열 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 inQueue:
 *                   type: boolean
 *                   example: true
 *                 queueEntry:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     preferences:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                   nullable: true
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/:userId/status', asyncHandler(matchQueueController.checkQueueStatus));

/**
 * @swagger
 * /api/queue/{userId}/match:
 *   get:
 *     summary: 매칭 상대 찾기
 *     tags: [MatchQueue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 매칭 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 matched:
 *                   type: boolean
 *                   example: true
 *                 matchedUser:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     profile:
 *                       type: object
 *                   nullable: true
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 대기열에 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:userId/match', asyncHandler(matchQueueController.findMatch));

/**
 * @swagger
 * /api/queue:
 *   get:
 *     summary: 모든 대기열 항목 조회 (관리자용)
 *     tags: [MatchQueue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모든 대기열 항목
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       preferences:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (관리자 아님)
 *       500:
 *         description: 서버 오류
 */
router.get('/', asyncHandler(matchQueueController.getAllQueueEntries));

/**
 * @swagger
 * /api/queue/stats:
 *   get:
 *     summary: 대기열 통계 조회
 *     description: 현재 매칭 대기열에 있는 남성과 여성 사용자 수를 MongoDB와 Redis에서 확인합니다. 선택적으로 동기화도 수행합니다.
 *     tags: [MatchQueue]
 *     security:
 *       - jwtAuth: []
 *     parameters:
 *       - in: query
 *         name: sync
 *         schema:
 *           type: boolean
 *         required: false
 *         description: true로 설정하면 Redis와 MongoDB 간 대기열 데이터를 동기화합니다
 *     responses:
 *       200:
 *         description: 대기열 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sync:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     syncCount:
 *                       type: number
 *                   nullable: true
 *                 mongodb:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     male:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                     female:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                 redis:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     male:
 *                       type: object
 *                     female:
 *                       type: object
 *                 inconsistencies:
 *                   type: object
 *                   properties:
 *                     male:
 *                       type: boolean
 *                     female:
 *                       type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 서버 오류
 */
router.get('/stats', asyncHandler(matchQueueController.getQueueStats));

export default router; 