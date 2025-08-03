# PowerShell script to test login API
Write-Host "🧪 Testing Login API with PowerShell..." -ForegroundColor Cyan
Write-Host ""

# Test data
$testUsers = @(
    @{ username = "admin"; password = "admin123"; role = "Admin" },
    @{ username = "manager1"; password = "manager123"; role = "Manager" },
    @{ username = "staff1"; password = "staff123"; role = "Staff" }
)

$apiUrl = "http://localhost:5000/api/auth/login"

foreach ($user in $testUsers) {
    Write-Host "📋 Testing $($user.role) Login ($($user.username)):" -ForegroundColor Yellow
    
    $body = @{
        identifier = $user.username
        password = $user.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "   User: $($response.user.profile.firstName) $($response.user.profile.lastName)" -ForegroundColor Gray
        Write-Host "   Role: $($response.user.role)" -ForegroundColor Gray
        Write-Host "   Token: $($response.token.Substring(0,20))..." -ForegroundColor Gray
    }
    catch {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        if ($_.Exception.Response) {
            $result = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($result)
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

Write-Host "🏁 Login tests completed!" -ForegroundColor Cyan
Read-Host "Press Enter to continue"
