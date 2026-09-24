import {test,expect} from '@playwright/test';
test('Calendar slots, mobile layout and sourced exercise import',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#kirish');await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
 async function nav(name){if(info.project.name==='mobile')await page.getByRole('button',{name:'Menyuni ochish'}).click();await page.locator('nav').getByRole('button',{name,exact:true}).click();}
 await nav('Qabul jadvali');await expect(page.getByLabel('Taqvim ko‘rinishi')).toHaveValue(info.project.name==='mobile'?'day':'week');
 await expect(page.getByText('Ulash uchun serverda Google OAuth sozlamalari kerak')).toBeVisible();
 await page.getByLabel('Qabul sanasi').fill('2099-10-01');
 await page.getByRole('button',{name:'1 oktabr 09:00 qabul belgilash',exact:true}).click();
 await expect(page.getByLabel('Sana *',{exact:true})).toHaveValue('2099-10-01');await expect(page.getByLabel('Vaqt (Toshkent)')).toHaveValue('09:00');
 await page.getByRole('button',{name:'Bemor *',exact:true}).click();await page.getByRole('option',{name:/Ali Valiyev/}).click();
 await page.getByRole('button',{name:'Saqlash',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.calendar-event')).toContainText('Ali Valiyev');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'artifacts/'+info.project.name+'-calendar-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Och mavzuga o‘tish'}).click();await page.screenshot({path:'artifacts/'+info.project.name+'-calendar-light.png',fullPage:true});
 await page.locator('.calendar-event').click();await page.getByLabel('Vaqt (Toshkent)').fill('10:00');await page.getByRole('button',{name:'Saqlash',exact:true}).click();
 await expect(page.locator('.calendar-event')).toContainText('10:00');
 const notices=await (await page.request.get('/api/google/status')).json();expect(notices.notifications).toHaveLength(1);expect(notices.notifications[0].payload.time).toBe('10:00');
 await nav('Mashqlar kutubxonasi');await expect(page.locator('.catalog-section .exercise-card')).toHaveCount(8);
 const card=page.locator('.catalog-section .exercise-card').filter({hasText:'So‘zlarni qarsak bilan bo‘lish'});
 await expect(card.getByRole('link')).toHaveAttribute('href',/justonenorfolk.nhs.uk/);
 await card.getByRole('button',{name:'Qo‘shish',exact:true}).click();await expect(card.getByRole('button',{name:'Qo‘shilgan'})).toBeDisabled();
 const rows=await (await page.request.get('/api/exercises')).json();expect(rows.filter(e=>e.title==='So‘zlarni qarsak bilan bo‘lish')).toHaveLength(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/'+info.project.name+'-catalog.png',fullPage:true});
 expect(errors).toEqual([]);
});
