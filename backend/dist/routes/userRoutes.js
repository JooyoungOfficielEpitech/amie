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
const userController = __importStar(require("../controllers/userController"));
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 사용자 관리 API
 */
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 새 사용자 생성
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nickname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securePassword123
 *               nickname:
 *                 type: string
 *                 example: 사용자닉네임
 *               birthYear:
 *                 type: number
 *                 example: 1990
 *               height:
 *                 type: number
 *                 example: 175
 *               city:
 *                 type: string
 *                 example: Seoul
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 example: male
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 중복된 이메일 또는 닉네임
 *       500:
 *         description: 서버 오류
 */
router.post('/', userController.createUser);
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 모든 사용자 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: 페이지당 사용자 수
 *     responses:
 *       200:
 *         description: 사용자 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalUsers:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       nickname:
 *                         type: string
 *                       gender:
 *                         type: string
 *                       birthYear:
 *                         type: number
 *                       height:
 *                         type: number
 *                       city:
 *                         type: string
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', userController.getUsers);
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 특정 사용자 정보 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     birthYear:
 *                       type: number
 *                     height:
 *                       type: number
 *                     city:
 *                       type: string
 *                     profileImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     credit:
 *                       type: number
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', userController.getUserById);
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: 사용자 정보 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 example: 변경된닉네임
 *               password:
 *                 type: string
 *                 format: password
 *                 example: newPassword123
 *               birthYear:
 *                 type: number
 *                 example: 1992
 *               height:
 *                 type: number
 *                 example: 178
 *               city:
 *                 type: string
 *                 example: Busan
 *               profileImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["image1.jpg", "image2.jpg"]
 *     responses:
 *       200:
 *         description: 사용자 정보 수정 성공
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
 *                   example: 사용자 정보가 업데이트되었습니다.
 *                 user:
 *                   type: object
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', userController.updateUser);
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 사용자 삭제
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 삭제 성공
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
 *                   example: 사용자가 삭제되었습니다.
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', userController.deleteUser);
/**
 * @swagger
 * /api/users/{id}/credit:
 *   post:
 *     summary: 사용자 크레딧 추가
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: 추가할 크레딧 양
 *                 example: 50
 *     responses:
 *       200:
 *         description: 크레딧 추가 성공
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
 *                   example: 크레딧이 추가되었습니다.
 *                 credit:
 *                   type: number
 *                   example: 150
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/:id/credit', userController.addCredit);
/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 현재 로그인한 사용자 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 프로필 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                     birthYear:
 *                       type: number
 *                     height:
 *                       type: number
 *                     city:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     profileImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     businessCardImage:
 *                       type: string
 *                     credit:
 *                       type: number
 *                     isWaitingForMatch:
 *                       type: boolean
 *                       description: 매칭 대기 상태
 *                     matchedRoomId:
 *                       type: string
 *                       description: 매칭된 채팅방 ID (없으면 null)
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/profile', userController.getProfile);
exports.default = router;
