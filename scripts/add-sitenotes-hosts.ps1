# Adiciona "127.0.0.1 sitenotes" ao arquivo hosts (execute como Administrador).
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1 sitenotes"
$content = Get-Content $hostsPath -ErrorAction Stop
if ($content -match '(?m)^\s*127\.0\.0\.1\s+sitenotes(\s|$)') {
    Write-Host "Entrada ja existe em $hostsPath"
    exit 0
}
Add-Content -Path $hostsPath -Value $entry -Encoding ascii
Write-Host "Adicionado: $entry"
