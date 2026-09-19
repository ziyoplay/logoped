import {test,expect} from '@playwright/test';
test('Logoped reads a Telegram question and sends an answer from dashboard',async({page},info)=>{
 const rows=[{id:'question-fixture',patient_name:'Ali Valiyev',body:'Uy mashqini necha daqiqa bajaramiz?',answer:'',state:'new',created_at:Date.now()}];let submitted='';
 await page.route('**/api/telegram/questions',route=>route.fulfill({json:rows}));
 await page.route('**/api/telegram/questions/question-fixture/reply',async route=>{submitted=route.request().postDataJSON().answer;rows[0]={...rows[0],answer:submitted,state:'pending'};await route.fulfill({json:{ok:true}});});
 await page.goto('/#kirish');await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
 const inbox=page.locator('.telegram-inbox');await expect(inbox.getByRole('heading',{name:'Telegram murojaatlari'})).toBeVisible();
 await expect(inbox).toContainText(rows[0].body);await expect(inbox).toContainText('1 ta yangi');
 await inbox.getByLabel('Ali Valiyev uchun javob').fill('Har kuni 10 daqiqa mashq qiling.');
 await inbox.scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/'+info.project.name+'-telegram-inbox.png',fullPage:false});
 await inbox.getByRole('button',{name:'Javobni Telegramga yuborish'}).click();
 await expect(inbox).toContainText('Yuborish navbatida');await expect(inbox).toContainText('0 ta yangi');expect(submitted).toBe('Har kuni 10 daqiqa mashq qiling.');
 await expect(inbox.getByRole('textbox')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
