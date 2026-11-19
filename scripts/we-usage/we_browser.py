# -*- coding: utf-8 -*-
"""
we_browser.py — متابعة باقات WE يوميًا من متصفح Chrome حقيقي بجلسة محفوظة

    python we_browser.py --setup NET-001   مرة واحدة: يفتح Chrome، إنت تكمّل الدخول (والكابتشا لو ظهرت)، والجلسة تتحفظ
    python we_browser.py                  التشغيل اليومي (من غير شاشة): يقرا الجيجات والتجديد لكل خط ويبعتهم
    python we_browser.py --show           نفس اليومي بس المتصفح ظاهر (للتجربة)

الفكرة: السكريبت مابيكلمش أي API بنفسه — بيفتح موقع WE زي أي مستخدم، والموقع هو اللي بيجيب
الاستهلاك، والسكريبت بيقرا الرد اللي وصل للصفحة. لو الجلسة خلصت بيحاول يدخل بالرقم والباسورد
المحفوظين في Windows Credential Manager، ولو WE طلبت كابتشا بيقف ويبعتلك تنبيه تدخل مرة (--setup).
"""
import argparse
import datetime as dt
import json
import sys
import time

import we_usage as W  # الإعدادات والباسوردات والقراءة والإرسال للشيت

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("محتاج: python -m pip install playwright")

HOME = "https://my.te.eg/echannel/#/home"
LOGIN = "https://my.te.eg/echannel/#/login"
PROFILES = W.HERE / "profiles"           # جلسة لكل خط (فيها الكوكيز بس — مش الباسورد)
STATUS = W.OUT_DIR / "status.json"       # آخر نتيجة لكل خط (السيستم والمساعد بيقروها من الشيت)


def notify(cfg, text):
    """تنبيه: Telegram لو متظبط في config.json، وكمان رسالة على الويندوز"""
    print("🔔", text)
    tok, chat = cfg.get("telegram_token"), cfg.get("telegram_chat")
    if tok and chat:
        try:
            W.requests.post("https://api.telegram.org/bot%s/sendMessage" % tok, json={"chat_id": chat, "text": text}, timeout=20)
        except Exception as e:
            print("Telegram:", e)
    try:
        import subprocess
        subprocess.run(["msg", "*", "/TIME:0", text[:250]], timeout=10, capture_output=True)
    except Exception:
        pass


def open_ctx(p, code, show, browser="chrome"):
    """Chrome (الافتراضي) أو Edge — من "browser" في config.json"""
    PROFILES.mkdir(parents=True, exist_ok=True)
    channel = {"chrome": "chrome", "edge": "msedge", "msedge": "msedge"}.get(str(browser).lower(), "chrome")
    return p.chromium.launch_persistent_context(str(PROFILES / code), channel=channel, headless=not show,
                                                locale="ar-EG", viewport={"width": 1280, "height": 860})


def capture(page):
    """بيسجّل ردود الموقع اللي فيها الاستهلاك"""
    got = {}

    def on_resp(r):
        u = r.url
        if "queryFreeUnit" in u or "FreeUnit" in u:
            try:
                got["usage"] = r.json()
            except Exception:
                pass
        elif "userAuthenticate" in u:
            try:
                got["auth"] = r.json()
            except Exception:
                pass
    page.on("response", on_resp)
    return got


def logged_in(page):
    u = page.url.lower()
    return "login" not in u and page.locator("input[type=password]").count() == 0


def captcha_shown(page):
    return page.locator("iframe[src*='recaptcha'], iframe[title*='reCAPTCHA'], [class*='captcha' i] img, input[name*='captcha' i]").count() > 0


def fill_login(page, line, password):
    """يكتب الرقم والباسورد في فورم الدخول العادي (زي ما المستخدم بيكتب)"""
    pw = page.locator("input[type=password]").first
    pw.wait_for(timeout=30000)
    user = page.locator("input:not([type=password]):not([type=hidden]):not([type=checkbox])").first
    user.fill(line["number"])
    pw.fill(password)
    # Service Type (إجباري): Internet للنت المنزلي — يتغير من config.json لكل خط ("service_type")
    want = str(line.get("service_type") or "Internet").lower()
    sel = page.locator(".ant-select").first
    if sel.count():
        sel.click()
        page.wait_for_timeout(800)
        opts = page.locator(".ant-select-item-option")
        names = [opts.nth(i).inner_text().strip() for i in range(opts.count())]
        line["_types"] = names
        hit = next((i for i, n in enumerate(names) if want in n.lower()), None)
        if hit is None:
            raise RuntimeError("نوع الخدمة '%s' مش موجود — المتاح: %s" % (want, ", ".join(names)))
        opts.nth(hit).click()
        page.wait_for_timeout(500)


def click_login(page):
    btn = page.locator("button:has-text('Login'), button:has-text('تسجيل الدخول'), button:has-text('دخول')").first
    if btn.count() and btn.is_enabled():
        btn.click()
    else:
        page.keyboard.press("Enter")


def wait_usage(page, got, seconds):
    end = time.time() + seconds
    while time.time() < end:
        if got.get("usage"):
            return got["usage"]
        page.wait_for_timeout(1000)
    return None


def read_line(p, line, show, cfg):
    ctx = open_ctx(p, line["code"], show, cfg.get("browser", "chrome"))
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    got = capture(page)
    W.OUT_DIR.mkdir(exist_ok=True)
    shot = lambda n: page.screenshot(path=str(W.OUT_DIR / ("%s-%s.png" % (line["code"], n)))) if cfg.get("debug_shots") else None
    try:
        page.goto(HOME, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(6000)
        shot("1-open")
        if not logged_in(page):
            # الجلسة خلصت: محاولة دخول واحدة بالبيانات المحفوظة — لو فيه كابتشا نقف
            if captcha_shown(page):
                raise NeedLogin("WE طالبة كابتشا")
            if "login" not in page.url.lower():
                page.goto(LOGIN, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)
            fill_login(page, line, W.get_password(line))
            shot("2-filled")
            click_login(page)
            end = time.time() + 45  # الموقع بياخد وقت يحمّل بعد الدخول
            while time.time() < end:
                page.wait_for_timeout(1500)
                a = got.get("auth")
                if a and str((a.get("header") or {}).get("retCode")) == "0":
                    page.wait_for_timeout(2500)  # "Login successful" — نروح للصفحة الرئيسية
                    break
                if a and str((a.get("header") or {}).get("retCode")) not in ("0", "None"):
                    shot("3-after-login")
                    raise NeedLogin("WE رفضت الدخول: " + str((a.get("header") or {}).get("retMsg") or (a.get("header") or {}).get("errorMsg") or (a.get("header") or {}).get("retCode")))
                if got.get("usage") or (logged_in(page) and page.locator("input").count() < 3):
                    break
            shot("3-after-login")
            auth_ok = str(((got.get("auth") or {}).get("header") or {}).get("retCode")) == "0"
            if not got.get("usage") and auth_ok:
                page.goto(HOME, wait_until="domcontentloaded", timeout=60000)
            elif not got.get("usage"):
                if captcha_shown(page) or not logged_in(page):
                    raise NeedLogin("الدخول التلقائي مانفعش" + (" (كابتشا)" if captcha_shown(page) else ""))
                if "home" not in page.url.lower():
                    page.goto(HOME, wait_until="domcontentloaded", timeout=60000)
        data = wait_usage(page, got, 45)
        shot("4-home")
        if not data:
            raise RuntimeError("الصفحة اتفتحت بس الاستهلاك ماوصلش — شغّل --show وشوف الصفحة")
        W.OUT_DIR.mkdir(exist_ok=True)
        (W.OUT_DIR / ("raw-%s.json" % line["code"])).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        return W.parse_units(data)
    finally:
        ctx.close()


class NeedLogin(Exception):
    pass


def setup(p, line, cfg):
    """مرة واحدة: Chrome ظاهر، الرقم والباسورد مكتوبين، وإنت تكمّل الدخول"""
    ctx = open_ctx(p, line["code"], True, cfg.get("browser", "chrome"))
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    got = capture(page)
    page.goto(LOGIN, wait_until="domcontentloaded", timeout=60000)
    try:
        fill_login(page, line, W.get_password(line))
        print("✍ الرقم والباسورد اتكتبوا — كمّل الدخول في نافذة Chrome (حل الكابتشا لو ظهرت واضغط دخول)")
    except Exception:
        print("✍ اكتب الرقم والباسورد في نافذة Chrome وادخل")
    end = time.time() + 300
    while time.time() < end and not got.get("usage"):
        ok = str(((got.get("auth") or {}).get("header") or {}).get("retCode")) == "0"
        if ok or (logged_in(page) and not got.get("usage")):
            page.wait_for_timeout(2500)
            page.goto(HOME, wait_until="domcontentloaded")
            wait_usage(page, got, 20)
            break
        page.wait_for_timeout(1500)
    data = got.get("usage")
    ctx.close()
    if not data:
        raise RuntimeError("الدخول ماكملش خلال 5 دقايق")
    W.OUT_DIR.mkdir(exist_ok=True)
    (W.OUT_DIR / ("raw-%s.json" % line["code"])).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return W.parse_units(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--setup", metavar="CODE", help="تسجيل الدخول مرة لخط (أو all)")
    ap.add_argument("--show", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    cfg = W.load_config()
    lines = [l for l in cfg["lines"] if not l.get("skip")]
    rows, status = [], {}
    with sync_playwright() as p:
        for line in lines:
            if a.setup and a.setup not in ("all", line["code"]):
                continue
            try:
                u = setup(p, line, cfg) if a.setup else read_line(p, line, a.show, cfg)
                rows.append({"code": line["code"], "name": line.get("name", ""), "date": dt.date.today().isoformat(), "source": "my.te.eg", **u})
                status[line["code"]] = {"ok": True, "at": dt.datetime.now().isoformat(timespec="seconds"), **u}
                print("✓ %s: متبقي %s من %s جيجا · التجديد %s" % (line["code"], u["remaining"], u["quota"], u["renewalDate"] or "؟"))
            except NeedLogin as e:
                status[line["code"]] = {"ok": False, "needLogin": True, "error": str(e)}
                notify(cfg, "WE %s (%s): %s — شغّل: python we_browser.py --setup %s" % (line["code"], line["number"], e, line["code"]))
            except Exception as e:
                status[line["code"]] = {"ok": False, "error": str(e)}
                print("✕ %s: %s" % (line["code"], e))
    W.OUT_DIR.mkdir(exist_ok=True)
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=1), encoding="utf-8")
    if rows:
        W.write_csv(rows)
        if not a.dry_run:
            W.push_to_sheet(cfg, rows)
    sys.exit(0 if rows else 1)


if __name__ == "__main__":
    main()
