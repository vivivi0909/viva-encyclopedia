import {test,expect} from '@playwright/test';

test('source-backed plant and animal details show the added facts and their references',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');
 await page.getByRole('searchbox',{name:'도감 검색'}).fill('Monstera deliciosa');await page.locator('.card-title').click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('토양·배지 성질');await expect(dialog).toContainText('유기물이 풍부한 토양');await expect(dialog).toContainText('고양이 위해성 기록');
 await expect(dialog.getByRole('heading',{name:'추가 확인 자료'})).toBeAttached();await expect(dialog.locator('a[href="https://plants.ces.ncsu.edu/plants/monstera-deliciosa/"]').last()).toBeAttached();
 await page.keyboard.press('Escape');await page.getByRole('searchbox',{name:'도감 검색'}).fill('Eublepharis macularius');await page.locator('.card-title').click();
 await expect(dialog).toContainText('곤충 중심 식단');await expect(dialog).toContainText('표토, 모래, 점토');await expect(dialog).toContainText('원산지 · 자연 생태 기록');await expect(dialog).toContainText('수컷끼리');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('aquatic care identifies water temperature and retains missing air humidity and cage data',async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('searchbox',{name:'도감 검색'}).fill('Ambystoma mexicanum');
 await expect(page.locator('.card-metrics')).toContainText('수온 16–18');await page.locator('.card-title').click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('수온 · 원문 적정 구간');await expect(dialog).toContainText('장폐색 위험');await expect(dialog).toContainText('Axolotl.org');
 await expect(dialog.locator('dt').filter({hasText:'최소 사육장'}).locator('..')).toContainText('추가 확인 필요');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/${testInfo.project.name}-enriched-axolotl.png`});
});

test('new care notes are shown first and unconfirmed fields stay available in a labeled disclosure',async({page})=>{
 await page.goto('/');await page.getByRole('searchbox',{name:'도감 검색'}).fill('Alocasia baginda');await expect(page.locator('.card-metrics')).toContainText('습도 선호');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('searchbox',{name:'도감 검색'}).fill('Gekko vittatus');await page.locator('.card-title').click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('CGD를 가끔 제공하는 간식');await expect(dialog).toContainText('65–75%');await expect(dialog).toContainText('공개 가이드 사육장 예시');
 const pending=dialog.locator('.pending-details');await expect(pending).toHaveJSProperty('open',false);await expect(pending.locator('summary')).toContainText('아직 확인할 정보');
 await pending.locator('summary').click();await expect(pending).toHaveJSProperty('open',true);await expect(pending).toContainText('확인된 종별 자료 없음');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});
