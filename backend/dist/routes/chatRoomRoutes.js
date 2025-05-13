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
const chatRoomController = __importStar(require("../controllers/chatRoomController"));
const userAuthMiddleware_1 = require("../middleware/userAuthMiddleware");
const router = express_1.default.Router();
// 모든 채팅방 관련 라우트에 인증 적용
router.use(userAuthMiddleware_1.protect);
/**
 * @swagger
 * tags:
 *   name: ChatRooms
 *   description: 채팅방 관리 API
 */
/**
 * @swagger
 * /api/chat-rooms:
 *   post:
 *     summary: 새 채팅방 생성
 *     tags: [ChatRooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user1Id
 *               - user2Id
 *             properties:
 *               user1Id:
 *                 type: string
 *                 description: 첫 번째 사용자 ID
 *                 example: user1-uuid
 *               user2Id:
 *                 type: string
 *                 description: 두 번째 사용자 ID
 *                 example: user2-uuid
 *     responses:
 *       201:
 *         description: 채팅방 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chatRoom:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: chatroom-uuid
 *                     user1Id:
 *                       type: string
 *                       example: user1-uuid
 *                     user2Id:
 *                       type: string
 *                       example: user2-uuid
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/', chatRoomController.createChatRoom);
/**
 * @swagger
 * /api/chat-rooms/user/{userId}:
 *   get:
 *     summary: 특정 사용자의 모든 채팅방 조회
 *     tags: [ChatRooms]
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
 *         description: 채팅방 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chatRooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       user1Id:
 *                         type: string
 *                       user2Id:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/user/:userId', chatRoomController.getUserChatRooms);
/**
 * @swagger
 * /api/chat-rooms/{roomId}:
 *   get:
 *     summary: 특정 채팅방 정보 조회
 *     tags: [ChatRooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chatRoom:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     user1Id:
 *                       type: string
 *                     user2Id:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 채팅방을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:roomId', chatRoomController.getChatRoom);
/**
 * @swagger
 * /api/chat-rooms/{roomId}/deactivate:
 *   put:
 *     summary: 채팅방 비활성화
 *     tags: [ChatRooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 비활성화 성공
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
 *                   example: 채팅방이 비활성화되었습니다.
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 채팅방을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:roomId/deactivate', chatRoomController.deactivateChatRoom);
/**
 * @swagger
 * /api/chat-rooms/{roomId}/unlock-slot:
 *   post:
 *     summary: 채팅방 내 상대방 사진 슬롯 잠금 해제
 *     tags: [ChatRooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotIndex
 *             properties:
 *               slotIndex:
 *                 type: integer
 *                 description: 해제할 사진 슬롯 인덱스 (0, 1, 또는 2)
 *                 example: 0
 *     responses:
 *       200:
 *         description: 사진 슬롯 해제 성공
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
 *                   example: 사진 슬롯이 해제되었습니다.
 *                 unlockedSlotsUser1:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [0]
 *                 unlockedSlotsUser2:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: []
 *       400:
 *         description: 잘못된 요청 (예: 잘못된 slotIndex)
 *       401:
 *         description: 인증 실패
 *       402:
 *         description: 크레딧 부족
 *       403:
 *         description: 채팅방 참여자가 아님
 *       404:
 *         description: 채팅방을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/:roomId/unlock-slot', chatRoomController.unlockPhotoSlot);
exports.default = router;
