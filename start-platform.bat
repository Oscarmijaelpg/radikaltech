@echo off
echo Deteniendo procesos anteriores...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo Iniciando plataforma completa...
echo.
echo [1/3] Arrancando API en puerto 3004...
start "API - Backend" cmd /k "cd /d %~dp0apps\api && npm run dev"
timeout /t 5 /nobreak >nul

echo [2/3] Arrancando Web en puerto 5174...
start "WEB - Frontend" cmd /k "cd /d %~dp0apps\web && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Arrancando Admin en puerto 5555...
start "ADMIN - Panel" cmd /k "cd /d %~dp0apps\admin && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ✅ Plataforma completa iniciada!
echo    - API:    http://localhost:3004/api/v1
echo    - Web:    http://localhost:5174
echo    - Admin:  http://localhost:5555
echo.
start http://localhost:5174
