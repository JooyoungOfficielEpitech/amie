FROM --platform=linux/arm64 node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# node-gyp 및 native 모듈 빌드에 필요한 도구 설치
RUN apk add --no-cache python3 make g++ curl

# bcrypt를 제외한 모든 의존성 설치
RUN npm install --omit=dev --ignore-scripts

# bcrypt 대신 bcryptjs 사용 (순수 JavaScript 구현으로 네이티브 종속성 없음)
RUN npm uninstall bcrypt
RUN npm install bcryptjs

# 소스 코드 복사
COPY . .

# 개발 환경을 위한 포트 설정
EXPOSE 3001

# 개발 모드로 실행
CMD ["npm", "run", "dev"] 