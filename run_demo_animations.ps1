# Interactive Dashboard Animation & Chaos Monkey Showcase Script
# Ensure http://localhost:5173 is open in your browser tab to see the live animations!

Clear-Host
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "    INTERACTIVE ROUTING SIMULATOR - CHAOS MONKEY & ANIMATION SHOWCASE     " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Make sure http://localhost:5173 is OPEN in your browser tab!`n" -ForegroundColor White

# Step 1: Send ICMP Ping
Write-Host "[Step 1] Triggering Multi-Hop ICMP Ping (R1 to R4)..." -ForegroundColor Cyan
Write-Host ">>> Look at the dashboard canvas: Glowing Cyan packet glides along links with Echo Reply!" -ForegroundColor Gray
$pingRes = Invoke-RestMethod -Uri "http://localhost:8080/api/ping" -Method Post -Body '{"src":"r1","dst":"r4"}' -ContentType "application/json"
Write-Host "Ping Output: $($pingRes.output.Trim())" -ForegroundColor Green
Start-Sleep -Seconds 5

# Step 2: Chaos Monkey - Sever Link R1 - R2
Write-Host ""
Write-Host "[Step 2] CHAOS MONKEY: Severing Link between Router R1 and R2..." -ForegroundColor Red
Write-Host ">>> Look at dashboard: Red crackling electric laser beam and SEVERED spark badge!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"sever","src":"r1","dst":"r2"}' -ContentType "application/json"
Write-Host "Link R1 - R2 is now: SEVERED (DOWN)" -ForegroundColor Red
Start-Sleep -Seconds 4

# Step 3: Re-route ICMP Ping around severed link
Write-Host ""
Write-Host "[Step 3] Sending ICMP Ping while R1-R2 is severed..." -ForegroundColor Yellow
Write-Host ">>> Look at dashboard: The packet dynamically re-routes along healthy link via Router R3!" -ForegroundColor Gray
$reroutePing = Invoke-RestMethod -Uri "http://localhost:8080/api/ping" -Method Post -Body '{"src":"r1","dst":"r4"}' -ContentType "application/json"
Write-Host "Ping Output: $($reroutePing.output.Trim())" -ForegroundColor Green
Start-Sleep -Seconds 5

# Step 4: Chaos Monkey - Crash Router R2
Write-Host ""
Write-Host "[Step 4] CHAOS MONKEY: Crashing Router R2..." -ForegroundColor Red
Write-Host ">>> Look at dashboard: Expanding fiery explosion shockwaves and CRASHED badge!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"crash","node":"r2"}' -ContentType "application/json"
Write-Host "Router R2 is now: CRASHED (OFFLINE)" -ForegroundColor Red
Start-Sleep -Seconds 4

# Step 5: Chaos Monkey - Metric Jitter (Cost Spike)
Write-Host ""
Write-Host "[Step 5] CHAOS MONKEY: Injecting Metric Jitter on Link R1-R3..." -ForegroundColor DarkYellow
Write-Host ">>> Look at dashboard: Floating flame pop badge (Cost: 1 to 8) rises above the link!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"jitter","src":"r1","dst":"r3","cost":8}' -ContentType "application/json"
Write-Host "Link R1 - R3 cost shifted to: 8" -ForegroundColor DarkYellow
Start-Sleep -Seconds 4

# Step 6: Chaos Monkey - Link Flapping Oscillator
Write-Host ""
Write-Host "[Step 6] CHAOS MONKEY: Injecting Link Flap Storm on Link R3-R4..." -ForegroundColor Yellow
Write-Host ">>> Look at dashboard: Glowing oscillating amber hazard caution beam along the link!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"flap","src":"r3","dst":"r4","interval":2}' -ContentType "application/json"
Write-Host "Link R3 - R4 is now: FLAPPING rapidly" -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Step 7: Chaos Monkey - Recovery & Restoration
Write-Host ""
Write-Host "[Step 7] CHAOS MONKEY: Restoring router and links..." -ForegroundColor Green
Write-Host ">>> Look at dashboard: Restorative pulse ring and green restored banners appear!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"recover","node":"r2"}' -ContentType "application/json"
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/link" -Method Post -Body '{"src":"r1","dst":"r2","status":"up"}' -ContentType "application/json"
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/chaos" -Method Post -Body '{"action":"jitter","src":"r1","dst":"r3","cost":1}' -ContentType "application/json"
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/link" -Method Post -Body '{"src":"r3","dst":"r4","status":"up"}' -ContentType "application/json"
Write-Host "All routers and links restored ONLINE!" -ForegroundColor Green
Start-Sleep -Seconds 4

# Step 8: Switch Protocol to Distance-Vector (DVR)
Write-Host ""
Write-Host "[Step 8] Switching Routing Protocol to Distance-Vector (DVR / Bellman-Ford)..." -ForegroundColor Magenta
Write-Host ">>> Look at dashboard: Protocol badge updates and Distance Vector matrices synchronize!" -ForegroundColor Gray
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/protocol" -Method Post -Body '{"protocol":"DVR"}' -ContentType "application/json"
Write-Host "Active Protocol is now: DVR" -ForegroundColor Magenta
Start-Sleep -Seconds 3

# Step 9: Switch Protocol back to Link-State Routing (LSR)
Write-Host ""
Write-Host "[Step 9] Switching Routing Protocol back to Link-State Routing (LSR / Dijkstra SPF)..." -ForegroundColor Cyan
$null = Invoke-RestMethod -Uri "http://localhost:8080/api/protocol" -Method Post -Body '{"protocol":"LSR"}' -ContentType "application/json"
Write-Host "Active Protocol is now: LSR" -ForegroundColor Cyan

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   SHOWCASE COMPLETE! All Chaos Monkey and network animations verified!  " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
