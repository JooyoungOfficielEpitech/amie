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
exports.getProfile = exports.addCredit = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const User_1 = __importStar(require("../models/User"));
const MatchQueue_1 = __importDefault(require("../models/MatchQueue"));
const ChatRoom_1 = __importDefault(require("../models/ChatRoom"));
// 새 사용자 생성
const createUser = async (req, res) => {
    try {
        const { email, password, nickname, birthYear, height, city, gender, profileImages, businessCardImage, socialProvider = User_1.SocialProvider.LOCAL } = req.body;
        // 이메일이 필요한 경우 확인 (소셜 로그인이 아닌 경우)
        if (socialProvider === User_1.SocialProvider.LOCAL && !email) {
            return res.status(400).json({ message: '로컬 회원가입 시 이메일이 필요합니다.' });
        }
        // 이메일 중복 확인 (이메일이 있는 경우만)
        if (email) {
            const userExists = await User_1.default.findOne({ email });
            if (userExists) {
                return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
            }
        }
        // 비밀번호 확인 (소셜 로그인이 아닌 경우)
        if (socialProvider === User_1.SocialProvider.LOCAL && !password) {
            return res.status(400).json({ message: '비밀번호가 필요합니다.' });
        }
        // 필수 필드 확인
        if (!nickname || !birthYear || !height || !city || !gender || !profileImages) {
            return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
        }
        // 성별에 따른 명함 사진 유효성 검사
        if (gender === User_1.Gender.FEMALE && businessCardImage) {
            return res.status(400).json({ message: '여성 사용자는 명함 사진을 등록할 수 없습니다.' });
        }
        // 프로필 이미지 개수 제한
        if (profileImages.length > 3) {
            return res.status(400).json({ message: '프로필 이미지는 최대 3개까지 등록 가능합니다.' });
        }
        const user = new User_1.default({
            email,
            passwordHash: password, // 저장 시 모델의 pre 훅에서 해싱됨
            nickname,
            birthYear,
            height,
            city,
            gender,
            profileImages,
            businessCardImage: gender === User_1.Gender.MALE ? businessCardImage : undefined,
            credit: 0,
            socialProvider
        });
        const savedUser = await user.save();
        res.status(201).json({
            _id: savedUser._id,
            email: savedUser.email,
            nickname: savedUser.nickname,
            gender: savedUser.gender,
            socialProvider: savedUser.socialProvider,
            createdAt: savedUser.createdAt
        });
    }
    catch (error) {
        console.error('사용자 생성 에러:', error);
        res.status(500).json({ message: '사용자 생성 중 오류가 발생했습니다.' });
    }
};
exports.createUser = createUser;
// 사용자 목록 조회
const getUsers = async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-passwordHash');
        res.json(users);
    }
    catch (error) {
        console.error('사용자 목록 조회 에러:', error);
        res.status(500).json({ message: '사용자 목록 조회 중 오류가 발생했습니다.' });
    }
};
exports.getUsers = getUsers;
// 사용자 상세 조회
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('사용자 조회 에러:', error);
        res.status(500).json({ message: '사용자 조회 중 오류가 발생했습니다.' });
    }
};
exports.getUserById = getUserById;
// 사용자 정보 업데이트
const updateUser = async (req, res) => {
    try {
        const { nickname, birthYear, height, city, profileImages, businessCardImage } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 성별에 따른 명함 사진 유효성 검사
        if (user.gender === User_1.Gender.FEMALE && businessCardImage) {
            return res.status(400).json({ message: '여성 사용자는 명함 사진을 등록할 수 없습니다.' });
        }
        // 프로필 이미지 개수 제한
        if (profileImages && profileImages.length > 3) {
            return res.status(400).json({ message: '프로필 이미지는 최대 3개까지 등록 가능합니다.' });
        }
        // 필드 업데이트
        if (nickname)
            user.nickname = nickname;
        if (birthYear)
            user.birthYear = birthYear;
        if (height)
            user.height = height;
        if (city)
            user.city = city;
        if (profileImages)
            user.profileImages = profileImages;
        if (user.gender === User_1.Gender.MALE && businessCardImage !== undefined) {
            user.businessCardImage = businessCardImage;
        }
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            email: updatedUser.email,
            nickname: updatedUser.nickname,
            birthYear: updatedUser.birthYear,
            height: updatedUser.height,
            city: updatedUser.city,
            gender: updatedUser.gender,
            profileImages: updatedUser.profileImages,
            businessCardImage: updatedUser.businessCardImage,
            credit: updatedUser.credit,
            socialProvider: updatedUser.socialProvider,
            updatedAt: updatedUser.updatedAt
        });
    }
    catch (error) {
        console.error('사용자 업데이트 에러:', error);
        res.status(500).json({ message: '사용자 업데이트 중 오류가 발생했습니다.' });
    }
};
exports.updateUser = updateUser;
// 사용자 삭제
const deleteUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        await user.deleteOne();
        res.json({ success: true, message: '사용자가 삭제되었습니다.' });
    }
    catch (error) {
        console.error('사용자 삭제 에러:', error);
        res.status(500).json({ message: '사용자 삭제 중 오류가 발생했습니다.' });
    }
};
exports.deleteUser = deleteUser;
// 크레딧 충전
const addCredit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: '유효한 충전 금액을 입력해주세요.' });
        }
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        user.credit += amount;
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            credit: updatedUser.credit,
            message: `${amount}원이 충전되었습니다. 현재 잔액: ${updatedUser.credit}원`
        });
    }
    catch (error) {
        console.error('크레딧 충전 에러:', error);
        res.status(500).json({ message: '크레딧 충전 중 오류가 발생했습니다.' });
    }
};
exports.addCredit = addCredit;
// 프로필 조회 API
const getProfile = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 매칭 중인 상태 확인
        const matchQueue = await MatchQueue_1.default.findOne({
            userId: userId,
            isWaiting: true
        });
        // 활성화된 채팅방이 있는지 확인
        const activeChatRoom = await ChatRoom_1.default.findOne({
            $or: [
                { user1Id: userId },
                { user2Id: userId }
            ],
            isActive: true
        }).sort({ createdAt: -1 });
        // 사용자 프로필 정보
        const profileData = {
            id: user._id,
            email: user.email,
            nickname: user.nickname,
            birthYear: user.birthYear,
            height: user.height,
            city: user.city,
            gender: user.gender,
            profileImages: user.profileImages,
            businessCardImage: user.businessCardImage,
            credit: user.credit,
            createdAt: user.createdAt,
            isWaitingForMatch: user.isWaitingForMatch || (matchQueue !== null), // 매칭 대기 상태
            matchedRoomId: activeChatRoom?._id.toString() || null // 매칭된 채팅방 ID
        };
        res.status(200).json({
            success: true,
            profile: profileData
        });
    }
    catch (error) {
        console.error('프로필 조회 에러:', error);
        res.status(500).json({ message: '프로필 조회 중 오류가 발생했습니다.' });
    }
};
exports.getProfile = getProfile;
