@echo off
REM Wealthfolio Docker Deployment Setup Script for Windows
REM Usage: deploy.bat [dev|prod]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

echo.
echo ================================================
echo Wealthfolio Docker Deployment Setup
echo Environment: %ENVIRONMENT%
echo ================================================
echo.

REM Check if .env.docker exists
if not exist ".env.docker" (
    echo Creating .env.docker from template...
    copy .env.docker.example .env.docker
    echo.
    echo Created .env.docker
    echo.
    echo ^^!IMPORTANT^^! Update .env.docker with your values:
    echo   - Set WF_SECRET_KEY to a random value
    echo   - Set WF_PORT if needed
    echo   - Set WF_CORS_ALLOW_ORIGINS for your domain
    echo.
    pause
) else (
    echo .env.docker already exists
)

echo.
echo Building Docker image...
echo.

if /i "%ENVIRONMENT%"=="dev" (
    docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker build
    if errorlevel 1 goto :error
    echo.
    echo Build complete!
    echo.
    echo Starting application in development mode...
    docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d

) else if /i "%ENVIRONMENT%"=="prod" (
    docker compose -f compose.yml --env-file .env.docker build
    if errorlevel 1 goto :error
    echo.
    echo Build complete!
    echo.
    echo Starting application in production mode...
    docker compose -f compose.yml --env-file .env.docker up -d

) else (
    echo Error: Invalid environment: %ENVIRONMENT%
    echo Usage: deploy.bat [dev^|prod]
    exit /b 1
)

echo.
echo ================================================
echo Deployment successful!
echo ================================================
echo.
echo Application URL: http://localhost:8088
echo.
echo Useful commands:
echo   View logs:      docker compose logs -f wealthfolio
echo   Stop service:   docker compose down
echo   Restart:        docker compose restart wealthfolio
echo.
goto :end

:error
echo.
echo Error occurred during build or startup
exit /b 1

:end
endlocal
