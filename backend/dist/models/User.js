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
exports.SocialProvider = exports.Gender = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
})(Gender || (exports.Gender = Gender = {}));
var SocialProvider;
(function (SocialProvider) {
    SocialProvider["LOCAL"] = "local";
    SocialProvider["GOOGLE"] = "google";
    SocialProvider["KAKAO"] = "kakao";
})(SocialProvider || (exports.SocialProvider = SocialProvider = {}));
const UserSchema = new mongoose_1.Schema({
    _id: {
        type: String,
        default: uuid_1.v4
    },
    email: {
        type: String,
        sparse: true,
        trim: true,
        lowercase: true,
        index: true
    },
    passwordHash: {
        type: String
    },
    nickname: {
        type: String,
        required: true,
        trim: true
    },
    birthYear: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: Object.values(Gender),
        required: true
    },
    profileImages: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length <= 3;
            },
            message: '프로필 이미지는 최대 3개까지 허용됩니다.'
        }
    },
    businessCardImage: {
        type: String,
        validate: {
            validator: function (v) {
                return this.gender !== Gender.FEMALE || !v;
            },
            message: '명함 사진은 남성 사용자만 업로드할 수 있습니다.'
        }
    },
    credit: {
        type: Number,
        default: 0
    },
    socialProvider: {
        type: String,
        enum: Object.values(SocialProvider),
        required: true
    },
    isWaitingForMatch: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});
// 비밀번호 비교 메서드
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.passwordHash);
};
// 비밀번호 해싱 미들웨어
UserSchema.pre('save', async function (next) {
    if (this.isModified('passwordHash') && this.passwordHash) {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.passwordHash = await bcryptjs_1.default.hash(this.passwordHash, salt);
    }
    next();
});
exports.default = mongoose_1.default.model('User', UserSchema);
