# Скрипт для подготовки файлов к загрузке на GitHub/хост
# Копирует все файлы кроме node_modules в отдельную папку для загрузки

param(
    [string]$OutputFolder = "zorssms-upload"
)

Write-Host "Подготовка файлов ZORSSMS для загрузки..." -ForegroundColor Green

# Создаем папку для загрузки
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
    Write-Host "✓ Создана папка: $OutputFolder"
}

# Копируем основные файлы
$FilesToCopy = @(
    "index.html",
    "server.js",
    "package.json",
    "package-lock.json",
    "Procfile",
    ".gitignore",
    ".env.example",
    "README.md",
    "DEPLOY.md",
    "UPLOAD_GUIDE.md"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file "$OutputFolder\"
        Write-Host "✓ Скопирован: $file"
    }
}

# Копируем папки
$FoldersToCopy = @("css", "js")

foreach ($folder in $FoldersToCopy) {
    if (Test-Path $folder) {
        Copy-Item $folder "$OutputFolder\" -Recurse -Force
        Write-Host "✓ Скопирована папка: $folder"
    }
}

Write-Host "`n✅ Готово! Файлы скопированы в папку: $OutputFolder" -ForegroundColor Green
Write-Host "`nДля загрузки на GitHub:" -ForegroundColor Yellow
Write-Host "1. Создайте репозиторий на GitHub"
Write-Host "2. Загрузите содержимое папки '$OutputFolder' через Web Interface"
Write-Host "3. Разверните на Render.com или Railway.app"
Write-Host "`nОсновные файлы для загрузки готовы! 🚀"
