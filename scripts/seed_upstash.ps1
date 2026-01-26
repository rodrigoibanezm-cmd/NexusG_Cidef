$ErrorActionPreference = "Stop"

$BASE_URL = $env:KV_REST_API_URL
$TOKEN    = $env:KV_REST_API_TOKEN

if (-not $BASE_URL -or -not $TOKEN) {
  throw "Faltan env vars KV_REST_API_URL o KV_REST_API_TOKEN"
}

function Put-Key {
  param([string]$Key, [string]$FilePath)

  if (!(Test-Path $FilePath)) {
    throw "Archivo no existe: $FilePath"
  }

  $json = Get-Content -Raw $FilePath

  $resp = curl.exe -s `
    -X POST "$BASE_URL/set/$Key" `
    -H "Authorization: Bearer $TOKEN" `
    -H "Content-Type: application/json" `
    --data-binary $json

  if ($resp -notmatch '"result":"OK"') {
    Write-Host "❌ ERROR -> $Key"
    Write-Host $resp
    exit 1
  }

  Write-Host "✅ OK -> $Key"
}

# Ping duro
$ping = curl.exe -s "$BASE_URL/ping?token=$TOKEN"
if ($ping -notmatch "PONG") {
  throw "Upstash no responde. Ping: $ping"
}

# Archivos raíz
Put-Key "cidef:keymap:v1"      "keymap_v1.json"
Put-Key "cidef:event_log:v1"   "event_log.json"
Put-Key "cidef:user_events:v1" "user_events.json"
Put-Key "cidef:user_state:v1"  "user_state.json"
Put-Key "cidef:router:v1"      "router_config_v1.json"

# Carpetas
$folders = @("mitos","fichas","Capa_comercial","capa_clientes")

foreach ($folder in $folders) {
  Get-ChildItem $folder -Filter *.json | ForEach-Object {
    $name = $_.BaseName
    $key  = "cidef:$($folder.ToLower()):v1:$name"
    Put-Key $key $_.FullName
  }
}

Write-Host "== SEED COMPLETO =="
