@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo Project Neverlight を GitHub に公開します。
echo 公開先: https://github.com/blackbeatbeast/RPG-neverlight
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish-to-github.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo 完了しました。GitHub を確認してください。
) else (
  echo 安全のため処理を停止しました。上のエラー内容を確認してください。
)
echo.
pause
exit /b %EXIT_CODE%
