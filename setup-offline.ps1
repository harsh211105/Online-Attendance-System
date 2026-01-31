# PowerShell script to download face-api.js and models for offline use
# Run this ONCE from the project root directory
# Right-click and select "Run with PowerShell"

Write-Host "📦 Setting up offline face recognition..." -ForegroundColor Green
Write-Host ""

# Create models directory
if (!(Test-Path "models")) {
    New-Item -ItemType Directory -Path "models" | Out-Null
    Write-Host "✓ Created /models directory" -ForegroundColor Green
}

Write-Host "📥 Downloading face-api library..." -ForegroundColor Yellow
$ProgressPreference = 'SilentlyContinue'

# Download the library
try {
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" `
        -OutFile "face-api.min.js" -UseBasicParsing
    Write-Host "✓ Downloaded face-api.min.js" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download face-api.min.js: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📥 Downloading face detection models..." -ForegroundColor Yellow
Write-Host "This may take a minute..." -ForegroundColor Gray
Write-Host ""

$models = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model.weights.bin",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model.weights.bin",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model.weights.bin"
)

$downloaded = 0
$failed = 0

foreach ($model in $models) {
    $url = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/$model"
    $outFile = "models\$model"
    
    try {
        Write-Host "  Downloading: $model" -ForegroundColor Cyan -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
        Write-Host " ✓" -ForegroundColor Green
        $downloaded++
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ Setup complete! Face recognition is now offline-ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Downloaded files:" -ForegroundColor Yellow
    Write-Host "  • face-api.min.js (in project root)" -ForegroundColor Gray
    Write-Host "  • 6 model files (in /models folder)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Start the server: npm start" -ForegroundColor Gray
    Write-Host "  2. Go to: http://localhost:5000/face-login.html" -ForegroundColor Gray
    Write-Host "  3. App works completely OFFLINE now! 🎉" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Setup completed with $failed error(s)" -ForegroundColor Yellow
    Write-Host "Downloaded: $downloaded / 6 files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If download fails:" -ForegroundColor Yellow
    Write-Host "  1. Check your internet connection" -ForegroundColor Gray
    Write-Host "  2. Try running the script again" -ForegroundColor Gray
    Write-Host "  3. Or download files manually from CDN" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
