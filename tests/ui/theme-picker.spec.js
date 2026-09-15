import {test,expect} from '@playwright/test';
test('Theme persists and patient picker supports search, keyboard and saving',async({page},testInfo)=>{
 await page.goto('/#kirish');await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
 await expect(page.getByRole('heading',{name:'Assalomu alaykum, Aziza.'})).toBeVisible();
 await page.getByRole('button',{name:'Och mavzuga o‘tish'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.reload();await expect(page.getByRole('button',{name:'To‘q mavzuga o‘tish'})).toBeVisible();
 await page.getByRole('button',{name:'Qabul belgilash',exact:true}).click();await page.getByRole('button',{name:'Bemor *',exact:true}).click();
 const search=page.getByRole('combobox',{name:'Ro‘yxatdan bemor qidirish'});await search.fill('topilmaydigan ism');await expect(page.getByText('Bemor topilmadi. Boshqa ism yozib ko‘ring.')).toBeVisible();await search.fill('Ali Valiyev');await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);await search.press('Enter');await expect(page.getByRole('button',{name:'Bemor *',exact:true})).toHaveText('Ali Valiyev');
 await page.getByRole('button',{name:'Bemor *',exact:true}).click();await search.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();await expect(search).not.toBeVisible();
 await page.getByLabel('Sana *',{exact:true}).fill('2026-11-25');await page.getByLabel('Vaqt (Toshkent)').fill('15:30');await page.getByRole('button',{name:'Saqlash',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.screenshot({path:`artifacts/${testInfo.project.name}-light.png`,fullPage:true});
 await page.getByRole('button',{name:'To‘q mavzuga o‘tish'}).click();await page.getByRole('button',{name:'Qabul belgilash',exact:true}).click();await page.getByRole('button',{name:'Bemor *',exact:true}).click();await page.screenshot({path:`artifacts/${testInfo.project.name}-picker.png`,fullPage:true});
 await page.getByRole('option',{name:/Sofiya Akbarova/}).click();await expect(page.getByRole('button',{name:'Bemor *',exact:true})).toHaveText('Sofiya Akbarova');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
