export const API_PATHS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    SOCIAL_LOGIN: '/api/auth/social-login',
    SOCIAL_REGISTER: '/api/auth/social-register'
  },
  USER: {
    PROFILE: '/api/user/profile'
  },
  CREDIT: {
    CURRENT: '/api/credit/current',
    CHARGE: '/api/credit/charge',
    USAGE_INFO: '/api/credit/usage-info',
    LOGS: '/api/credit/logs',
    USE: '/api/credit/use'
  },
  MATCH: {
    REQUEST: '/api/match/request',
    STATUS: '/api/match/status',
    CANCEL: '/api/match/cancel'
  },
  CHAT: {
    ROOMS: '/api/chat/rooms',
    ROOM: (id: string) => `/api/chat/room/${id}`,
    MESSAGE: '/api/chat/message'
  }
}; 