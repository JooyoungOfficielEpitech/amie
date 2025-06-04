# Amie Backend API 구조

## 주요 엔드포인트

- **사용자(User)**: 회원가입, 로그인, 프로필, 크레딧 등 사용자 관련 기능 제공
- **매칭(Match/MatchQueue)**: 매칭 대기열, 매칭 요청/취소, 매칭 상태 확인 등
- **채팅(Chat/ChatRoom/Message)**: 채팅방 생성, 메시지 송수신, 채팅방 관리 등
- **크레딧(Credit/CreditLog)**: 크레딧 충전, 사용, 로그 조회 등
- **관리자(Admin)**: 관리자 계정 생성, 로그인, 목록/정보 조회, 삭제 등

## 라우트 구조

- `/api/users` : 사용자 관리
- `/api/queue` : 매칭 대기열 관리
- `/api/chat-rooms` : 채팅방 관리
- `/api/messages` : 메시지 관리
- `/api/credits` : 크레딧 로그 관리
- `/api/admin` : 관리자 관리

## 데이터 모델 요약

- User, MatchQueue, ChatRoom, Message, CreditLog, Admin 등 다양한 도메인 모델로 구성
- 각 모델은 UUID 기반의 고유 ID 사용
- JWT 기반 인증/인가 적용

## Swagger 문서

- swagger/swagger.json 파일에 OpenAPI 3.0 스펙으로 전체 API 명세가 정의되어 있음
- 주요 엔드포인트별 요청/응답 예시, 파라미터, 인증 방식 등 상세 명세 포함

## 참고

- 자세한 엔드포인트 및 데이터 모델은 backend/README.md와 swagger/swagger.json 참고 