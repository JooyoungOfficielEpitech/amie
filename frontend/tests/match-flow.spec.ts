import { test, expect, Page, BrowserContext } from '@playwright/test';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

type UserInfo = {
  email: string;
  password: string;
  nickname: string;
  gender: 'male' | 'female';
};

// 회원가입 플로우 함수
async function registerUser(page: Page, user: UserInfo, imagePath: string) {
  await page.goto('http://localhost:5173/');
  await page.click('text=Sign up');
  await expect(page.locator('input#signup-email')).toBeVisible();
  await page.fill('input#signup-email', user.email);
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.click(`button[aria-label="${user.gender === 'male' ? 'Male' : 'Female'}"]`);
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.fill('input#signup-password', user.password);
  await page.fill('input#signup-password-confirm', user.password);
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.fill('input#signup-nickname', user.nickname);
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.fill('input#signup-dob', '1995-01-01');
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.fill('input#signup-height', '175');
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  await page.fill('input#signup-city', 'Seoul');
  await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  await page.click('button:has-text("Next")');
  for (let i = 0; i < 3; i++) {
    await page.click('text=Upload Photo');
    await page.setInputFiles('input#signup-profile-pics', imagePath);
    await expect(page.locator('img[alt^="Profile"]')).toHaveCount(i + 1, { timeout: 10000 });
  }
  if (user.gender === 'male') {
    // 프로필 사진 업로드 후 Next
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
    await page.click('button:has-text("Next")');
    // 명함 업로드
    await page.click('text=Upload Business Card');
    await page.setInputFiles('input#signup-business-card', imagePath);
    await expect(page.locator('img[alt="Business Card"]')).toBeVisible({ timeout: 10000 });
    // Finish
    await expect(page.locator('button:has-text("Finish")')).toBeEnabled();
    await page.click('button:has-text("Finish")');
  } else {
    await expect(page.locator('button:has-text("Finish")')).toBeEnabled();
    await page.click('button:has-text("Finish")');
  }
}

// 로그인 플로우 함수
async function loginUser(page: Page, user: UserInfo) {
  await page.goto('http://localhost:5173/');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button:has-text("Continue with Email")');
  await expect(page).toHaveURL('http://localhost:5173/'); // 메인 페이지로 이동
}

test('남자/여자 유저 매칭 시나리오', async ({ browser }) => {
  const testFileDir = dirname(fileURLToPath(import.meta.url));
  const imagePath = resolve(testFileDir, '../src/assets/amie_logo.png');

  const maleUser: UserInfo = {
    email: `male${Date.now()}@example.com`,
    password: 'test1234!',
    nickname: `남자${Date.now()}`,
    gender: 'male',
  };
  const femaleUser: UserInfo = {
    email: `female${Date.now()}@example.com`,
    password: 'test1234!',
    nickname: `여자${Date.now()}`,
    gender: 'female',
  };

  const maleContext = await browser.newContext();
  const femaleContext = await browser.newContext();
  const malePage = await maleContext.newPage();
  const femalePage = await femaleContext.newPage();

  // 회원가입
  await registerUser(malePage, maleUser, imagePath);
  await registerUser(femalePage, femaleUser, imagePath);

  // 회원가입 후 2초 대기
  await malePage.waitForTimeout(2000);
  await femalePage.waitForTimeout(2000);

  // 매칭 버튼 클릭 (메인 페이지)
  await malePage.click('button:has-text("Start Matching")');
  await femalePage.click('button:has-text("Start Matching")');

  // 매칭 성공 시 채팅방으로 이동하는지 확인
  await expect(malePage).toHaveURL(/\/chat\//, { timeout: 30000 });
  await expect(femalePage).toHaveURL(/\/chat\//, { timeout: 30000 });

  // 채팅방 진입 후 입력창 활성화 대기
  await expect(malePage.locator('input[type="text"]')).toBeEnabled({ timeout: 10000 });
  await expect(femalePage.locator('input[type="text"]')).toBeEnabled({ timeout: 10000 });

  // 여자 유저가 채팅방 나가기
  await femalePage.click('button:has-text("Leave Chat")');
  await expect(femalePage.locator('text=Leave Chat?')).toBeVisible({ timeout: 10000 });
  await femalePage.locator('button:has-text("Leave")').nth(1).click();
  await expect(femalePage).toHaveURL('http://localhost:5173/');
}); 