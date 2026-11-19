@echo off
chcp 65001 >nul
cd /d "%~dp0"
python we_usage.py %*
