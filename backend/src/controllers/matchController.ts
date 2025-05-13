import { Request, Response } from 'express';
import MatchQueue from '../models/MatchQueue';
import User from '../models/User';
import CreditLog, { CreditAction } from '../models/CreditLog';
import mongoose from 'mongoose';
import ChatRoom from '../models/ChatRoom';

// 매칭 요청 (대기열 등록)
export const requestMatch = async (req: Request, res: Response) => {
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
    const existingQueue = await MatchQueue.findOne({
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
    const creditLog = new CreditLog({
      userId: user._id,
      action: CreditAction.MATCH,
      amount: -requiredCredit
    });
    
    await creditLog.save();

    // 사용자 크레딧 업데이트
    user.credit -= requiredCredit;
    await user.save();

    // 매칭 대기열에 등록
    const matchQueue = new MatchQueue({
      userId: user._id,
      gender: user.gender,
      isWaiting: true
    });

    await matchQueue.save();

    res.json({
      success: true,
      message: '매칭 대기열에 등록되었습니다.'
    });
  } catch (error) {
    console.error('매칭 요청 에러:', error);
    res.status(500).json({
      success: false,
      error: '매칭 요청 중 오류가 발생했습니다.'
    });
  }
};

// 매칭 상태 확인
export const checkMatchStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const userId = user._id.toString();

    // 현재 대기 중인 매칭 요청 확인
    const queueEntry = await MatchQueue.findOne({
      userId: user._id,
      isWaiting: true
    });

    // 대기 중인 매칭 요청이 없는 경우
    if (!queueEntry) {
      // 최근 매칭된 결과 확인 (최근 7일 이내)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentMatch = await MatchQueue.findOne({
        userId: userId,
        isWaiting: false,
        updatedAt: { $gte: oneWeekAgo }
      }).sort({ updatedAt: -1 });

      // 최근 매칭 결과가 없는 경우
      if (!recentMatch) {
        return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: null });
      }

      const chatRoom = await ChatRoom.findOne({
        $or: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      }).sort({ updatedAt: -1 });

      if (!chatRoom) {
          return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: null });
      }

      const matchedUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
      const matchedUser = await User.findById(matchedUserId)
        .select('_id nickname birthYear height city profileImages');

      if (!matchedUser) {
        return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: chatRoom._id });
      }

      let unlockedPhotoSlotIndexes: number[] = [];
      if (chatRoom.user1Id === userId) {
        unlockedPhotoSlotIndexes = chatRoom.unlockedSlotsUser1 || [];
      } else if (chatRoom.user2Id === userId) {
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
  } catch (error) {
    console.error('매칭 상태 확인 에러:', error);
    res.status(500).json({
      success: false,
      error: '매칭 상태 확인 중 오류가 발생했습니다.'
    });
  }
};

// 매칭 요청 취소
export const cancelMatch = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    // 대기 중인 매칭 요청 확인
    const queueEntry = await MatchQueue.findOne({
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
  } catch (error) {
    console.error('매칭 취소 에러:', error);
    res.status(500).json({
      success: false,
      error: '매칭 취소 중 오류가 발생했습니다.'
    });
  }
}; 