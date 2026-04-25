@echo off
echo Cerrando todos los procesos de Node.js...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo ✅ Listo. Todos los puertos han sido liberados.
echo.
echo Para arrancar la plataforma de nuevo, ejecuta:
echo   start-platform.bat
pause
