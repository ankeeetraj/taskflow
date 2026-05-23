$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api"

Write-Host "1. Logging in..."
$loginBody = @{ email = "testuser@example.com"; password = "password123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n2. Creating a test board to get columns..."
$boardBody = @{ name = "Tasks Test Board"; description = "Board for testing tasks" } | ConvertTo-Json
$boardRes = Invoke-RestMethod -Uri "$baseUrl/boards" -Method Post -Body $boardBody -ContentType "application/json" -Headers $headers
$column1Id = $boardRes.columns[0].id
$column2Id = $boardRes.columns[1].id

Write-Host "`n3. Creating Task 1 in Column 1..."
$task1Body = @{ column_id = $column1Id; title = "Task 1"; description = "First task"; deadline = "2024-12-31"; priority = "high" } | ConvertTo-Json
$task1 = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Post -Body $task1Body -ContentType "application/json" -Headers $headers
$task1Id = $task1.id
$task1 | ConvertTo-Json -Depth 2

Write-Host "`n4. Creating Task 2 in Column 1..."
$task2Body = @{ column_id = $column1Id; title = "Task 2"; description = "Second task"; priority = "medium" } | ConvertTo-Json
$task2 = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Post -Body $task2Body -ContentType "application/json" -Headers $headers
$task2Id = $task2.id
$task2 | ConvertTo-Json -Depth 2

Write-Host "`n5. Getting tasks for Column 1..."
$col1Tasks = Invoke-RestMethod -Uri "$baseUrl/tasks/column/$column1Id" -Method Get -Headers $headers
$col1Tasks | ConvertTo-Json -Depth 2

Write-Host "`n6. Updating Task 1..."
$updateBody = @{ title = "Updated Task 1"; status = "In Progress" } | ConvertTo-Json
$updateRes = Invoke-RestMethod -Uri "$baseUrl/tasks/$task1Id" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
$updateRes | ConvertTo-Json -Depth 2

Write-Host "`n7. Moving Task 1 to position 2 in Column 1..."
$moveBody = @{ new_column_id = $column1Id; new_position = 2 } | ConvertTo-Json
$moveRes = Invoke-RestMethod -Uri "$baseUrl/tasks/$task1Id/move" -Method Put -Body $moveBody -ContentType "application/json" -Headers $headers
$moveRes | ConvertTo-Json -Depth 2

Write-Host "`n8. Verifying new positions in Column 1..."
$col1TasksMoved = Invoke-RestMethod -Uri "$baseUrl/tasks/column/$column1Id" -Method Get -Headers $headers
$col1TasksMoved | ConvertTo-Json -Depth 2

Write-Host "`n9. Moving Task 1 to Column 2..."
$moveColBody = @{ new_column_id = $column2Id; new_position = 1 } | ConvertTo-Json
$moveColRes = Invoke-RestMethod -Uri "$baseUrl/tasks/$task1Id/move" -Method Put -Body $moveColBody -ContentType "application/json" -Headers $headers

Write-Host "`n10. Getting tasks for Column 2..."
$col2Tasks = Invoke-RestMethod -Uri "$baseUrl/tasks/column/$column2Id" -Method Get -Headers $headers
$col2Tasks | ConvertTo-Json -Depth 2

Write-Host "`n11. Deleting Task 2..."
$delRes = Invoke-RestMethod -Uri "$baseUrl/tasks/$task2Id" -Method Delete -Headers $headers
$delRes | ConvertTo-Json -Depth 2

Write-Host "`n12. Deleting the test board..."
Invoke-RestMethod -Uri "$baseUrl/boards/$($boardRes.board.id)" -Method Delete -Headers $headers | Out-Null
Write-Host "Cleanup complete."
