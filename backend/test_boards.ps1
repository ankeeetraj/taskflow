$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api"

Write-Host "1. Logging in..."
$loginBody = @{ email = "testuser@example.com"; password = "password123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "2. Creating a new board..."
$boardBody = @{ name = "My Project"; description = "A test project" } | ConvertTo-Json
$createRes = Invoke-RestMethod -Uri "$baseUrl/boards" -Method Post -Body $boardBody -ContentType "application/json" -Headers $headers
$boardId = $createRes.board.id
Write-Host "Created board ID: $boardId"
$createRes | ConvertTo-Json -Depth 4

Write-Host "`n3. Getting all boards..."
$getBoardsRes = Invoke-RestMethod -Uri "$baseUrl/boards" -Method Get -Headers $headers
$getBoardsRes | ConvertTo-Json -Depth 4

Write-Host "`n4. Getting board by ID..."
$getBoardByIdRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId" -Method Get -Headers $headers
$getBoardByIdRes | ConvertTo-Json -Depth 4

Write-Host "`n5. Updating the board..."
$updateBody = @{ name = "Updated Project Name"; description = "Updated description" } | ConvertTo-Json
$updateRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
$updateRes | ConvertTo-Json -Depth 4

Write-Host "`n6. Deleting the board..."
$deleteRes = Invoke-RestMethod -Uri "$baseUrl/boards/$boardId" -Method Delete -Headers $headers
$deleteRes | ConvertTo-Json -Depth 4

Write-Host "`n7. Verifying deletion..."
try {
    Invoke-RestMethod -Uri "$baseUrl/boards/$boardId" -Method Get -Headers $headers
} catch {
    Write-Host "Expected error: $_"
}
