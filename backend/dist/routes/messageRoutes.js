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
const messageController = __importStar(require("../controllers/messageController"));
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: 메시지 관리 API
 */
/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: 새 메시지 전송
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatRoomId
 *               - senderId
 *               - content
 *             properties:
 *               chatRoomId:
 *                 type: string
 *                 description: 채팅방 ID
 *                 example: chatroom-uuid
 *               senderId:
 *                 type: string
 *                 description: 발신자 ID
 *                 example: user-uuid
 *               content:
 *                 type: string
 *                 description: 메시지 내용
 *                 example: 안녕하세요! 만나서 반갑습니다.
 *     responses:
 *       201:
 *         description: 메시지 전송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     chatRoomId:
 *                       type: string
 *                     senderId:
 *                       type: string
 *                     content:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 채팅방을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', messageController.sendMessage);
/**
 * @swagger
 * /api/messages/chat-room/{chatRoomId}:
 *   get:
 *     summary: 특정 채팅방의 메시지 목록 조회
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatRoomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
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
 *           default: 50
 *         description: 페이지당 메시지 수
 *     responses:
 *       200:
 *         description: 메시지 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalMessages:
 *                   type: integer
 *                   example: 120
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       chatRoomId:
 *                         type: string
 *                       senderId:
 *                         type: string
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 채팅방을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/chat-room/:chatRoomId', messageController.getChatRoomMessages);
/**
 * @swagger
 * /api/messages/{messageId}:
 *   get:
 *     summary: 특정 메시지 조회
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 메시지 ID
 *     responses:
 *       200:
 *         description: 메시지 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     chatRoomId:
 *                       type: string
 *                     senderId:
 *                       type: string
 *                     content:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 메시지를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:messageId', messageController.getMessage);
exports.default = router;
