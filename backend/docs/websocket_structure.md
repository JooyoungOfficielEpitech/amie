# Amie Backend WebSocket 구조

## 네임스페이스
- `/match` 네임스페이스를 사용하여 매칭 관련 실시간 통신 처리

## 주요 이벤트
- `authenticate`: 사용자 인증 (userId, token)
- `request_match`: 매칭 요청 (성별, 유저 정보)
- `cancel_match`: 매칭 취소
- `disconnect`: 연결 해제

## 인증 및 매핑
- 소켓 연결 시 `authenticate` 이벤트로 사용자 인증
- 인증 성공 시 userId와 socketId를 매핑하여 관리
- 인증 후 현재 매칭 상태를 클라이언트에 전송

## 매칭 처리
- `request_match` 이벤트로 매칭 요청
- 서버에서 매칭 로직 처리 후 결과를 `match_request_result`로 응답
- 매칭 성공 시 Redis Pub/Sub을 통해 `match_success` 이벤트로 알림
- 매칭 취소 시 `match_cancel_result` 및 `match_cancelled` 이벤트로 알림

## Redis 연동
- 매칭 성공/취소 등 주요 이벤트는 Redis Pub/Sub을 통해 여러 서버 인스턴스에 동기화
- subscribeToChannel 함수로 Redis 채널 구독, 이벤트 발생 시 해당 사용자에게 실시간 알림

## 참고
- 상세 구현은 `src/socket/match.socket.ts` 참고 