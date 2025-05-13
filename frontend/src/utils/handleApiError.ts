/**
 * API 호출 에러에서 사용자에게 표시할 메시지 추출
 * @param error API 호출 중 발생한 에러 객체
 * @param defaultMessage 기본 에러 메시지
 * @returns 사용자에게 표시할 에러 메시지
 */
export const getErrorMessage = (error: any, defaultMessage = '요청 처리 중 오류가 발생했습니다.'): string => {
  // axios 에러 객체인 경우
  if (error?.response) {
    // 서버에서 보낸 에러 메시지가 있는 경우
    const serverMessage = error.response?.data?.message || error.response?.data?.error;
    if (serverMessage) {
      return serverMessage;
    }
    
    // HTTP 상태 코드에 따른 기본 메시지
    switch (error.response.status) {
      case 400: return '잘못된 요청입니다.';
      case 401: return '로그인이 필요합니다.';
      case 403: return '접근 권한이 없습니다.';
      case 404: return '요청한 리소스를 찾을 수 없습니다.';
      case 409: return '중복된 데이터가 있습니다.';
      case 422: return '입력 데이터를 확인해주세요.';
      case 429: return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500: return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502: 
      case 503: 
      case 504: return '서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
      default: return `오류가 발생했습니다. (${error.response.status})`;
    }
  }
  
  // 네트워크 오류인 경우
  if (error?.message === 'Network Error') {
    return '네트워크 연결을 확인해주세요.';
  }
  
  // 타임아웃 오류인 경우
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
  }
  
  // 에러 객체의 message 프로퍼티가 있는 경우
  if (error?.message) {
    return error.message;
  }
  
  // 그 외의 경우 기본 메시지 반환
  return defaultMessage;
};

/**
 * API 에러를 처리하는 함수
 * @param error API 호출 중 발생한 에러 객체
 * @param setError 에러 상태를 설정하는 함수 (useState의 setter)
 * @param defaultMessage 기본 에러 메시지
 * @returns 사용자에게 표시할 에러 메시지
 */
export const handleApiError = (
  error: any,
  setError?: (message: string) => void,
  defaultMessage = '요청 처리 중 오류가 발생했습니다.'
): string => {
  const errorMessage = getErrorMessage(error, defaultMessage);
  
  // 에러 콘솔 출력
  console.error('API Error:', error);
  
  // 상태 업데이트 함수가 있으면 에러 메시지 설정
  if (setError) {
    setError(errorMessage);
  }
  
  return errorMessage;
}; 