import asyncio, sys
from playwright.async_api import async_playwright
OUT = sys.argv[1]
URL = "http://localhost:4173/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True,
            locale="th-TH", geolocation={"latitude":16.7457,"longitude":100.1925,"accuracy":15}, permissions=["geolocation"], color_scheme="light")
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        async def shot(n, wait=900):
            await pg.wait_for_timeout(wait); await pg.screenshot(path=f"{OUT}/{n}.png"); print("shot", n)
        await pg.goto(URL); await shot("01-welcome", 1600)
        await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(400)
        await pg.fill("#name", "ภูมิพัฒน์ แก้วประเสริฐ"); await pg.fill("#sid", "66310452")
        await shot("02-profile", 300)
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(400)
        for d in "123456": await pg.get_by_role("button", name=d, exact=True).click()
        await pg.wait_for_timeout(500)
        for d in "123456": await pg.get_by_role("button", name=d, exact=True).click()
        await shot("03-home", 1800)
        await pg.mouse.wheel(0, 700); await shot("04-home-scroll", 900)
        await pg.goto(URL + "#/a/a-river"); await shot("05-detail", 1400)
        await pg.evaluate("document.querySelector('.layer .page').scrollTo(0, 700)"); await shot("06-detail-scroll", 700)
        await pg.evaluate("document.querySelector('.layer .page').scrollTo(0, 1500)"); await shot("07-detail-ann", 700)
        await pg.goto(URL + "#/a/a-tree"); await pg.wait_for_timeout(1000)
        await pg.get_by_role("button", name="ลงทะเบียน", exact=True).click(); await shot("08-register-sheet", 800)
        await pg.get_by_role("button", name="ยืนยันลงทะเบียน").click(); await shot("09-registered", 1600)
        await pg.goto(URL + "#/scan"); await shot("10-scan", 2500)
        btn = pg.get_by_role("button", name="สแกนจำลอง")
        if await btn.count(): 
            await btn.click(); await shot("11-claim-ticket", 2600)
        await pg.goto(URL + "#/mine"); await shot("12-mine", 1200)
        await pg.goto(URL + "#/inbox"); await shot("13-inbox", 1200)
        await pg.goto(URL + "#/me"); await shot("14-me", 1500)
        await pg.goto(URL + "#/a/a-river/chat"); await shot("15-chat", 1200)
        await pg.goto(URL + "#/sup/login"); await pg.wait_for_timeout(600)
        await pg.get_by_text("NUVOL26").click(); await shot("16-sup-login", 400)
        await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await shot("17-sup-home", 1400)
        await pg.goto(URL + "#/sup/a/a-blood"); await shot("18-manage", 1400)
        await pg.goto(URL + "#/sup/a/a-blood/qr"); await shot("19-presenter", 5000)
        await pg.goto(URL + "#/sup/new"); await shot("20-editor", 1200)
        print("\n".join(errs[:30]) or "no console errors")
        await b.close()
asyncio.run(main())
