"""Student credits, cancellation deadline, scheduled registration and calendar view at phone size.

Usage: python scripts/e2e/credits.py <out_dir>   (needs `npx vite preview` on :4173)
"""
import asyncio, sys
from playwright.async_api import async_playwright

OUT = sys.argv[1]
URL = "http://localhost:4173/"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  locale="th-TH", color_scheme="light")
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))

        async def shot(n, wait=900):
            await pg.wait_for_timeout(wait)
            over = await pg.evaluate("document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.page')].some(e => e.scrollWidth > e.clientWidth + 1)")
            await pg.screenshot(path=f"{OUT}/{n}.png")
            print("shot", n, "OVERFLOW" if over else "")

        async def scroll(y):
            await pg.evaluate(f"[...document.querySelectorAll('.page')].pop().scrollTo(0, {y})")

        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(400)
        await pg.fill("#name", "ภูมิพัฒน์ แก้วประเสริฐ"); await pg.fill("#sid", "66310452")
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(400)
        for _ in range(2):
            for d in "123456": await pg.get_by_role("button", name=d, exact=True).click()
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1500)

        # calendar view
        await scroll(500)
        await pg.get_by_role("button", name="ดูเป็นปฏิทิน").click(); await shot("01-calendar", 900)
        await scroll(1100); await shot("02-calendar-day", 600)
        await pg.get_by_role("button", name="ดูเป็นรายการ").click()

        # scheduled registration
        await pg.goto(URL + "#/a/a-open"); await shot("03-scheduled", 1400)
        await pg.get_by_role("button", name="เตือนฉัน").click(); await shot("04-remind-on", 900)

        # late cancel (a-wai starts tomorrow, free-cancel window is 2 days)
        await pg.goto(URL + "#/a/a-wai"); await pg.wait_for_timeout(1200)
        await pg.get_by_role("button", name="ลงทะเบียนแล้ว").click(); await shot("05-late-cancel-sheet", 900)
        await pg.get_by_role("button", name="ยกเลิกและเสียเครดิต").click(); await shot("06-late-cancelled", 900)

        # register with one credit left
        await pg.goto(URL + "#/a/a-paint"); await pg.wait_for_timeout(1200)
        await pg.get_by_role("button", name="ลงทะเบียน", exact=True).click(); await shot("07-register-1-left", 900)
        await pg.get_by_role("button", name="ยืนยันลงทะเบียน").click(); await pg.wait_for_timeout(1500)

        await pg.goto(URL + "#/me"); await pg.wait_for_timeout(1200)
        await scroll(900); await shot("08-profile-credits", 900)

        # supervisor sees the no-show and the late cancel, gives a credit back
        await pg.goto(URL + "#/sup/login"); await pg.wait_for_timeout(800)
        await pg.fill("#sname", "พีรพัฒน์ มณีวงศ์")
        await pg.get_by_text("SCI2569").click()
        await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await pg.wait_for_timeout(1200)
        await pg.goto(URL + "#/sup/a/a-wai"); await pg.wait_for_timeout(1400)
        await scroll(4000); await shot("09-sup-late-list", 900)
        await pg.get_by_role("button", name="คืนเครดิต").first.click(); await shot("10-waived", 900)

        await pg.goto(URL + "#/me"); await pg.wait_for_timeout(1200)
        await scroll(900); await shot("11-profile-after-waive", 900)
        print("\n".join(errs[:30]) or "no console errors")
        await b.close()

asyncio.run(main())
