import {test,expect} from '@playwright/test';
test('Personal workspace shows backup status without team or therapist controls',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Hisob yarating',exact:true}).click();await expect(page.getByLabel('Markaz taklif kodi (xodim uchun)')).toHaveCount(0);await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
 await page.getByRole('button',{name:'Qabul belgilash',exact:true}).click();await expect(page.getByLabel('Mas’ul logoped')).toHaveCount(0);await page.getByRole('button',{name:'Oynani yopish'}).click();await page.getByRole('button',{name:'Profil sozlamalarini ochish'}).click();
 await expect(page.getByRole('heading',{name:'Zaxira nusxa',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Markaz jamoasi'})).toHaveCount(0);await expect(page.getByRole('link',{name:'JSON yuklab olish'})).toBeVisible();
 const response=await page.request.get('/api/team');expect(response.status()).toBe(404);
});
