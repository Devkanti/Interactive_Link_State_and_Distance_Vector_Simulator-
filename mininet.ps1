# Mininet CLI wrapper for Windows PowerShell
# Forwards clean commands directly to the running Mininet container

param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$Command = "help",

    [Parameter(Position=1, Mandatory=$false)]
    [string]$Arg1,

    [Parameter(Position=2, Mandatory=$false)]
    [string]$Arg2,

    [Parameter(Position=3, Mandatory=$false)]
    [string]$Arg3
)

$argsList = @()
if ($Arg1) { $argsList += $Arg1 }
if ($Arg2) { $argsList += $Arg2 }
if ($Arg3) { $argsList += $Arg3 }

docker exec routing_mininet_engine mn-cli $Command $argsList
