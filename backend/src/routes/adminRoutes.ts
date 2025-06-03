import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import * as adminController from '../controllers/adminController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: 관리자 관련 API
 */

/**
 * @swagger
 * /api/admin/register:
 *   post:
 *     summary: 관리자 계정 생성
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: adminPassword
 *               name:
 *                 type: string
 *                 example: 관리자명
 *     responses:
 *       201:
 *         description: 관리자 계정 생성 성공
 *       400:
 *         description: 잘못된 입력 데이터
 *       409:
 *         description: 중복된 사용자 이름
 *       500:
 *         description: 서버 오류
 */
router.post('/register', asyncHandler(adminController.createAdmin));

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: 관리자 로그인
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: adminPassword
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/login', asyncHandler(adminController.loginAdmin));

// 보호된 라우트 (인증 필요)
router.use(protect as express.RequestHandler);

// 관리자 인증 필요 라우트
router.use(adminOnly as express.RequestHandler);

/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: 모든 관리자 목록 조회
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 관리자 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (관리자 아님)
 *       500:
 *         description: 서버 오류
 */
router.get('/', asyncHandler(adminController.getAllAdmins));

/**
 * @swagger
 * /api/admin/{id}:
 *   get:
 *     summary: 특정 관리자 정보 조회
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 관리자 ID
 *     responses:
 *       200:
 *         description: 관리자 정보
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (관리자 아님)
 *       404:
 *         description: 관리자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', asyncHandler(adminController.getAdminById));

/**
 * @swagger
 * /api/admin/{id}/change-password:
 *   put:
 *     summary: 관리자 비밀번호 변경
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 관리자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: oldPassword
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: newPassword
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (관리자 아님)
 *       404:
 *         description: 관리자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id/change-password', asyncHandler(adminController.changePassword));

/**
 * @swagger
 * /api/admin/{id}:
 *   delete:
 *     summary: 관리자 계정 삭제
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 관리자 ID
 *     responses:
 *       200:
 *         description: 관리자 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음 (관리자 아님)
 *       404:
 *         description: 관리자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', asyncHandler(adminController.deleteAdmin));

export default router; 