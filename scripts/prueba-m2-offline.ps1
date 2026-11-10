param([string]$Node='node')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$runId=[guid]::NewGuid().ToString()
$env:FITZONE_E2E_RUN_ID=$runId
$taskExit=1
Push-Location (Join-Path $taskRoot 'frontend')
try {
    & npm run build
    if($LASTEXITCODE -ne 0){throw 'Build frontend falló'}
    & $Node scripts/e2e-m2-offline.mjs
    $taskExit=$LASTEXITCODE
} finally {
    # Supervisor externo: limpia incluso si el proceso Node termina sin ejecutar su finally.
    foreach($container in @("fitzone-offline-e2e-java-$runId","fitzone-offline-e2e-pg-$runId")) {
        $exists=& docker ps -aq --filter "name=^/$container`$"
        if($exists){
            $paused=& docker inspect --format '{{.State.Paused}}' $container
            if($paused -eq 'true'){& docker unpause $container | Out-Null}
            & docker rm -f $container | Out-Null
        }
    }
    $secretFile=Join-Path $taskRoot "target/e2e-m2/$runId/backend.env"
    if(Test-Path -LiteralPath $secretFile){Remove-Item -LiteralPath $secretFile}
    Remove-Item Env:FITZONE_E2E_RUN_ID -ErrorAction SilentlyContinue
    Pop-Location
}
exit $taskExit
