import {test,expect} from '@playwright/test';
const message='Ilova serveridan ma’lumot olinmadi. Sayt ulanishini tekshirish kerak. Birozdan keyin qayta urinib ko‘ring.';
test('Bad API responses show a readable error, preserve public home and allow retry',async({page})=>{
 for(const response of [
  {status:200,contentType:'text/html',body:'<!doctype html><html>Static frontend fallback</html>'},
  {status:502,contentType:'text/html',body:'<html>Proxy error</html>'},
  {status:401,contentType:'text/html',body:'<html>Proxy login</html>'},
  {status:200,contentType:'application/json',body:'{"broken"'},
  {status:200,contentType:'application/json',body:'null'},
 ]){
  await page.goto('about:blank');
  await page.route('**/api/me',route=>route.fulfill(response));
  await page.goto('/#kirish');await expect(page.getByText(message,{exact:true})).toBeVisible();
  await expect(page.getByText(/Unexpected token|not valid JSON|SyntaxError/)).toHaveCount(0);
  await page.getByRole('link',{name:'Bosh sahifaga qaytish'}).click();
  await expect(page.getByRole('heading',{name:'Kichik tovushlar. Katta suhbatlar.'})).toBeVisible();
  await page.getByRole('link',{name:'Kabinetga kirish',exact:true}).click();
  await page.unroute('**/api/me');
  await page.getByRole('button',{name:'Qayta urinish',exact:true}).click();
  await expect(page.getByRole('button',{name:'Hisobga kirish',exact:true})).toBeVisible();
 }
});
test('HTML returned by a save endpoint is not reported as a successful save',async({page})=>{
 await page.goto('/#kirish');await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
 await page.getByRole('button',{name:'Bemor qo‘shish Yangi bemor kartasini oching'}).click();
 await page.getByLabel('Bemorning ism va familiyasi').fill('HTML response test');
 await page.getByLabel('Tug‘ilgan sana').fill('2020-01-01');await page.getByLabel('Telefon raqami').fill('+998901234567');
 await page.route('**/api/patients',route=>route.request().method()==='POST'?route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>Wrong route</html>'}):route.continue());
 await page.getByRole('button',{name:'Saqlash',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByText(message,{exact:true})).toBeVisible();
 await expect(page.getByLabel('Bemorning ism va familiyasi')).toHaveValue('HTML response test');
 await expect(page.getByText('O‘zgarishlar saqlandi',{exact:true})).toHaveCount(0);
});
