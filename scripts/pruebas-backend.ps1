param(
    [string]$Image = 'fitzone-tests:local',
    [switch]$SkipImageBuild,
    [string]$Tests = ''
)

# PostgreSQL descartable, sin puertos de host ni volúmenes compartidos.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$runId = [guid]::NewGuid().ToString('N')
$databaseName = "fitzone-tests-pg-$runId"
$runnerName = "fitzone-tests-java-$runId"
$databaseCreated = $false
$runnerCreated = $false
$reportDirectory = Join-Path $taskRoot "target/test-runs/$runId"
$testExit = 1

function Invoke-DockerChecked {
    param([string[]]$DockerArguments)
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw "Docker falló: $($DockerArguments[0])" }
}

Push-Location $taskRoot
try {
    if (-not $SkipImageBuild) {
        Invoke-DockerChecked -DockerArguments @('build', '--target', 'build', '-t', $Image, '.')
    }
    Invoke-DockerChecked -DockerArguments @('run', '-d', '--name', $databaseName,
        '--tmpfs', '/var/lib/postgresql', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
        '-e', 'POSTGRES_DB=fitzone_test', 'postgres:18') | Out-Null
    $databaseCreated = $true
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        & docker exec $databaseName pg_isready -U postgres -d fitzone_test *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'PostgreSQL de pruebas no inició a tiempo' }

    Invoke-DockerChecked -DockerArguments @('create', '-i', '--name', $runnerName,
        '--network', "container:$databaseName",
        '--mount', "type=bind,source=$taskRoot/src,target=/app/src,readonly",
        '--mount', "type=bind,source=$taskRoot/docs,target=/app/docs,readonly",
        '--mount', "type=bind,source=$taskRoot/pom.xml,target=/app/pom.xml,readonly",
        '-e', 'PLAN_TEST_DB_URL=jdbc:postgresql://localhost:5432/fitzone_test',
        '-e', 'JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires',
        '-e', "FITZONE_TEST_FILTER=$Tests", '--entrypoint', '/bin/sh', $Image) | Out-Null
    $runnerCreated = $true
    # stdin evita el escapado de comillas entre PowerShell, Docker y sh -c.
    $command = @'
if [ -n "$FITZONE_TEST_FILTER" ]; then
    ./mvnw -B clean verify "-Dtest=$FITZONE_TEST_FILTER"
else
    ./mvnw -B clean verify
fi
exit $?
'@
    ($command.Replace("`r`n", "`n") + "`n") | & docker start -ai $runnerName
    $testExit = $LASTEXITCODE
    New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
    & docker cp "${runnerName}:/app/target/surefire-reports" $reportDirectory
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron recuperar los reportes de pruebas' }
    if ($testExit -eq 0) {
        Invoke-DockerChecked -DockerArguments @('cp', "${runnerName}:/app/target/site/jacoco", $reportDirectory)
    }
    Write-Output "REPORTES: $reportDirectory"
}
finally {
    # Sólo se eliminan los contenedores creados por esta ejecución. No se borran volúmenes.
    if ($runnerCreated) { & docker rm -f $runnerName | Out-Null }
    if ($databaseCreated) { & docker rm -f $databaseName | Out-Null }
    Pop-Location
}
exit $testExit
