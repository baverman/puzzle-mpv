@echo off
setlocal

set "MSYS2_UCRT64=C:\msys64\ucrt64\bin"
set "MSYS2_USR=C:\msys64\usr\bin"
set "PUZZLE_MPV=%~dp0..\puzzle-mpv"

if not exist "%MSYS2_UCRT64%\python.exe" (
  echo puzzle-mpv: Python not found in "%MSYS2_UCRT64%" 1>&2
  exit /b 1
)

if not exist "%MSYS2_UCRT64%\mpv.exe" (
  echo puzzle-mpv: MPV not found in "%MSYS2_UCRT64%" 1>&2
  exit /b 1
)

if not exist "%PUZZLE_MPV%" (
  echo puzzle-mpv: launcher not found at "%PUZZLE_MPV%" 1>&2
  exit /b 1
)

set "PATH=%MSYS2_UCRT64%;%MSYS2_USR%;%PATH%"
python.exe "%PUZZLE_MPV%" %* --mpv mpv.exe
exit /b %ERRORLEVEL%
