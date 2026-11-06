import { expect, test } from '@playwright/test';
for (const width of [375, 768, 1280, 1920]) test(`decorative icon motion is scoped and stable at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.addStyleTag({ content: '[style*="opacity"]{opacity:1!important}[style*="transform"]:not([data-moving]){transform:none!important}' });
  const officeCount=width>=1024?4:width>=640?2:1;
  const icons=page.locator('.icon-float:not([inert] *)');
  await expect(icons).toHaveCount(officeCount+4);
  await expect(page.locator('#offices .icon-float:not([inert] *)')).toHaveCount(officeCount);
  await expect(page.locator('#transparency .icon-float')).toHaveCount(4);
  await expect(page.locator('#home .icon-float, header .icon-float, footer .icon-float, button .icon-float, nav .icon-float, input .icon-float')).toHaveCount(0);
  expect(await icons.evaluateAll(els=>els.every(el=>el.getAttribute('aria-hidden')==='true'))).toBe(true);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveCSS('animation-name','none');
    await expect(icon).toHaveCSS('transform','none');
    await expect(icon).toHaveCSS('will-change','auto');
  }
  const geometry=()=>page.locator('#offices [aria-roledescription="slide"]:not([inert]) [data-office-card], #transparency').evaluateAll(sections=>sections.map(section=>[section,...section.querySelectorAll('*:not(svg):not(svg *)')].map(el=>{
    const r=el.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y};
  })));
  // Keep autoplay paused while measuring the independent decorative animation.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Pause slideshow'}).click();
  await page.mouse.move(0,0);
  await page.getByRole('button',{name:'Play slideshow'}).blur();
  await page.emulateMedia({reducedMotion:'reduce'});
  const before=await geometry();
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await expect(icons.first()).toHaveCSS('animation-name','talweb-icon-float');
  const timing=await icons.evaluateAll(els=>els.map(el=>{
    const s=getComputedStyle(el);return {duration:s.animationDuration,delay:s.animationDelay,direction:s.animationDirection,easing:s.animationTimingFunction,willChange:s.willChange};
  }));
  for (let i=0;i<officeCount+4;i++) {
    expect(timing[i]).toEqual({duration:'4.2s',delay:['0s','0.6s','1.2s','1.8s'][(i<officeCount?i:i-officeCount)%4],direction:'alternate',easing:'ease-in-out',willChange:'transform'});
  }
  await icons.evaluateAll(els=>els.forEach(el=>el.getAnimations().forEach(animation=>{
    animation.pause(); animation.currentTime=Number(animation.effect!.getTiming().delay)+4200;
  })));
  for(const icon of await icons.all()) await expect(icon).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -5)');
  expect(await geometry()).toEqual(before);
  expect(await icons.evaluateAll(els=>els.every(el=>{
    const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();
    return r.top>=p.top && r.bottom<=p.bottom;
  }))).toBe(true);
  const officeCard=page.locator('[aria-roledescription="slide"]:not([inert]) [data-office-card]').first();
  await officeCard.hover();
  await expect(officeCard.locator('.icon-float')).toHaveCSS('animation-play-state','paused');
  await page.mouse.move(0,0);
  await officeCard.focus();
  await expect(officeCard.locator('.icon-float')).toHaveCSS('animation-play-state','paused');
  const documentLink=page.locator('#transparency a').first();
  await documentLink.focus();
  await expect(page.locator('#transparency .icon-float').first()).toHaveCSS('animation-play-state','paused');
  await page.emulateMedia({ reducedMotion:'reduce' });
  for(const icon of await icons.all()) await expect(icon).toHaveCSS('animation-name','none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
