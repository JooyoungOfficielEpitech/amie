import { Request, Response } from 'express';
import Message, { IMessage } from '../models/Message';
import ChatRoom from '../models/ChatRoom';
import User from '../models/User';

// 새 메시지 전송
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: '인증되지 않은 사용자입니다.' });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, error: '메시지 내용을 입력해주세요.' });
    }

    // 채팅방 존재 및 참여 권한 확인
    const chatRoom = await ChatRoom.findOne({
      _id: roomId,
      $or: [
        { user1Id: userId, user1Left: false },
        { user2Id: userId, user2Left: false }
      ]
    });

    if (!chatRoom) {
      return res.status(404).json({ success: false, error: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    // 상대방이 나갔는지 확인
    const isUser1 = chatRoom.user1Id === userId;
    const partnerLeft = isUser1 ? chatRoom.user2Left : chatRoom.user1Left;
    if (partnerLeft) {
      return res.status(400).json({ success: false, error: '상대방이 채팅방을 나갔습니다.' });
    }

    // 새 메시지 생성
    const newMessage = new Message({
      chatRoomId: roomId,
      senderId: userId,
      message: message.trim()
    });

    await newMessage.save();

    // 채팅방 업데이트 시간 갱신
    chatRoom.updatedAt = new Date();
    await chatRoom.save();

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('메시지 전송 에러:', error);
    res.status(500).json({ success: false, error: '메시지 전송 중 오류가 발생했습니다.' });
  }
};

// 채팅방의 메시지 목록 조회
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: '인증되지 않은 사용자입니다.' });
    }

    // 채팅방 존재 및 참여 권한 확인
    const chatRoom = await ChatRoom.findOne({
      _id: roomId,
      $or: [
        { user1Id: userId, user1Left: false },
        { user2Id: userId, user2Left: false }
      ]
    });

    if (!chatRoom) {
      return res.status(404).json({ success: false, error: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    // 메시지 조회
    const messages = await Message.find({ chatRoomId: roomId })
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('메시지 조회 에러:', error);
    res.status(500).json({ success: false, error: '메시지 조회 중 오류가 발생했습니다.' });
  }
};

// 특정 메시지 조회
export const getMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: '존재하지 않는 메시지입니다.' });
    }

    res.json(message);
  } catch (error) {
    console.error('메시지 조회 에러:', error);
    res.status(500).json({ message: '메시지 조회 중 오류가 발생했습니다.' });
  }
}; 