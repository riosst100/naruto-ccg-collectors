# Adds naruto-ccg.local to the Windows hosts file. Run from an ELEVATED (Administrator) PowerShell:
#   powershell -ExecutionPolicy Bypass -File docker\add-hosts.ps1
$hosts = "$env:SystemRoot\System32\drivers\etc\hosts"
if (Select-String -Path $hosts -Pattern 'naruto-ccg\.local' -Quiet) {
  Write-Host "naruto-ccg.local is already in the hosts file."
} else {
  Add-Content -Path $hosts -Value "`n# naruto-ccg`n127.0.0.1 naruto-ccg.local" -Encoding ascii
  Write-Host "Added: 127.0.0.1 naruto-ccg.local"
}
ipconfig /flushdns | Out-Null
Write-Host "Open http://naruto-ccg.local:8080  (admin: http://naruto-ccg.local:8080/admin)"
