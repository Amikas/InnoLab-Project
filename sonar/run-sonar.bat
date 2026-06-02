@echo off
setlocal

cd /d "%~dp0.."

echo Running frontend coverage...
pushd ctf-frontend
call npm run test:coverage
if errorlevel 1 exit /b %errorlevel%
popd

echo Running backend tests...
pushd ctf-backend
call .\mvnw.cmd test
if errorlevel 1 exit /b %errorlevel%
popd

if "%SONAR_TOKEN%"=="" (
  echo SONAR_TOKEN environment variable is required.
  exit /b 1
)

if "%SONAR_HOST_URL%"=="" (
  set "SONAR_HOST_URL=http://host.docker.internal:9000"
)

echo Running SonarScanner...
docker run --rm ^
  -e SONAR_TOKEN ^
  -e SONAR_HOST_URL="%SONAR_HOST_URL%" ^
  -v "%CD%:/usr/src" ^
  sonarsource/sonar-scanner-cli ^
  -Dproject.settings=sonar/sonar-project.properties
if errorlevel 1 exit /b %errorlevel%

echo SonarQube scan completed.
echo Open: http://localhost:9000/dashboard?id=InnoLab-Project
endlocal
