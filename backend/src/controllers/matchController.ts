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
    
    console.log(`[matchController] 매칭 상태 확인: userId=${userId}, gender=${user.gender}`);

    // 현재 대기 중인 매칭 요청 확인
    const queueEntry = await MatchQueue.findOne({
      userId: user._id,
      isWaiting: true
    });

    // 대기 중인 매칭 요청이 없는 경우
    if (!queueEntry) {
      // 가장 최근의 활성화된 채팅방 찾기 (시간 제한 없이)
      console.log(`[matchController] 활성화된 채팅방 검색: userId=${userId}`);
      
      const chatRoom = await ChatRoom.findOne({
        $or: [
          { user1Id: userId, user1Left: false },
          { user2Id: userId, user2Left: false }
        ]
      }).sort({ updatedAt: -1 });

      if (!chatRoom) {
        console.log(`[matchController] 활성화된 채팅방 없음: userId=${userId}`);
        return res.json({ success: true, isWaiting: false, matchedUser: null, chatRoomId: null });
      }

      console.log(`[matchController] 활성화된 채팅방 발견: roomId=${chatRoom._id}, user1Id=${chatRoom.user1Id}, user2Id=${chatRoom.user2Id}`);
      
      // 채팅방에서 상대방 ID 확인
      const matchedUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
      console.log(`[matchController] 상대방 ID: ${matchedUserId}`);
      
      const matchedUser = await User.findById(matchedUserId)
        .select('_id nickname birthYear height city profileImages gender');

      if (!matchedUser) {
        console.log(`[matchController] 상대방 정보를 찾을 수 없음: matchedUserId=${matchedUserId}`);
        return res.json({ 
          success: true, 
          isWaiting: false, 
          matchedUser: null, 
          chatRoomId: chatRoom._id,
          error: "상대방 정보를 찾을 수 없습니다" 
        });
      }

      console.log(`[matchController] 상대방 정보 조회 성공: ${matchedUser.nickname}, gender=${matchedUser.gender}`);

      // 해제된 사진 슬롯 인덱스 확인 (성별에 맞게)
      let unlockedPhotoSlotIndexes: number[] = [];
      if (chatRoom.user1Id === userId) {  // 사용자가 남성인 경우
        unlockedPhotoSlotIndexes = chatRoom.unlockedSlotsUser1 || [];
      } else {  // 사용자가 여성인 경우
        unlockedPhotoSlotIndexes = chatRoom.unlockedSlotsUser2 || [];
      }

      console.log(`[matchController] 해제된 사진 슬롯: ${unlockedPhotoSlotIndexes.join(', ')}`);

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
          gender: matchedUser.gender,
          unlockedPhotoSlotIndexes: unlockedPhotoSlotIndexes
        }
      });
    }

    // 대기 중인 경우
    console.log(`[matchController] 매칭 대기 중: userId=${userId}`);
    return res.json({ success: true, isWaiting: true, matchedUser: null, chatRoomId: null });
  } catch (error) {
    console.error('매칭 상태 확인 에러:', error);
    res.status(500).json({
      success: false,
      error: '매칭 상태 확인 중 오류가 발생했습니다'
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