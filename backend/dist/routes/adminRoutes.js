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
const adminController = __importStar(require("../controllers/adminController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
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
router.post('/register', adminController.createAdmin);
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
router.post('/login', adminController.loginAdmin);
// 보호된 라우트 (인증 필요)
router.use(authMiddleware_1.protect);
// 관리자 인증 필요 라우트
router.use(authMiddleware_1.adminOnly);
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
router.get('/', adminController.getAllAdmins);
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
router.get('/:id', adminController.getAdminById);
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
router.put('/:id/change-password', adminController.changePassword);
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
router.delete('/:id', adminController.deleteAdmin);
exports.default = router;
