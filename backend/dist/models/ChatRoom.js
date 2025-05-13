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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const uuid_1 = require("uuid");
const ChatRoomSchema = new mongoose_1.Schema({
    _id: {
        type: String,
        default: uuid_1.v4
    },
    user1Id: {
        type: String,
        required: true,
        ref: 'User'
    },
    user2Id: {
        type: String,
        required: true,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    unlockedSlotsUser1: {
        type: [Number],
        default: []
    },
    unlockedSlotsUser2: {
        type: [Number],
        default: []
    }
}, {
    timestamps: true
});
// 두 사용자 간에 활성화된 채팅방이 하나만 있도록 복합 인덱스 설정
ChatRoomSchema.index({
    user1Id: 1,
    user2Id: 1,
    isActive: 1
}, {
    unique: true,
    partialFilterExpression: { isActive: true }
});
// 사용자가 참여한 모든 채팅방을 빠르게 조회할 수 있도록 인덱스 설정
ChatRoomSchema.index({ user1Id: 1, isActive: 1 });
ChatRoomSchema.index({ user2Id: 1, isActive: 1 });
exports.default = mongoose_1.default.model('ChatRoom', ChatRoomSchema);
