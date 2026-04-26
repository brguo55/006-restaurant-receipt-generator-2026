@echo off
cd /d "%~dp0"

REM Try py (Windows Python Launcher), then python, then python3
where py >nul 2>&1
if %errorlevel% == 0 (set "PYTHON_CMD=py" & goto :run)
where python >nul 2>&1
if %errorlevel% == 0 (set "PYTHON_CMD=python" & goto :run)
where python3 >nul 2>&1
if %errorlevel% == 0 (set "PYTHON_CMD=python3" & goto :run)

echo ERROR: Python not found. Please install Python from https://www.python.org/
echo Make sure to check "Add Python to PATH" during installation.
pause
exit /b 1

:run
echo Starting Restaurant Receipt Generator...
start /B "" %PYTHON_CMD% -m http.server 8000
timeout /t 1 /nobreak >nul
start "" "http://localhost:8000/generator.html"
echo.
echo Server running at: http://localhost:8000/generator.html
echo Close this window to stop the server.
echo.
pause