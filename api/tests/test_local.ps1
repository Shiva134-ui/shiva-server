Start-Process -FilePath "node" -ArgumentList "api/src/server.js" -NoNewWindow
Start-Sleep -Seconds 2
echo "--- Testing /api/v1/health ---"
Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/v1/health" | ConvertTo-Json
echo "--- Testing unauthenticated /api/v1/system ---"
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/v1/system"
} catch {
    $_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
Get-Process node | Stop-Process
