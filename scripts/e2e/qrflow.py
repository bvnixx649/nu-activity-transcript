import asyncio, sys
from playwright.async_api import async_playwright
OUT = sys.argv[1]; URL = "http://localhost:4173/"
NU = {"latitude":16.7457,"longitude":100.1925,"accuracy":12}
async def onboard(pg, name, sid):
    await pg.goto(URL); await pg.wait_for_timeout(900)
    await pg.get_by_text("เริ่มใช้งาน").click(); await pg.wait_for_timeout(300)
    await pg.fill("#name", name); await pg.fill("#sid", sid)
    await pg.get_by_role("button", name="ถัดไป").click(); await pg.wait_for_timeout(300)
    for _ in range(2):
        for d in "135790": await pg.get_by_role("button", name=d, exact=True).click()
        await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(800)
async def scan_image(pg, path, label):
    await pg.goto(URL + "#/scan"); await pg.wait_for_timeout(1500)
    await pg.set_input_files("input[type=file]", path)
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path=f"{OUT}/q-{label}.png")
    txt = await pg.inner_text(".layer")
    print(label, "=>", " | ".join(t for t in txt.split("\n") if t.strip())[:220])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        sup = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, locale="th-TH", geolocation=NU, permissions=["geolocation"])
        sp = await sup.new_page(); await sp.goto(URL + "#/sup/login"); await sp.wait_for_timeout(800)
        await sp.fill("#sname", "ณัฐธิดา ศรีสุข"); await sp.get_by_text("NUVOL26").click()
        await sp.get_by_role("button", name="เข้าสู่โหมดผู้คุม").click(); await sp.wait_for_timeout(800)
        await sp.goto(URL + "#/sup/a/a-blood/qr"); await sp.wait_for_timeout(3000)
        await sp.locator(".qr-box").screenshot(path=f"{OUT}/qr.png")
        print("captured qr")
        cases = [("near", {"latitude":16.7460,"longitude":100.1927,"accuracy":20}, "66310001"),
                 ("far", {"latitude":16.7600,"longitude":100.2000,"accuracy":20}, "66310002")]
        for label, geo, sid in cases:
            ctx = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="th-TH", geolocation=geo, permissions=["geolocation"])
            pg = await ctx.new_page(); await onboard(pg, "ทดสอบ สแกนจริง", sid)
            await scan_image(pg, f"{OUT}/qr.png", label)
            if label == "near":
                await scan_image(pg, f"{OUT}/qr.png", "dup")
        # expired: new student scans an old capture
        await sp.wait_for_timeout(1000)
        ctx = await b.new_context(viewport={"width":390,"height":844}, locale="th-TH", geolocation=NU, permissions=["geolocation"])
        pg = await ctx.new_page(); await onboard(pg, "ทดสอบ หมดอายุ", "66310003")
        print("waiting 42s for expiry"); await pg.wait_for_timeout(42000)
        await scan_image(pg, f"{OUT}/qr.png", "expired")
        await b.close()
asyncio.run(main())
