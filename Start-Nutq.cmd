@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto failed
)
if not exist dist\index.html (
  call npm.cmd run build
  if errorlevel 1 goto failed
)
echo Nutq: http://localhost:3001
echo Server ishlashi uchun ushbu oynani ochiq qoldiring.
call npm.cmd start
pause
exit /b
:failed
echo Ishga tushirishda xatolik. Node.js 24 o'rnatilganini tekshiring.
pause
