@echo off
REM ===================================
REM NBA AGENT - AUTO LAUNCHER
REM ===================================

echo.
echo ========================================
echo  NBA AGENT - Routine Automatique
echo ========================================
echo.

REM Se placer dans le bon dossier
cd /d "c:\Users\User IK\DEv\NBA_Agent"

REM Lancer le script master
python nba_master.py

REM Attendre avant de fermer (utile pour debug)
echo.
echo ========================================
pause
