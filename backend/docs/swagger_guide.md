# Amie Backend Swagger 문서 안내

## 위치
- swagger/swagger.json 파일에 전체 API 명세가 OpenAPI 3.0 포맷으로 정의되어 있음

## 주요 내용
- API 엔드포인트별 요청/응답, 파라미터, 인증 방식, 예시 등 상세 명세 포함
- JWT Bearer 인증 방식(`bearerAuth`) 적용
- 각 API별 summary, description, requestBody, responses 등 명확히 기술

## 활용 방법
- Swagger UI(예: https://editor.swagger.io/)에서 swagger.json 파일을 불러오면 시각적으로 API 문서를 확인하고 테스트 가능
- Postman 등 API 테스트 도구에서 OpenAPI 스펙을 임포트하여 활용 가능

## 주요 태그
- Admin, Auth, ChatRooms, Chat, CreditLogs, Credits, MatchQueue, Match, Messages, UserProfile, Users 등

## 참고
- 실제 API 동작 및 파라미터 예시는 swagger/swagger.json 파일을 직접 참고 