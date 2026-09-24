import {test,expect} from '@playwright/test';

test('Short viewport sidebar scrolls to profile and keeps navigation usable',async({page},info)=>{
  await page.setViewportSize({width:info.project.name==='mobile'?393:1280,height:480});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#kirish');
  await page.getByRole('button',{name:'Namuna bilan ko‘rish'}).click();
  await expect(page.getByRole('heading',{name:'Assalomu alaykum, Aziza.'})).toBeVisible();
  const sidebar=page.getByRole('complementary',{name:'Ish maydoni menyusi'});
  async function openMenu(){if(info.project.name==='mobile')await page.getByRole('button',{name:'Menyuni ochish'}).click();}
  for(const theme of ['dark','light']){
    if(theme==='light')await page.getByRole('button',{name:'Och mavzuga o‘tish'}).click();
    await openMenu();
    expect(await sidebar.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    await sidebar.hover();
    const pageScroll=await page.evaluate(()=>window.scrollY);
    await page.mouse.wheel(0,1600);
    await expect.poll(()=>sidebar.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    const logout=sidebar.getByRole('button',{name:'Hisobdan chiqish'});
    await expect(logout).toBeInViewport();
    expect(await page.evaluate(()=>window.scrollY)).toBe(pageScroll);
    await page.screenshot({path:`artifacts/${info.project.name}-sidebar-${theme}.png`});
    await sidebar.getByRole('button',{name:'Sozlamalar',exact:true}).click();
    await expect(page.locator('.workspace-page')).toHaveCSS('animation-name','workspace-arrive');
    await openMenu();await sidebar.press('Home');
    await expect(sidebar.getByText('ISH MAYDONI',{exact:true})).toBeInViewport();
    await sidebar.getByRole('button',{name:'Bemorlar',exact:false}).click();
    await expect(page.getByRole('heading',{name:'Bemorlar',exact:true})).toBeVisible();
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await openMenu();await sidebar.getByRole('button',{name:'Umumiy ko‘rinish',exact:true}).click();
  await expect(page.locator('.workspace-page')).toHaveCSS('animation-name','none');
});
