<#
.SYNOPSIS
Reproduces the concurrent startSprint race against a running TaskFlow backend.

.DESCRIPTION
This test changes both target sprints from ToDo to InProgress and does not reset
data afterward. For deterministic reproduction, temporarily add the 5-second
delay immediately after existsByWorkspace_IdAndStatus() in startSprint().
Run:
# $env:TASKFLOW_ACCESS_TOKEN = "TOKEN_MOI"
$env:TASKFLOW_API_KEY = "API_KEY_CUA_BACKEND"
.\scripts\reproduce-start-sprint-race.ps1

.\scripts\reproduce-start-sprint-race.ps1 -AccessToken "TOKEN_MOI" -ApiKey "API_KEY"
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "http://localhost:8080/api",

    [string]$WorkspaceId =
    "e6c30f81-6f48-4998-9c0e-df8f487a05b3",

    [string]$SprintAId =
    "9acd687f-aad8-4c1a-aefd-c49fa34fe3d6",

    [string]$SprintBId =
    "f561af96-da59-4c6e-8319-30e3baf04c6f",

    [string]$AccessToken = $env:TASKFLOW_ACCESS_TOKEN,

    [string]$ApiKey = $env:TASKFLOW_API_KEY
)

Add-Type -AssemblyName System.Net.Http

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Validate input
# ---------------------------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    throw @"
Missing access token.

Set TASKFLOW_ACCESS_TOKEN:
  `$env:TASKFLOW_ACCESS_TOKEN = '<token>'

Or pass it directly:
  .\scripts\reproduce-start-sprint-race.ps1 -AccessToken '<token>'
"@
}

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw @"
Missing API key.

Set TASKFLOW_API_KEY:
  `$env:TASKFLOW_API_KEY = '<api-key>'

Or pass it directly:
  .\scripts\reproduce-start-sprint-race.ps1 -ApiKey '<api-key>'
"@
}

$normalizedBaseUrl = $BaseUrl.TrimEnd('/')

$headers = @{
    Authorization = "Bearer $AccessToken"
    "x-api-key"    = $ApiKey
}

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

function Get-TestSprints {
    $response = Invoke-RestMethod `
        -Method Get `
        -Uri "$normalizedBaseUrl/sprints/workspace/$WorkspaceId" `
        -Headers $headers

    $sprints = @($response.result)

    $sprintA = $sprints |
            Where-Object { $_.id -eq $SprintAId } |
            Select-Object -First 1

    $sprintB = $sprints |
            Where-Object { $_.id -eq $SprintBId } |
            Select-Object -First 1

    if ($null -eq $sprintA -or $null -eq $sprintB) {
        throw @"
Sprint A or Sprint B does not belong to workspace $WorkspaceId.

Sprint A: $SprintAId
Sprint B: $SprintBId
"@
    }

    return @($sprintA, $sprintB)
}

function Format-ResponseBody {
    param(
        $Response
    )

    if ($null -eq $Response.Content) {
        return "<empty body>"
    }

    $body = $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

    if ([string]::IsNullOrWhiteSpace($body)) {
    return "<empty body>"
    }

    return $body
}

# ---------------------------------------------------------------------------
# Check preconditions
# ---------------------------------------------------------------------------

$before = Get-TestSprints

Write-Host ""
Write-Host "Before: A=$($before[0].status), B=$($before[1].status)"

if (
$before[0].status -ne "ToDo" -or
        $before[1].status -ne "ToDo"
) {
    throw @"
Precondition failed: both target sprints must be ToDo.

Sprint A status: $($before[0].status)
Sprint B status: $($before[1].status)
"@
}

$allBefore = Invoke-RestMethod `
    -Method Get `
    -Uri "$normalizedBaseUrl/sprints/workspace/$WorkspaceId" `
    -Headers $headers

$existingActiveCount = @(
$allBefore.result |
        Where-Object { $_.status -eq "InProgress" }
).Count

if ($existingActiveCount -ne 0) {
    throw @"
Precondition failed: workspace already has
$existingActiveCount InProgress sprint(s).
"@
}

# ---------------------------------------------------------------------------
# Send concurrent start requests
# ---------------------------------------------------------------------------

$client = $null
$requestA = $null
$requestB = $null
$responseA = $null
$responseB = $null

try {
    $client = [System.Net.Http.HttpClient]::new()

    $client.DefaultRequestHeaders.Authorization =
    [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
            "Bearer",
            $AccessToken
    )

    $client.DefaultRequestHeaders.Add(
            "x-api-key",
            $ApiKey
    )

    $requestA = [System.Net.Http.HttpRequestMessage]::new(
            [System.Net.Http.HttpMethod]::Post,
            "$normalizedBaseUrl/sprints/$SprintAId/start"
    )

    $requestB = [System.Net.Http.HttpRequestMessage]::new(
            [System.Net.Http.HttpMethod]::Post,
            "$normalizedBaseUrl/sprints/$SprintBId/start"
    )

    Write-Host "Sending two concurrent start requests..."

    # Start both requests before waiting for either result.
    $taskA = $client.SendAsync($requestA)
    $taskB = $client.SendAsync($requestB)

    [System.Threading.Tasks.Task]::WaitAll(
            [System.Threading.Tasks.Task[]]@(
                $taskA,
                $taskB
            )
    )

    $responseA = $taskA.GetAwaiter().GetResult()
    $responseB = $taskB.GetAwaiter().GetResult()

    Write-Host "HTTP A: $([int]$responseA.StatusCode) $($responseA.StatusCode)"
    Write-Host "HTTP B: $([int]$responseB.StatusCode) $($responseB.StatusCode)"

    if (
    -not $responseA.IsSuccessStatusCode -or
            -not $responseB.IsSuccessStatusCode
    ) {
        $bodyA = Format-ResponseBody -Response $responseA
        $bodyB = Format-ResponseBody -Response $responseB

        Write-Host "Response A: $bodyA"
        Write-Host "Response B: $bodyB"

        throw "Both start requests must succeed to reproduce the race."
    }
}
finally {
    if ($null -ne $requestA) {
        $requestA.Dispose()
    }

    if ($null -ne $requestB) {
        $requestB.Dispose()
    }

    if ($null -ne $responseA) {
        $responseA.Dispose()
    }

    if ($null -ne $responseB) {
        $responseB.Dispose()
    }

    if ($null -ne $client) {
        $client.Dispose()
    }
}

# ---------------------------------------------------------------------------
# Verify final database state
# ---------------------------------------------------------------------------

$deadline = [DateTime]::UtcNow.AddSeconds(10)
$after = $null
$activeCount = 0

do {
    # Read-only requests may be routed to a replica.
    # Allow replication to catch up before declaring failure.
    $after = Get-TestSprints

    $activeCount = @(
    $after |
            Where-Object { $_.status -eq "InProgress" }
    ).Count

    if ($activeCount -eq 2) {
        break
    }

    Start-Sleep -Milliseconds 250
}
while ([DateTime]::UtcNow -lt $deadline)

Write-Host ""
Write-Host "After: A=$($after[0].status), B=$($after[1].status)"

if ($activeCount -ne 2) {
    throw @"
Race was not reproduced.

Expected:
  Both target sprints are InProgress.

Actual:
  Sprint A: $($after[0].status)
  Sprint B: $($after[1].status)
  Active target sprint count: $activeCount
"@
}

Write-Host ""
Write-Host "BUG REPRODUCED:" -ForegroundColor Red
Write-Host "Workspace $WorkspaceId now has both target sprints InProgress."