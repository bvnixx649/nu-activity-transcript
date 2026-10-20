"""Supervisor flow at phone size: home (todo, calendar, stats), stage bar, close and send roster, 4-step editor.

Usage: python scripts/e2e/sup.py <out_dir>   (needs `npx vite preview` on :4173)
"""
import asyncio, sys
from playwright.async_api import async_playwright

OUT = sys.argv[1]
URL = "http://localhost:4173/"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  locale="th-TH", geolocation={"latitude": 16.7457, "longitude": 100.1925, "accuracy": 15},
                                  permissions=["geolocation"], color_scheme="light")
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))

        async def shot(n, wait=900):
            await pg.wait_for_timeout(wait)
            over = await pg.evaluate("document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.page')].some(e => e.scrollWidth > e.clientWidth + 1)")
            await pg.screenshot(path=f"{OUT}/{n}.png")
            print("shot", n, "OVERFLOW" if over else "")

        async def scroll(y):
            await pg.evaluate(f"document.querySelector('.layer:last-child .page, .page').scrollTo(0, {y})")

        await pg.goto(URL + "#/sup/login"); await pg.wait_for_timeout(800)
        await pg.fill("#sname", "ภูมิพัฒน์ แก้วประเสริฐ")
        await pg.get_by_text("NUVOL26").click()
        await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click()
        await shot("01-home", 1600)
        for i, y in enumerate([600, 1200, 1800, 2400, 3000]):
            await scroll(y); await shot(f"02-home-{i}", 600)
        # tap a calendar day with an activity
        await scroll(0)

        await pg.goto(URL + "#/sup/a/p-milk"); await shot("03-closing", 1400)
        await pg.get_by_role("button", name="ปิดรายชื่อ").last.click(); await shot("04-close-sheet", 800)
        await pg.get_by_role("button", name="ปิดรายชื่อ").last.click(); await shot("05-closed", 1200)

        await pg.goto(URL + "#/sup/a/p-bottle"); await shot("06-submit", 1400)
        await pg.get_by_role("button", name="ส่งรายชื่อ").first.click(); await shot("07-submit-sheet", 800)
        await pg.get_by_role("button", name="ส่งรายชื่อ", exact=True).click(); await shot("08-submitted", 1200)

        await pg.goto(URL + "#/sup/a/a-blood"); await shot("09-live", 1400)
        await pg.goto(URL + "#/sup/a/a-open"); await shot("10-scheduled", 1400)
        await pg.goto(URL + "#/sup/a/p-orient"); await shot("11-done", 1400)

        await pg.goto(URL + "#/sup/new"); await shot("12-step1", 1200)
        await pg.fill("#t", "ทดสอบเก็บขยะรอบมหาวิทยาลัย")
        await pg.get_by_role("button", name="ใช้รูปตัวอย่าง").first.click()
        await pg.get_by_role("button", name="ถัดไป").click(); await shot("13-step2", 700)
        await pg.fill("#pl", "ลานหน้าหอสมุด")
        await pg.get_by_role("button", name="ถัดไป").click(); await shot("14-step3", 700)
        await pg.get_by_role("radio", name="9").click()
        await pg.get_by_role("switch").first.click() if await pg.get_by_role("switch").count() else None
        await shot("15-step3-scheduled", 600)
        await pg.get_by_role("button", name="ถัดไป").click(); await shot("16-step4", 700)
        await pg.fill("#ph", "081-234-5678")
        await pg.get_by_role("button", name="ดูตัวอย่าง").click(); await shot("17-preview", 900)
        await scroll(600); await shot("18-preview-scroll", 500)
        await pg.get_by_role("button", name="เผยแพร่กิจกรรม").click(); await shot("19-published", 1400)

        await pg.goto(URL + "#/sup"); await shot("20-home-after", 1400)
        print("\n".join(errs[:30]) or "no console errors")
        await b.close()

asyncio.run(main())
