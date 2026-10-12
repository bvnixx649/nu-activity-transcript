import asyncio, sys
from playwright.async_api import async_playwright
OUT=sys.argv[1]; URL="http://localhost:4173/"
async def run(b, scheme, tag):
    ctx = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="th-TH", color_scheme=scheme, geolocation={"latitude":16.7457,"longitude":100.1925,"accuracy":12}, permissions=["geolocation"])
    pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f"{OUT}/c-{tag}-welcome.png")
    await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(300)
    await pg.fill("#name","ปวีณ์ธิดา จันทร์เพ็ญ"); await pg.fill("#sid","66312287")
    await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(300)
    for _ in range(2):
        for d in "112233": await pg.get_by_role("button", name=d, exact=True).click()
        await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(1800); await pg.screenshot(path=f"{OUT}/c-{tag}-home.png")
    await pg.goto(URL+"#/me"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{OUT}/c-{tag}-me.png")
    await pg.goto(URL+"#/a/a-blood"); await pg.wait_for_timeout(1400); await pg.screenshot(path=f"{OUT}/c-{tag}-detail.png")
    if tag=="dark":
        await pg.goto(URL+"#/sup/login"); await pg.wait_for_timeout(500); await pg.get_by_text("NUVOL26").click()
        await pg.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await pg.wait_for_timeout(600)
        await pg.goto(URL+"#/sup/a/a-blood/qr"); await pg.wait_for_timeout(2500); await pg.screenshot(path=f"{OUT}/c-{tag}-qr.png")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        await run(b,"light","light"); await run(b,"dark","dark"); await b.close()
asyncio.run(main())
