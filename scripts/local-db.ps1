param([ValidateSet('setup','start','stop','status')][string]$Action='start')
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dbRoot=Join-Path $projectRoot '.local\postgres'
$pgRoot=if($env:POSTGRES_BIN){$env:POSTGRES_BIN}else{'C:\Program Files\PostgreSQL\18\bin'}
$dbPort=55432
if(-not(Test-Path (Join-Path $pgRoot 'pg_ctl.exe'))){throw 'PostgreSQL binaries not found. Set POSTGRES_BIN to your PostgreSQL bin directory.'}
if($Action -eq 'setup' -and -not(Test-Path (Join-Path $dbRoot 'PG_VERSION'))){
 New-Item -ItemType Directory -Force -Path $dbRoot | Out-Null
 # Isolated development cluster bound exclusively to localhost. Never exposed to a network.
 & (Join-Path $pgRoot 'initdb.exe') -D $dbRoot -U ic_owner --encoding=UTF8 --locale=C --auth=trust
 if($LASTEXITCODE -ne 0){throw 'Could not initialize local cluster'}
}
if($Action -in @('setup','start')){
 & (Join-Path $pgRoot 'pg_ctl.exe') -D $dbRoot status 2>$null | Out-Null
 if($LASTEXITCODE -ne 0){
  & (Join-Path $pgRoot 'pg_ctl.exe') -D $dbRoot -l (Join-Path $dbRoot 'server.log') -o "-p $dbPort -h 127.0.0.1" -w start
  if($LASTEXITCODE -ne 0){
   # Restricted Windows environments may reject pg_ctl's extra token wrapper.
   Start-Process -FilePath (Join-Path $pgRoot 'postgres.exe') -ArgumentList @('-D',('"'+$dbRoot+'"'),'-p',"$dbPort",'-h','127.0.0.1') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dbRoot 'launch.log') -RedirectStandardError (Join-Path $dbRoot 'launch-error.log')
   # Crash recovery after a reboot can take longer than two seconds.
   for($attempt=0;$attempt -lt 30;$attempt++){
    Start-Sleep -Seconds 1
    & (Join-Path $pgRoot 'pg_isready.exe') -h 127.0.0.1 -p $dbPort 2>$null | Out-Null
    if($LASTEXITCODE -eq 0){break}
   }
   if($LASTEXITCODE -ne 0){throw 'Could not start isolated PostgreSQL cluster; inspect .local/postgres/launch-error.log'}
  }
 }
 if($Action -eq 'setup'){
  $existing=& (Join-Path $pgRoot 'psql.exe') -h 127.0.0.1 -p $dbPort -U ic_owner -d postgres -tAc "select 1 from pg_database where datname='innovation_centre'"
  if($existing -ne '1'){& (Join-Path $pgRoot 'createdb.exe') -h 127.0.0.1 -p $dbPort -U ic_owner innovation_centre}
  node (Join-Path $PSScriptRoot 'local-migrate.mjs')
  if($LASTEXITCODE -ne 0){throw 'Local database migration failed'}
 }
}elseif($Action -eq 'stop'){& (Join-Path $pgRoot 'pg_ctl.exe') -D $dbRoot -m fast -w stop}else{& (Join-Path $pgRoot 'pg_ctl.exe') -D $dbRoot status}
