# -*- coding: utf-8 -*-
"""
we_usage.py — يجيب الجيجات المتبقية وميعاد التجديد لخطوط WE (my.te.eg)
ويبعتها لنظام IT Administration عن طريق Google Sheets (تاب "الاستهلاك" و"الباقات").

التشغيل:
    python we_usage.py                 يقرا كل الخطوط من config.json ويبعت
    python we_usage.py --debug         يطبع الرد الخام من WE (لو حاجة مش ظاهرة صح)
    python we_usage.py --set-password NET-001   يحفظ باسورد الخط في Windows Credential Manager
    python we_usage.py --dry-run       يجيب البيانات ويكتب CSV بس من غير ما يبعت للشيت

ملاحظة مهمة: my.te.eg معندوش API رسمي. السكريبت بيكلم نفس العناوين اللي موقع WE نفسه
بيستخدمها، فلو WE غيّرت الموقع أو حطت كابتشا، تسجيل الدخول هيفشل — شغّل --debug وابعتلي الناتج.
"""
import argparse
import csv
import datetime as dt
import getpass
import json
import pathlib
import sys

try:
    import requests
except ImportError:
    sys.exit("محتاج تثبّت requests:  python -m pip install requests")

HERE = pathlib.Path(__file__).resolve().parent
CONFIG = HERE / "config.json"
OUT_DIR = HERE / "output"
KEYRING_SERVICE = "we-usage"

BASE = "https://my.te.eg/echannel/service/besapp/base/rest/busiservice"
LOGIN_URL = BASE + "/v1/auth/userAuthenticate"
USAGE_URL = BASE + "/cz/cbs/bb/queryFreeUnit"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "channelId": "702",
    "isCoporate": "false",
    "isMobile": "false",
    "isSelfcare": "true",
    "languageCode": "en-US",
    "Origin": "https://my.te.eg",
    "Referer": "https://my.te.eg/echannel/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}


def load_config():
    if not CONFIG.exists():
        sys.exit("مفيش config.json — انسخ config.example.json باسم config.json واكتب فيه الخطوط")
    with open(CONFIG, encoding="utf-8") as f:
        return json.load(f)


def get_password(line):
    """الباسورد: من config.json، أو (الأفضل) من Windows Credential Manager"""
    if line.get("password"):
        return line["password"]
    try:
        import keyring
        pw = keyring.get_password(KEYRING_SERVICE, line["number"])
        if pw:
            return pw
    except ImportError:
        pass
    raise RuntimeError("مفيش باسورد للخط %s — اكتبه في config.json أو شغّل: python we_usage.py --set-password %s" % (line["number"], line["code"]))


def login(session, number, password, debug=False):
    acct = number if number.upper().startswith("FBB") else "FBB" + number.lstrip("+")
    payload = {"acctId": acct, "password": password, "appLocale": "en-US", "isSelfcare": "Y", "isMobile": "N", "recaptchaToken": ""}
    r = session.post(LOGIN_URL, json=payload, headers=HEADERS, timeout=40)
    data = r.json()
    if debug:
        print("LOGIN RESPONSE:", json.dumps(data, ensure_ascii=False, indent=1)[:3000])
    body = data.get("body") or {}
    token = body.get("token") or r.headers.get("csrftoken")
    sub = (body.get("subscriber") or {}).get("subscriberId") or body.get("subscriberId")
    if not token or not sub:
        msg = (data.get("header") or {}).get("retMsg") or (data.get("header") or {}).get("responseMessage") or str(data)[:200]
        raise RuntimeError("فشل تسجيل الدخول: " + str(msg))
    return token, sub


def _date(ms):
    if not ms:
        return ""
    try:
        v = int(ms)
        if v > 10 ** 11:  # ملّي ثانية
            v = v / 1000
        return dt.datetime.fromtimestamp(v).date().isoformat()
    except (TypeError, ValueError):
        s = str(ms)
        return s[:10] if len(s) >= 10 else s


def _gb(value, unit):
    v = float(value or 0)
    u = str(unit or "").upper()
    if "MB" in u:
        return round(v / 1024, 2)
    if "KB" in u:
        return round(v / 1024 / 1024, 3)
    return round(v, 2)


def usage(session, token, sub, debug=False):
    h = dict(HEADERS, csrftoken=token)
    r = session.post(USAGE_URL, json={"subscriberId": sub, "needQueryPoint": True}, headers=h, timeout=40)
    data = r.json()
    if debug:
        print("USAGE RESPONSE:", json.dumps(data, ensure_ascii=False, indent=1)[:5000])
    return parse_units(data)


def parse_units(data):
    """يقرا رد queryFreeUnit (نفس الرد اللي صفحة WE بتجيبه)"""
    units = data.get("body") or []
    if isinstance(units, dict):
        units = units.get("freeUnitList") or units.get("list") or [units]
    if not units:
        raise RuntimeError("الرد مفيهوش باقات — شغّل --debug")
    # الباقة الأساسية = أكبر رصيد إجمالي
    main = max(units, key=lambda u: float(u.get("total") or u.get("initialAmount") or 0))
    unit = main.get("measureUnit") or main.get("unit") or "GB"
    total = _gb(main.get("total") or main.get("initialAmount"), unit)
    used = _gb(main.get("used") or main.get("usedAmount"), unit)
    remain = _gb(main.get("remain") or main.get("currentAmount") or (total - used), unit)
    return {
        "offer": main.get("offerName") or main.get("freeUnitTypeName") or "",
        "quota": total,
        "used": round(total - remain, 2) if total else used,
        "remaining": remain,
        "renewalDate": _date(main.get("expireTime") or main.get("expireDate")),
    }


def push_to_sheet(cfg, rows):
    url = (cfg.get("sheet_webapp_url") or "").strip()
    if not url:
        print("⚠️  sheet_webapp_url فاضي في config.json — اتكتب CSV بس")
        return False
    r = requests.post(url, data=json.dumps({"secret": cfg.get("sheet_secret", ""), "rows": rows}, ensure_ascii=False).encode("utf-8"),
                      headers={"Content-Type": "application/json"}, timeout=60, allow_redirects=True)
    try:
        res = r.json()
    except ValueError:
        res = {"ok": False, "error": r.text[:200]}
    print("الشيت:", res)
    return bool(res.get("ok"))


def write_csv(rows):
    OUT_DIR.mkdir(exist_ok=True)
    head = ["الكود", "التاريخ", "المستخدم", "المتبقي", "الحصة", "التجديد", "المصدر", "الاسم"]
    for name in ("latest.csv", "usage-%s.csv" % dt.date.today().isoformat()):
        with open(OUT_DIR / name, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(head)
            for r in rows:
                w.writerow([r["code"], r["date"], r["used"], r["remaining"], r["quota"], r["renewalDate"], r["source"], r["name"]])
    print("اتكتب:", OUT_DIR / "latest.csv")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--debug", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--set-password", metavar="CODE")
    args = ap.parse_args()
    cfg = load_config()

    if args.set_password:
        line = next((l for l in cfg["lines"] if l["code"] == args.set_password), None)
        if not line:
            sys.exit("الكود مش موجود في config.json")
        import keyring  # python -m pip install keyring
        keyring.set_password(KEYRING_SERVICE, line["number"], getpass.getpass("باسورد WE للخط %s: " % line["number"]))
        print("✓ اتحفظ في Windows Credential Manager — سيب password فاضي في config.json")
        return

    rows, failed = [], 0
    for line in cfg["lines"]:
        if line.get("skip"):
            continue
        try:
            s = requests.Session()
            token, sub = login(s, line["number"], get_password(line), args.debug)
            u = usage(s, token, sub, args.debug)
            row = {"code": line["code"], "name": line.get("name", ""), "date": dt.date.today().isoformat(), "source": "my.te.eg", **u}
            rows.append(row)
            print("✓ %s %s: متبقي %s من %s جيجا · التجديد %s" % (line["code"], line.get("name", ""), u["remaining"], u["quota"], u["renewalDate"] or "؟"))
        except Exception as e:  # خط واحد بايظ مايوقفش الباقي
            failed += 1
            print("✕ %s: %s" % (line["code"], e))
    if rows:
        write_csv(rows)
        if not args.dry_run:
            push_to_sheet(cfg, rows)
    sys.exit(1 if failed and not rows else 0)


if __name__ == "__main__":
    main()
