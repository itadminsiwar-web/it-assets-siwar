@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/3] تثبيت المكتبات...
python -m pip install --quiet requests keyring
if not exist config.json copy config.example.json config.json >nul
echo [2/3] افتح config.json واكتب الخطوط ورابط الشيت، وبعدين احفظ الباسوردات:
echo        python we_usage.py --set-password NET-001
echo [3/3] جدولة التشغيل كل ساعة (Task Scheduler)...
schtasks /Create /F /SC HOURLY /TN "WE Usage - IT Administration" /TR "\"%~dp0run.bat\"" >nul && echo تم: هيشتغل كل ساعة.
pause
