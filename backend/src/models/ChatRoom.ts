import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IChatRoom extends Document {
  _id: string;
  user1Id: string;  // 매칭된 남성 사용자
  user2Id: string;  // 매칭된 여성 사용자
  user1Left: boolean;  // user1이 나갔는지 여부
  user2Left: boolean;  // user2가 나갔는지 여부
  lastMessageAt?: Date;  // 마지막 메시지 시간
  createdAt: Date;
  updatedAt: Date;
  unlockedSlotsUser1: number[]; // User1이 User2의 사진 중 해제한 슬롯 인덱스들
  unlockedSlotsUser2: number[]; // User2가 User1의 사진 중 해제한 슬롯 인덱스들
}

const ChatRoomSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4
    },
    user1Id: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    user2Id: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    user1Left: {
      type: Boolean,
      default: false,
      index: true
    },
    user2Left: {
      type: Boolean,
      default: false,
      index: true
    },
    lastMessageAt: {
      type: Date
    },
    unlockedSlotsUser1: {
      type: [Number],
      default: []
    },
    unlockedSlotsUser2: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// 두 사용자 간에 활성화된 채팅방이 하나만 있도록 복합 인덱스 설정
ChatRoomSchema.index(
  { 
    user1Id: 1, 
    user2Id: 1, 
    user1Left: 1,
    user2Left: 1
  }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      $or: [
        { user1Left: false },
        { user2Left: false }
      ]
    }
  }
);

// 사용자가 참여한 모든 채팅방을 빠르게 조회할 수 있도록 인덱스 설정
ChatRoomSchema.index({ user1Id: 1, user1Left: 1 });
ChatRoomSchema.index({ user2Id: 1, user2Left: 1 });
ChatRoomSchema.index({ createdAt: -1 });

// 정적 메서드 - 사용자 ID로 활성 채팅방 찾기
ChatRoomSchema.statics.findActiveRoomsByUserId = function(userId: string) {
  return this.find({
    $or: [
      { user1Id: userId, user1Left: false },
      { user2Id: userId, user2Left: false }
    ]
  }).sort({ lastMessageAt: -1, createdAt: -1 });
};

// 정적 메서드 - 두 사용자 사이의 활성 채팅방 찾기
ChatRoomSchema.statics.findActiveRoomBetweenUsers = function(user1Id: string, user2Id: string) {
  return this.findOne({
    $or: [
      { user1Id: user1Id, user2Id: user2Id, user1Left: false, user2Left: false },
      { user1Id: user2Id, user2Id: user1Id, user1Left: false, user2Left: false }
    ]
  });
};

export default mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema); 