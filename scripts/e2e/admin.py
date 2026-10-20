"""Volunteer-centre admin: queue, stats with KPI, export, mark recorded, student sees it. Phone size plus one desktop shot.

Usage: python scripts/e2e/admin.py <out_dir>   (needs `npx vite preview` on :4173)
"""
import asyncio, sys
from playwright.async_api import async_playwright

OUT = sys.argv[1]
URL = "http://localhost:4173/"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  locale="th-TH", color_scheme="light", accept_downloads=True)
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))

        async def shot(n, wait=900, page=None):
            page = page or pg
            await page.wait_for_timeout(wait)
            over = await page.evaluate("document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.page')].some(e => e.scrollWidth > e.clientWidth + 1)")
            await page.screenshot(path=f"{OUT}/{n}.png")
            print("shot", n, "OVERFLOW" if over else "")

        async def scroll(y, page=None):
            await (page or pg).evaluate(f"[...document.querySelectorAll('.page')].pop().scrollTo(0, {y})")

        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(400)
        await pg.fill("#name", "ภูมิพัฒน์ แก้วประเสริฐ"); await pg.fill("#sid", "66310452")
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(400)
        for _ in range(2):
            for d in "123456": await pg.get_by_role("button", name=d, exact=True).click()
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1200)

        await pg.goto(URL + "#/sup/login"); await pg.wait_for_timeout(800)
        await pg.get_by_text("NUADMIN").click(); await shot("01-login", 400)
        await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await shot("02-admin-home", 1600)
        for i, y in enumerate([700, 1400, 2100, 2800, 3500]):
            await scroll(y); await shot(f"03-admin-home-{i}", 600)

        await pg.goto(URL + "#/sup/admin/a/p-dorm"); await shot("04-activity", 1400)
        async with pg.expect_download() as dl:
            await pg.get_by_role("button", name="ดาวน์โหลด Excel ไปคีย์").click()
        print("download", (await dl.value).suggested_filename)
        await pg.get_by_role("button", name="บันทึกลงระบบแล้ว").click(); await shot("05-confirm", 800)
        await pg.get_by_role("button", name="ยืนยันและแจ้งเตือนนิสิต").click(); await shot("06-recorded", 1200)

        await pg.goto(URL + "#/inbox"); await shot("07-student-inbox", 1400)
        await pg.goto(URL + "#/me"); await pg.wait_for_timeout(1000); await scroll(300); await shot("08-student-transcript", 900)

        # desktop
        dpage = await (await b.new_context(viewport={"width": 1280, "height": 860}, locale="th-TH", color_scheme="light",
                                            storage_state=await ctx.storage_state())).new_page()
        await dpage.goto(URL + "#/sup/admin"); await shot("09-desktop", 1800, dpage)
        await scroll(700, dpage); await shot("10-desktop-scroll", 700, dpage)
        print("\n".join(errs[:30]) or "no console errors")
        await b.close()

asyncio.run(main())
