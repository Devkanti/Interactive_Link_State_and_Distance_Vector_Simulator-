# Chaos Monkey CLI with Auto-Mesh Detection for Interactive Routing Simulator
# Automatically inspects whichever topology/mesh is active on http://localhost:5173!

param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$Action = "status",

    [Parameter(Position=1, Mandatory=$false)]
    [string]$Arg1,

    [Parameter(Position=2, Mandatory=$false)]
    [string]$Arg2,

    [Parameter(Position=3, Mandatory=$false)]
    [string]$Arg3
)

$Endpoint = "http://localhost:8080"

# 1. Automatically fetch the live topology currently active on the Dashboard
$activeTopo = $null
try {
    $activeTopo = Invoke-RestMethod -Uri "$Endpoint/api/topology" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
} catch {}

$presetName = if ($activeTopo -and $activeTopo.preset) { $activeTopo.preset } else { "Diamond Multi-Path" }
$topoNodes = if ($activeTopo -and $activeTopo.nodes) { @($activeTopo.nodes) } else { @(
    @{ id = "A"; label = "Router A"; status = "ACTIVE" },
    @{ id = "B"; label = "Router B"; status = "ACTIVE" },
    @{ id = "C"; label = "Router C"; status = "ACTIVE" },
    @{ id = "D"; label = "Router D"; status = "ACTIVE" }
) }
$topoEdges = if ($activeTopo -and $activeTopo.edges) { @($activeTopo.edges) } else { @(
    @{ id = "A<->B"; source = "A"; target = "B"; cost = 1; status = "UP" },
    @{ id = "A<->C"; source = "A"; target = "C"; cost = 4; status = "UP" },
    @{ id = "B<->D"; source = "B"; target = "D"; cost = 5; status = "UP" },
    @{ id = "C<->D"; source = "C"; target = "D"; cost = 1; status = "UP" }
) }

function Resolve-NodeId([string]$inputStr, $fallbackNode) {
    if (-not $inputStr) {
        if ($fallbackNode) { return $fallbackNode.id }
        return $topoNodes[0].id
    }
    $clean = $inputStr.Trim()
    
    # Check exact ID or Label match
    foreach ($n in $topoNodes) {
        if ($n.id -eq $clean -or $n.label -eq $clean) { return $n.id }
    }
    
    # Case-insensitive match
    $cleanLower = $clean.ToLower().Replace("router", "").Replace("_", "").Replace(" ", "")
    foreach ($n in $topoNodes) {
        $nIdLower = "$($n.id)".ToLower().Replace("router", "").Replace("_", "").Replace(" ", "")
        $nLblLower = "$($n.label)".ToLower().Replace("router", "").Replace("_", "").Replace(" ", "")
        if ($nIdLower -eq $cleanLower -or $nLblLower -eq $cleanLower) { return $n.id }
    }
    
    # Number to index match (e.g. '1' -> first node)
    if ($clean -match '^\d+$') {
        $idx = [int]$clean - 1
        if ($idx -ge 0 -and $idx -lt $topoNodes.Count) { return $topoNodes[$idx].id }
    }

    # Letter to index match ('A' -> 1st node, 'B' -> 2nd node)
    if ($clean.Length -eq 1 -and [char]::IsLetter($clean[0])) {
        $idx = [int][char]$clean.ToUpper()[0] - [int][char]'A'
        if ($idx -ge 0 -and $idx -lt $topoNodes.Count) { return $topoNodes[$idx].id }
    }

    return $clean
}

function Show-Header {
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "         CHAOS MONKEY CONTROLLER  (AUTO-DETECTING LIVE DASHBOARD)         " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "Active Mesh on Canvas : [$presetName]" -ForegroundColor Green
    $nCount = $topoNodes.Count
    $eCount = $topoEdges.Count
    Write-Host "Topology Inventory    : $nCount Routers / $eCount Links" -ForegroundColor White
    $nodeNames = ($topoNodes | ForEach-Object { if ($_.label -and $_.label -ne $_.id) { "$($_.id) ($($_.label))" } else { "$($_.id)" } }) -join ", "
    Write-Host "Routers in Mesh       : $nodeNames" -ForegroundColor Gray
    Write-Host "==========================================================================" -ForegroundColor Cyan
}

switch ($Action.ToLower()) {
    "sever" {
        Show-Header
        # Pick default UP edge from detected topology if not specified
        $upEdges = @($topoEdges | Where-Object { $_.status -ne "DOWN" })
        $chosenEdge = if ($upEdges.Count -gt 0) { $upEdges[0] } else { $topoEdges[0] }

        $src = if ($Arg1) { Resolve-NodeId $Arg1 $chosenEdge } else { $chosenEdge.source }
        $dst = if ($Arg2) { Resolve-NodeId $Arg2 $chosenEdge } else { $chosenEdge.target }

        Write-Host ""
        Write-Host "[SEVER] Severing Link between [$src <-> $dst] in $presetName..." -ForegroundColor Red
        $body = @{ action = "sever"; src = $src; dst = $dst } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body $body -ContentType "application/json"
        Write-Host ">>> Link [$src <-> $dst] is now SEVERED! Look at dashboard for red electric laser beam." -ForegroundColor Yellow
    }

    "crash" {
        Show-Header
        $onlineNodes = @($topoNodes | Where-Object { $_.status -ne "CRASHED" })
        $fallback = if ($onlineNodes.Count -gt 1) { $onlineNodes[1] } elseif ($onlineNodes.Count -gt 0) { $onlineNodes[0] } else { $topoNodes[0] }
        $node = if ($Arg1) { Resolve-NodeId $Arg1 $fallback } else { $fallback.id }

        Write-Host ""
        Write-Host "[CRASH] Crashing Router [$node] in $presetName..." -ForegroundColor Red
        $body = @{ action = "crash"; node = $node } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body $body -ContentType "application/json"
        Write-Host ">>> Router [$node] is now CRASHED! Look at dashboard for fiery explosion shockwaves." -ForegroundColor Yellow
    }

    "recover" {
        Show-Header
        $crashedNodes = @($topoNodes | Where-Object { $_.status -eq "CRASHED" })
        $fallback = if ($crashedNodes.Count -gt 0) { $crashedNodes[0] } else { $topoNodes[0] }
        $node = if ($Arg1) { Resolve-NodeId $Arg1 $fallback } else { $fallback.id }

        Write-Host ""
        Write-Host "[RECOVER] Restoring Router [$node] in $presetName..." -ForegroundColor Green
        $body = @{ action = "recover"; node = $node } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body $body -ContentType "application/json"
        Write-Host ">>> Router [$node] is now RESTORED (Active)! Look at dashboard for emerald healing wave." -ForegroundColor Green
    }

    "jitter" {
        Show-Header
        $chosenEdge = $topoEdges[0]
        $src = if ($Arg1) { Resolve-NodeId $Arg1 $chosenEdge } else { $chosenEdge.source }
        $dst = if ($Arg2) { Resolve-NodeId $Arg2 $chosenEdge } else { $chosenEdge.target }
        $cost = if ($Arg3) { [int]$Arg3 } else { 9 }

        Write-Host ""
        Write-Host "[JITTER] Injecting Metric Jitter on Link [$src <-> $dst] (New Cost -> $cost)..." -ForegroundColor DarkYellow
        $body = @{ action = "jitter"; src = $src; dst = $dst; cost = $cost } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body $body -ContentType "application/json"
        Write-Host ">>> Link cost changed to $cost! Look at dashboard for floating flame pop badge." -ForegroundColor Yellow
    }

    "flap" {
        Show-Header
        $chosenEdge = if ($topoEdges.Count -gt 1) { $topoEdges[$topoEdges.Count - 1] } else { $topoEdges[0] }
        $src = if ($Arg1) { Resolve-NodeId $Arg1 $chosenEdge } else { $chosenEdge.source }
        $dst = if ($Arg2) { Resolve-NodeId $Arg2 $chosenEdge } else { $chosenEdge.target }
        $interval = if ($Arg3) { [int]$Arg3 } else { 2 }

        Write-Host ""
        Write-Host "[FLAP] Injecting Link Flap Storm on Link [$src <-> $dst] (Interval: every $interval ticks)..." -ForegroundColor Yellow
        $body = @{ action = "flap"; src = $src; dst = $dst; interval = $interval } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body $body -ContentType "application/json"
        Write-Host ">>> Link [$src <-> $dst] is now FLAPPING! Look at dashboard for pulsing amber hazard beam." -ForegroundColor Yellow
    }

    "ping" {
        Show-Header
        $srcNode = if ($topoNodes.Count -gt 0) { $topoNodes[0] } else { @{ id = "A" } }
        $dstNode = if ($topoNodes.Count -gt 1) { $topoNodes[$topoNodes.Count - 1] } else { $srcNode }

        $src = if ($Arg1) { Resolve-NodeId $Arg1 $srcNode } else { $srcNode.id }
        $dst = if ($Arg2) { Resolve-NodeId $Arg2 $dstNode } else { $dstNode.id }

        Write-Host ""
        Write-Host "[PING] Dispatching Multi-Hop ICMP Ping from [$src -> $dst] across $presetName..." -ForegroundColor Cyan
        $body = @{ src = $src; dst = $dst } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$Endpoint/api/ping" -Method Post -Body $body -ContentType "application/json"
        if ($res.output) {
            Write-Host "Ping Output: $($res.output.Trim())" -ForegroundColor Green
        }
        Write-Host ">>> Look at dashboard for glowing packet gliding along optimal path!" -ForegroundColor Cyan
    }

    "restore" {
        Show-Header
        Write-Host ""
        $nCount = $topoNodes.Count
        $eCount = $topoEdges.Count
        Write-Host "[RESTORE] Auto-Restoring all $nCount routers and $eCount links in [$presetName]..." -ForegroundColor Green
        foreach ($n in $topoNodes) {
            $null = Invoke-RestMethod -Uri "$Endpoint/api/chaos" -Method Post -Body (@{ action = "recover"; node = $n.id } | ConvertTo-Json) -ContentType "application/json"
        }
        foreach ($e in $topoEdges) {
            $null = Invoke-RestMethod -Uri "$Endpoint/api/link" -Method Post -Body (@{ src = $e.source; dst = $e.target; status = "up" } | ConvertTo-Json) -ContentType "application/json"
        }
        Write-Host ">>> All nodes and links in [$presetName] restored ONLINE (100% Healthy)!" -ForegroundColor Green
    }

    default {
        Show-Header
        Write-Host "Commands automatically adapted for [$presetName]:" -ForegroundColor White
        Write-Host "  .\monkey sever [src] [dst]           # Sever link (auto-selects if omitted)"
        Write-Host "  .\monkey crash [router]              # Crash router (auto-selects if omitted)"
        Write-Host "  .\monkey recover [router]            # Recover router back online"
        Write-Host "  .\monkey jitter [src] [dst] [cost]   # Inject cost jitter on link"
        Write-Host "  .\monkey flap [src] [dst] [interval] # Flap link rapidly"
        Write-Host "  .\monkey ping [src] [dst]            # Trace ping across active mesh"
        Write-Host "  .\monkey restore                     # Restore ALL routers & links in active mesh"
        Write-Host "==========================================================================" -ForegroundColor Cyan
    }
}
