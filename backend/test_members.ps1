$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api"

Write-Host "1. Registering a second user (member)..."
try {
    $regBody = @{ username = "member1"; email = "member1@example.com"; password = "password" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json" | Out-Null
} catch {}

Write-Host "2. Logging in as owner..."
$loginBody = @{ email = "testuser@example.com"; password = "password123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$ownerId = $loginRes.user.id
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n3. Creating a board..."
$boardBody = @{ name = "Redis Test Board"; description = "Board for testing members and caching" } | ConvertTo-Json
$boardRes = Invoke-RestMethod -Uri "$baseUrl/boards" -Method Post -Body $boardBody -ContentType "application/json" -Headers $headers
$boardId = $boardRes.board.id

Write-Host "`n4. Inviting member1@example.com..."
$inviteBody = @{ email = "member1@example.com" } | ConvertTo-Json
$inviteRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId/members" -Method Post -Body $inviteBody -ContentType "application/json" -Headers $headers
$inviteRes | ConvertTo-Json

Write-Host "`n5. Getting board members..."
$membersRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId/members" -Method Get -Headers $headers
$membersRes | ConvertTo-Json -Depth 2
$memberUserId = ($membersRes | Where-Object { $_.email -eq "member1@example.com" }).id

Write-Host "`n6. Removing the member..."
$removeRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId/members/$memberUserId" -Method Delete -Headers $headers
$removeRes | ConvertTo-Json

Write-Host "`n7. Testing Redis Caching (GET /api/boards twice)..."
$t1 = Measure-Command { Invoke-RestMethod -Uri "$baseUrl/boards" -Method Get -Headers $headers | Out-Null } | Select-Object -Property TotalMilliseconds
Write-Host "First request (uncached/DB query): $($t1.TotalMilliseconds) ms"

$t2 = Measure-Command { Invoke-RestMethod -Uri "$baseUrl/boards" -Method Get -Headers $headers | Out-Null } | Select-Object -Property TotalMilliseconds
Write-Host "Second request (cached from Redis): $($t2.TotalMilliseconds) ms"

Write-Host "`n8. Deleting board..."
Invoke-RestMethod -Uri "$baseUrl/boards/$boardId" -Method Delete -Headers $headers | Out-Null
Write-Host "Cleanup complete."
