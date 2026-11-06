import {test,expect} from '@playwright/test';

test('vivarium moisture types can be browsed, filtered, read and saved without implying numeric suitability',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('[data-category="vivarium"]').click();
 await expect(page.locator('#result-count strong')).toHaveText('7');
 await expect(page.getByRole('region',{name:'비바리움 유형 안내'})).toContainText('서로 조합');
 for(const name of ['습계 비바리움','반습계 비바리움','반건조 비바리움','온대 비바리움','열대 비바리움','건조 비바리움','팔루다리움'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await page.getByLabel('세부 분류',{exact:true}).selectOption('습계');
 await expect(page.locator('.entry-card')).toHaveCount(1);await expect(page.locator('.card-metrics')).toContainText('대상 생물별 설정');
 await expect(page.locator('.card-photo')).toContainText('환경 구성 가이드');await expect(page.locator('.card-photo')).not.toContainText('사진 확인 중');
 await page.getByRole('button',{name:'습계 비바리움',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('공기 습도·배지 수분·수온');await expect(dialog).toContainText('배수 · 바닥재');await expect(dialog).toContainText('환기');await expect(dialog).toContainText('식재 계획');await expect(dialog).toContainText('참고 자료');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:`test-results/${testInfo.project.name}-vivarium-humid.png`});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'습계 비바리움 즐겨찾기'}).click();await expect(page.getByRole('button',{name:'습계 비바리움 즐겨찾기'})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('세부 분류',{exact:true}).selectOption('all');await page.getByRole('searchbox',{name:'도감 검색'}).fill('semi-humid vivarium');
 await expect(page.locator('.entry-card')).toHaveCount(1);await expect(page.locator('.card-title')).toContainText('반습계');
 await page.locator('.card-compare').click();await expect(page.getByRole('dialog')).toContainText('자료가 부족해 적합성을 판단할 수 없어요');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
