import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for w,h,tag in [(390,844,'phone'),(820,1180,'ipad')]:
            ctx = await b.new_context(viewport={"width":w,"height":h}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="th-TH")
            pg = await ctx.new_page(); errs=[]
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("requestfailed", lambda r: errs.append("FAIL "+r.url))
            await pg.goto("https://bvnixx649.github.io/nu-activity-transcript/", wait_until="networkidle"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f"{sys.argv[1]}/live-{tag}.png")
            sw = await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)")
            ov = await pg.evaluate("document.documentElement.scrollWidth > innerWidth")
            print(tag, "sw:", sw, "overflow:", ov, "errors:", errs[:5])
        await b.close()
asyncio.run(main())
