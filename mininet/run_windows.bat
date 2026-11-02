@echo off
title Mininet L3 Router Emulation (Windows Mode)
color 0B
echo =================================================================
echo   Mininet L3 Router Emulation ^& Dashboard Bridge (Windows Mode)
echo =================================================================
echo.
echo [*] Starting Python L3 Router Emulation and Bridge Server on port 8080...
echo [*] Web Dashboard: http://localhost:5173
echo.
python topology_runner.py --topo diamond --proto LSR --port 8080
pause
