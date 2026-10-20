"""Private messages between student and supervisor, and hiding an activity from students. Phone size.

Usage: python scripts/e2e/messages.py <out_dir>   (needs `npx vite preview` on :4173)
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
            over = await pg.evaluate("document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.page, .chat-scroll')].some(e => e.scrollWidth > e.clientWidth + 1)")
            await pg.screenshot(path=f"{OUT}/{n}.png")
            print("shot", n, "OVERFLOW" if over else "")

        async def sup_login(code, name):
            await pg.goto(URL + "#/sup/login"); await pg.wait_for_timeout(800)
            await pg.fill("#sname", name)
            await pg.get_by_text(code, exact=True).click()
            await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await pg.wait_for_timeout(1200)

        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(400)
        await pg.fill("#name", "ภูมิพัฒน์ แก้วประเสริฐ"); await pg.fill("#sid", "66310452")
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(400)
        for _ in range(2):
            for d in "123456": await pg.get_by_role("button", name=d, exact=True).click()
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1200)

        # student writes to the supervisor of a-wai
        await pg.goto(URL + "#/a/a-wai/dm"); await shot("01-student-dm-empty", 1000)
        await pg.get_by_role("button", name="ไม่สบาย").click()
        await pg.keyboard.type("มีไข้ตั้งแต่เมื่อคืนครับ")
        await pg.get_by_role("button", name="ส่ง", exact=True).click(); await shot("02-student-sent", 800)

        # supervisor sees it as a to-do and replies
        await sup_login("SCI2569", "พีรพัฒน์ มณีวงศ์"); await shot("03-sup-home-todo", 600)
        await pg.get_by_text("อ่าน", exact=True).first.click(); await shot("04-sup-thread", 1000)
        await pg.fill("textarea", "รับทราบครับ หายไวๆ นะ เดี๋ยวพี่คืนเครดิตให้")
        await pg.get_by_role("button", name="ส่ง", exact=True).click(); await shot("05-sup-replied", 800)
        await pg.goto(URL + "#/sup/a/a-wai"); await pg.wait_for_timeout(1200)
        await pg.evaluate("[...document.querySelectorAll('.page')].pop().scrollTo(0, 500)"); await shot("06-manage-threads", 700)

        # student gets the reply
        await pg.goto(URL + "#/inbox"); await shot("07-student-inbox", 1200)

        # NUVOL26 has a seeded message from a no-show
        await sup_login("NUVOL26", "ภูมิพัฒน์ แก้วประเสริฐ"); await shot("08-nuvol-todo", 600)

        # hide a-tree, check student feed
        await pg.goto(URL + "#/sup/a/a-tree"); await pg.wait_for_timeout(1200)
        await pg.evaluate("[...document.querySelectorAll('.page')].pop().scrollTo(0, 400)"); await shot("09-visibility-on", 500)
        await pg.get_by_role("switch", name="แสดงให้นิสิตเห็น").click(); await shot("10-hidden", 800)
        await pg.goto(URL + "#/"); await pg.wait_for_timeout(1200)
        tree = await pg.get_by_text("ปลูกป่าต้นน้ำ").count()
        print("a-tree cards on student home after hiding:", tree)
        await pg.goto(URL + "#/a/a-tree"); await shot("11-student-hidden-detail", 1000)

        # editor visibility choice
        await pg.goto(URL + "#/sup/new"); await pg.wait_for_timeout(1000)
        await pg.fill("#t", "ทดสอบซ่อนก่อนเวลา")
        await pg.get_by_role("button", name="ใช้รูปตัวอย่าง").first.click()
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(500)
        await pg.fill("#pl", "ลานหน้าหอสมุด")
        await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(500)
        await pg.get_by_role("switch", name="ตั้งเวลาเปิดรับสมัคร").click()
        await pg.get_by_text("ซ่อนจนถึงเวลาเปิด").click(); await shot("12-editor-visibility", 700)
        print("\n".join(errs[:30]) or "no console errors")
        await b.close()

asyncio.run(main())
