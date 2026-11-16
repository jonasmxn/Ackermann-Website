@echo off
chcp 65001 >nul
title Website Ackermann - Änderungen veröffentlichen
cd /d "%~dp0"
git add -A
git diff --cached --quiet
if %errorlevel%==0 (
  echo Es gibt keine neuen Änderungen zum Veröffentlichen.
  pause
  exit /b
)
git commit -m "Inhalte aktualisiert"
git push
if errorlevel 1 (
  echo.
  echo Das Hochladen hat nicht geklappt. Bitte die Meldung oben lesen.
) else (
  echo.
  echo Fertig. In ein bis zwei Minuten sind die Änderungen online.
)
pause
