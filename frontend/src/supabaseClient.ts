import { createClient } from '@supabase/supabase-js';

console.log('[SupabaseClient] import.meta.env:', import.meta.env); // 디버깅 로그 유지

// Supabase URL과 서비스 키를 환경 변수에서 가져옵니다.
// .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_SERVICE_KEY를 설정해야 합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // 서비스 키를 사용

if (!supabaseUrl || !serviceKey) {
  let missingVars = [];
  if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!serviceKey) missingVars.push("VITE_SUPABASE_SERVICE_KEY"); // 오류 메시지에 VITE_SUPABASE_SERVICE_KEY 명시
  // 참고: .env 파일에서 서비스 키 변수명은 반드시 VITE_SUPABASE_SERVICE_KEY 여야 합니다.
  throw new Error(`Supabase 구성 오류. 환경 변수 누락: ${missingVars.join(', ')}. .env 파일에 해당 변수가 VITE_ 접두사를 사용하여 올바르게 설정되었는지 확인하세요.`);
}

// Supabase 클라이언트를 서비스 키로 초기화합니다.
// 이렇게 하면 클라이언트는 RLS 정책을 우회하는 관리자 권한을 갖게 됩니다.
export const supabase = createClient(supabaseUrl, serviceKey);