@echo off
REM Скрипт для инициализации git репозитория

echo Инициализация git репозитория Zorssms...

git config --global user.email "dev@zorssms.com"
git config --global user.name "Zorssms Developer"

cd /d "%~dp0"

git init
git add .
git commit -m "Initial commit: Zorssms messenger v1.0"

echo.
echo Готово! Репозиторий инициализирован.
echo.
echo Теперь загрузи его на GitHub:
echo 1. Создай новый репозиторий на github.com
echo 2. Выполни команды:
echo    git remote add origin https://github.com/YOUR_USERNAME/zorssms.git
echo    git branch -M main
echo    git push -u origin main
echo.
pause
