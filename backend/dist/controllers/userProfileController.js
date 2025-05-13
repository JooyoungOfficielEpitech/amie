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
exports.updateMyProfile = exports.getMyProfile = void 0;
const User_1 = __importStar(require("../models/User"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
// 내 프로필 조회
const getMyProfile = async (req, res) => {
    try {
        // 인증 미들웨어에서 추가된 사용자 정보 사용
        const user = req.user;
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }
        let effectiveIsWaiting = user.isWaitingForMatch;
        let matchedRoomId = null;
        // Check for an active chat room the user is part of
        const activeChatRoom = await ChatRoom_1.default.findOne({
            $or: [{ user1Id: user._id }, { user2Id: user._id }],
            isActive: true
        });
        if (activeChatRoom) {
            // If user has an active chat room, they are effectively matched, not waiting
            effectiveIsWaiting = false;
            matchedRoomId = activeChatRoom._id;
            // Optional: Ensure DB consistency if isWaitingForMatch was somehow true
            if (user.isWaitingForMatch) {
                console.warn(`User ${user._id} has active chat room ${matchedRoomId} but isWaitingForMatch was true. Correcting.`);
                await User_1.default.findByIdAndUpdate(user._id, { isWaitingForMatch: false });
            }
        }
        // 필요한 프로필 정보만 추출
        const profile = {
            id: user._id,
            nickname: user.nickname,
            birthYear: user.birthYear,
            height: user.height,
            city: user.city,
            profileImages: user.profileImages,
            gender: user.gender,
            credit: user.credit,
            isWaitingForMatch: effectiveIsWaiting,
            matchedRoomId: matchedRoomId
        };
        // 성별이 남성인 경우에만 명함 사진 추가
        if (user.gender === User_1.Gender.MALE && user.businessCardImage) {
            Object.assign(profile, { businessCardImage: user.businessCardImage });
        }
        res.json({
            success: true,
            profile
        });
    }
    catch (error) {
        console.error('프로필 조회 에러:', error);
        res.status(500).json({
            success: false,
            error: '프로필 조회 중 오류가 발생했습니다.'
        });
    }
};
exports.getMyProfile = getMyProfile;
// 내 프로필 수정
const updateMyProfile = async (req, res) => {
    try {
        const { nickname, birthYear, height, city, profileImages } = req.body;
        // 인증 미들웨어에서 추가된 사용자 정보 사용
        const user = req.user;
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }
        // 요청에 포함된 필드만 업데이트
        if (nickname !== undefined)
            user.nickname = nickname;
        if (birthYear !== undefined)
            user.birthYear = birthYear;
        if (height !== undefined)
            user.height = height;
        if (city !== undefined)
            user.city = city;
        // 프로필 이미지 처리
        if (profileImages !== undefined) {
            // 프로필 이미지 개수 제한
            if (profileImages.length > 3) {
                return res.status(400).json({
                    success: false,
                    error: '프로필 이미지는 최대 3개까지 등록 가능합니다.'
                });
            }
            user.profileImages = profileImages;
        }
        // 명함 사진 처리 (요청에 포함된 경우)
        if (req.body.businessCardImage !== undefined) {
            // 여성 사용자는 명함 사진을 등록할 수 없음
            if (user.gender === User_1.Gender.FEMALE && req.body.businessCardImage) {
                return res.status(400).json({
                    success: false,
                    error: '여성 사용자는 명함 사진을 등록할 수 없습니다.'
                });
            }
            user.businessCardImage = req.body.businessCardImage;
        }
        await user.save();
        res.json({
            success: true,
            message: '프로필 수정 완료'
        });
    }
    catch (error) {
        console.error('프로필 수정 에러:', error);
        res.status(500).json({
            success: false,
            error: '프로필 수정 중 오류가 발생했습니다.'
        });
    }
};
exports.updateMyProfile = updateMyProfile;
