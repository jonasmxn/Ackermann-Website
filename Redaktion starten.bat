@echo off
chcp 65001 >nul
title Website Ackermann - Redaktion starten
cd /d "%~dp0"
echo Starte Website-Vorschau und Redaktionssystem ...
echo Die beiden neuen Fenster offen lassen, solange du arbeitest.
start "Website-Vorschau (offen lassen)" cmd /k npm run dev
start "Redaktionssystem (offen lassen)" cmd /k npm run redaktion
timeout /t 8 /nobreak >nul
start "" http://localhost:4321/admin
exit
