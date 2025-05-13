/**
 * 크레딧 금액을 형식화된 문자열로 변환합니다.
 * @param amount 형식화할 크레딧 금액
 * @returns 형식화된 크레딧 문자열
 */
export const formatCredit = (amount: number): string => {
  return `${amount.toLocaleString()} Credit`;
};

/**
 * 금액을 원화 형식의 문자열로 변환합니다.
 * @param amount 형식화할 금액
 * @returns 형식화된 원화 문자열
 */
export const formatKRW = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * 날짜를 형식화된 문자열로 변환합니다.
 * @param dateString ISO 형식의 날짜 문자열
 * @returns 형식화된 날짜 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}; 