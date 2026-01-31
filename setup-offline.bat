@echo off
REM Download face-api.js and models for offline use
REM Run this ONCE from the project root directory

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  Offline Face Recognition Setup
echo ========================================
echo.

REM Create models directory
if not exist "models" (
    mkdir models
    echo [OK] Created /models directory
)

echo.
echo Downloading face-api library...
echo.

REM Download face-api.min.js
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js', 'face-api.min.js')" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Downloaded face-api.min.js
) else (
    echo [FAILED] Could not download face-api.min.js
    goto :ERROR
)

echo.
echo Downloading models (this may take a minute)...
echo.

set downloaded=0
set failed=0

REM Model files to download
set models[0]=ssd_mobilenetv1_model-weights_manifest.json
set models[1]=ssd_mobilenetv1_model.weights.bin
set models[2]=face_landmark_68_model-weights_manifest.json
set models[3]=face_landmark_68_model.weights.bin
set models[4]=face_recognition_model-weights_manifest.json
set models[5]=face_recognition_model.weights.bin

for /L %%i in (0,1,5) do (
    set "model=!models[%%i]!"
    echo   Downloading: !model!...
    
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/!model!', 'models\!model!')" 2>nul
    if !ERRORLEVEL! EQU 0 (
        echo     [OK]
        set /a downloaded+=1
    ) else (
        echo     [FAILED]
        set /a failed+=1
    )
)

echo.
echo ========================================

if %failed% EQU 0 (
    echo.
    echo [SUCCESS] Setup complete!
    echo.
    echo Downloaded files:
    echo   - face-api.min.js (in project root)
    echo   - 6 model files (in /models folder)
    echo.
    echo Next steps:
    echo   1. npm start
    echo   2. Open: http://localhost:5000/face-login.html
    echo   3. App works OFFLINE! ^^!
    echo.
    pause
    exit /b 0
) else (
    :ERROR
    echo.
    echo [ERROR] Download incomplete!
    echo Downloaded: %downloaded% / 6 files
    echo Failed: %failed% files
    echo.
    echo Try again or check internet connection.
    echo.
    pause
    exit /b 1
)
