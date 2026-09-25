import {test,expect} from '@playwright/test';
test('Public home introduces services and client account opens a private portal',async({page,browser},testInfo)=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Kichik tovushlar. Katta suhbatlar.'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Email manzil'})).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 const letters=page.locator('.letter-bubble');
 await expect(page.locator('.public-site')).toHaveAttribute('data-floating','true');
 for(const letter of await letters.all()){
  await expect(letter).toHaveCSS('animation-play-state','running');
  const position=await letter.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>letter.evaluate(el=>getComputedStyle(el).transform)).not.toBe(position);
 }
 const inquiry=page.getByRole('link',{name:'Qabul haqida yozish'});
 await expect(inquiry).toHaveAttribute('href','https://t.me/iroda_logped');
 const inquiryContrast=()=>inquiry.evaluate(el=>{
  const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const style=getComputedStyle(el),a=luminance(style.color),b=luminance(style.backgroundColor);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });
 expect(await inquiryContrast()).toBeGreaterThanOrEqual(4.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/${testInfo.project.name}-public-home.png`,fullPage:true});
 await page.getByRole('button',{name:'Och mavzuga o‘tish'}).click();
 expect(await inquiryContrast()).toBeGreaterThanOrEqual(4.5);
 await page.screenshot({path:`artifacts/${testInfo.project.name}-public-home-light.png`,fullPage:true});
 for(const letter of await letters.all())await expect(letter).toHaveCSS('animation-play-state','running');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const letter of await letters.all())await expect(letter).toHaveCSS('animation-name','none');
 await page.getByRole('link',{name:'Kabinetga kirish',exact:true}).click();
 const suffix=Date.now()+'-'+testInfo.project.name;
 // Each test owns a new staff account in the disposable test database.
 const staff=await page.request.post('/api/auth/register',{headers:{'X-Requested-With':'Nutq'},data:{name:'Portal Logoped',email:`staff-${suffix}@example.test`,password:'PortalStaff12345'}});expect(staff.status()).toBe(200);
 const patient=await page.request.post('/api/patients',{headers:{'X-Requested-With':'Nutq'},data:{name:'Portal Bemor',birth_date:'2020-01-01',guardian:'Portal Otaona',notes:'PRIVATE UI note'}});expect(patient.status()).toBe(201);
 const exercise=await page.request.post('/api/exercises',{headers:{'X-Requested-With':'Nutq'},data:{title:'Portal Mashq',category:'Talaffuz',duration:10,instructions:'Klient uchun tartib'}});expect(exercise.status()).toBe(201);
 await page.reload();await expect(page.getByRole('heading',{name:'Assalomu alaykum, Portal.'})).toBeVisible();
 if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Menyuni ochish'}).click();
 await page.locator('nav').getByRole('button',{name:/Bemorlar/}).click();await page.getByRole('button',{name:/Portal Bemor/}).first().click();
 await page.getByLabel('Klient emaili',{exact:true}).fill(`client-${suffix}@example.test`);
 await page.getByLabel('Klient paroli',{exact:true}).fill('PortalClient12345');await page.getByRole('button',{name:'Klient akkaunti yaratish',exact:true}).click();
 await expect(page.getByText('Akkaunt faol',{exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Klient uchun mashq',exact:true}).selectOption((await exercise.json()).id);await page.getByLabel('Klientga ko‘rsatma').fill('Logoped yozgan ko‘rsatma');await page.getByRole('button',{name:'Mashqni biriktirish',exact:true}).click();
 await expect(page.locator('.access-item')).toContainText('Portal Mashq');
 const ctx=await browser.newContext({viewport:page.viewportSize()});const clientPage=await ctx.newPage();
 try{await clientPage.goto(new URL('/#kirish',page.url()).href);await clientPage.getByLabel('Email manzil',{exact:true}).fill(`client-${suffix}@example.test`);await clientPage.getByLabel('Parol',{exact:true}).fill('PortalClient12345');await clientPage.getByRole('button',{name:'Hisobga kirish',exact:true}).click();
 await expect(clientPage.getByRole('heading',{name:'Mening mashqlarim'})).toBeVisible();await expect(clientPage.getByText('Portal Mashq',{exact:true})).toBeVisible();await expect(clientPage.getByText('Logoped yozgan ko‘rsatma')).toBeVisible();await expect(clientPage.getByText('PRIVATE UI note')).toHaveCount(0);await expect(clientPage.getByRole('button',{name:'Bemor qo‘shish'})).toHaveCount(0);
 expect((await clientPage.request.get('/api/patients')).status()).toBe(403);
 await clientPage.reload();await expect(clientPage.getByText('Portal Mashq',{exact:true})).toBeVisible();expect(await clientPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await clientPage.screenshot({path:`artifacts/${testInfo.project.name}-client-portal.png`,fullPage:true});
 await page.getByRole('button',{name:'Kirishni yopish',exact:true}).click();await expect(page.getByText('Kirish yopilgan',{exact:true})).toBeVisible();await clientPage.reload();await expect(clientPage.getByRole('button',{name:'Hisobga kirish',exact:true})).toBeVisible();
 }finally{await ctx.close();}
});
