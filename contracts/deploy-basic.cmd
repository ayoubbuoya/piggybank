@echo off
echo ==========================================
echo Deploying Basic Factory (No Automation)
echo ==========================================
echo.

echo 1. Backing up current factory...
copy assembly\contracts\factory.ts assembly\contracts\factory-with-automation.backup.ts >nul
echo    * Backup created: factory-with-automation.backup.ts
echo.

echo 2. Switching to basic factory...
copy assembly\contracts\factory-basic.ts assembly\contracts\factory.ts >nul
echo    * Using factory-basic.ts
echo.

echo 3. Building contracts...
call npm run build
if errorlevel 1 (
    echo    X Build failed!
    exit /b 1
)
echo    * Build successful
echo.

echo 4. Deploying to blockchain...
call npm run deploy
if errorlevel 1 (
    echo    X Deployment failed!
    exit /b 1
)
echo.

echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Copy the factory address above
echo 2. Update frontend/.env with: VITE_SMART_CONTRACT=^<address^>
echo 3. Test the frontend: cd ../frontend ^&^& npm run dev
echo.
echo To restore full factory later:
echo   copy assembly\contracts\factory-with-automation.backup.ts assembly\contracts\factory.ts
echo.
pause
