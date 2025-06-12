import { test, expect } from '@playwright/test';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

test.describe('회원가입 및 매치 시작 시나리오', () => {
  test('회원가입 후 매치 시작까지 정상 동작 확인', async ({ page }, testInfo) => {
    test.setTimeout(60000); // 전체 테스트 타임아웃 60초로 증가
    // 회원가입 페이지로 이동
    await page.goto('http://localhost:5173/');
    
    // Sign up 클릭
    await page.click('text=Sign up');
    await expect(page.locator('input#signup-email')).toBeVisible();

    // 이메일 입력
    await page.fill('input#signup-email', `test${Date.now()}@example.com`);
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 성별 선택 (남성)
    await page.click('button[aria-label="Female"]');
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 비밀번호 입력
    await page.fill('input#signup-password', 'test1234!');
    await page.fill('input#signup-password-confirm', 'test1234!');
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 닉네임 입력
    await page.fill('input#signup-nickname', `테스트유저${Date.now()}`);
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 생년월일 입력
    await page.fill('input#signup-dob', '1995-01-01');
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 키 입력
    await page.fill('input#signup-height', '175');
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 도시 입력
    await page.fill('input#signup-city', 'Seoul');
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');

    // 프로필 사진 3장 업로드 (amie_logo.png)
    const testFileDir = dirname(fileURLToPath(import.meta.url));
    const imagePath = resolve(testFileDir, '../src/assets/amie_logo.png');
    for (let i = 0; i < 3; i++) {
      await page.click('text=Upload Photo');
      await page.setInputFiles('input#signup-profile-pics', imagePath);
      await expect(page.locator('img[alt^="Profile"]')).toHaveCount(i + 1, { timeout: 10000 });
    }
    await expect(page.locator('button:has-text("Finish")')).toBeEnabled();
    await page.click('button:has-text("Finish")');

    // (남성일 경우) 명함 업로드 단계도 유사하게 진행

    // 회원가입 완료 후, 다음 단계(예: 메인 페이지 이동 등) 확인
    // await expect(page).toHaveURL('/'); // 등등
  });
}); 