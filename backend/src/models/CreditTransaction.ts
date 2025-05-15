import mongoose, { Document, Schema } from 'mongoose';

export interface ICreditTransaction extends Document {
  userId: mongoose.Types.ObjectId | string;
  amount: number;  // 양수는 추가, 음수는 차감
  type: 'ADDITION' | 'DEDUCTION';
  reason: string;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['ADDITION', 'DEDUCTION'],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    }
  },
  { 
    timestamps: true 
  }
);

// 인덱스 생성 - 사용자별 조회 최적화
creditTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ICreditTransaction>('CreditTransaction', creditTransactionSchema); 