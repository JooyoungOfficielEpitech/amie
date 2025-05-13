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
exports.cancelMatch = exports.checkMatchStatus = exports.requestMatch = void 0;
const MatchQueue_1 = __importDefault(require("../models/MatchQueue"));
const User_1 = __importDefault(require("../models/User"));
const CreditLog_1 = __importStar(require("../models/CreditLog"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
// 매칭 요청 (대기열 등록)
const requestMatch = async (req, res) => {
    try {
        const user = req.user;
        // 매칭에 필요한 크레딧 (10개)
        const requiredCredit = 10;
        // 크레딧 확인
        if (user.credit < requiredCredit) {
            return res.status(400).json({
                success: false,
                error: '크레딧이 부족합니다.'
            });
        }
        // 이미 대기열에 있는지 확인
        const existingQueue = await MatchQueue_1.default.findOne({
            userId: user._id,
            isWaiting: true
        });
        if (existingQueue) {
            return res.status(400).json({
                success: false,
                error: '이미 매칭 대기열에 등록되어 있습니다.'
            });
        }
        // 크레딧 차감 및 로그 생성
        const creditLog = new CreditLog_1.default({
            userId: user._id,
            action: CreditLog_1.CreditAction.MATCH,
            amount: -requiredCredit
        });
        await creditLog.save();
        // 사용자 크레딧 업데이트
        user.credit -= requiredCredit;
        await user.save();
        // 매칭 대기열에 등록
        const matchQueue = new MatchQueue_1.default({
            userId: user._id,
            gender: user.gender,
            isWaiting: true
        });
        await matchQueue.save();
        res.json({
            success: true,
            message: '매칭 대기열에 등록되었습니다.'
        });
    }
    catch (error) {
        console.error('매칭 요청 에러:', error);
        res.status(500).json({
            success: false,
            error: '매칭 요청 중 오류가 발생했습니다.'
        });
    }
};
exports.requestMatch = requestMatch;
// 매칭 상태 확인
const checkMatchStatus = async (req, res) => {
    try {
        const user = req.user;
        const userId = user._id.toString();
        // 현재 대기 중인 매칭 요청 확인
        const queueEntry = await MatchQueue_1.default.findOne({
            userId: user._id,
            isWaiting: true
        });
        // 대기 중인 매칭 요청이 없는 경우
        if (!queueEntry) {
            // 최근 매칭된 결과 확인 (최근 7일 이내)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentMatch = await MatchQueue_1.default.findOne({
                userId: userId,
                isWaiting: false,
                updatedAt: { $gte: oneWeekAgo }
            }).sort({ updatedAt: -1 });
            // 최근 매칭 결과가 없는 경우
            if (!recentMatch) {
                return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: null });
            }
            const chatRoom = await ChatRoom_1.default.findOne({
                $or: [{ user1Id: userId }, { user2Id: userId }],
                isActive: true,
            }).sort({ updatedAt: -1 });
            if (!chatRoom) {
                return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: null });
            }
            const matchedUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
            const matchedUser = await User_1.default.findById(matchedUserId)
                .select('_id nickname birthYear height city profileImages');
            if (!matchedUser) {
                return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: chatRoom._id });
            }
            let unlockedPhotoSlotIndexes = [];
            if (chatRoom.user1Id === userId) {
                unlockedPhotoSlotIndexes = chatRoom.unlockedSlotsUser1 || [];
            }
            else if (chatRoom.user2Id === userId) {
                unlockedPhotoSlotIndexes = chatRoom.unlockedSlotsUser2 || [];
            }
            return res.json({
                success: true,
                isWaiting: false,
                chatRoomId: chatRoom._id,
                matchedUser: {
                    id: matchedUser._id,
                    nickname: matchedUser.nickname,
                    birthYear: matchedUser.birthYear,
                    height: matchedUser.height,
                    city: matchedUser.city,
                    profileImages: matchedUser.profileImages,
                    unlockedPhotoSlotIndexes: unlockedPhotoSlotIndexes
                }
            });
        }
        // 대기 중인 경우
        return res.json({ success: true, isWaiting: true, matchedUser: null, chatRoomId: null });
    }
    catch (error) {
        console.error('매칭 상태 확인 에러:', error);
        res.status(500).json({
            success: false,
            error: '매칭 상태 확인 중 오류가 발생했습니다.'
        });
    }
};
exports.checkMatchStatus = checkMatchStatus;
// 매칭 요청 취소
const cancelMatch = async (req, res) => {
    try {
        const user = req.user;
        // 대기 중인 매칭 요청 확인
        const queueEntry = await MatchQueue_1.default.findOne({
            userId: user._id,
            isWaiting: true
        });
        if (!queueEntry) {
            return res.status(400).json({
                success: false,
                error: '현재 대기 중인 매칭 요청이 없습니다.'
            });
        }
        // 매칭 요청 취소 (isWaiting = false로 설정)
        queueEntry.isWaiting = false;
        await queueEntry.save();
        res.json({
            success: true,
            message: '매칭 요청이 취소되었습니다.'
        });
    }
    catch (error) {
        console.error('매칭 취소 에러:', error);
        res.status(500).json({
            success: false,
            error: '매칭 취소 중 오류가 발생했습니다.'
        });
    }
};
exports.cancelMatch = cancelMatch;
