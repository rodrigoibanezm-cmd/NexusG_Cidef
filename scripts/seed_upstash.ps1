param(
  [Parameter(Mandatory=$true)]
  [string]$BASE_URL,

  [Parameter(Mandatory=$true)]
  [string]$TOKEN
)

$ErrorActionPreference = "Stop"

function Put-Key {
  param(
    [string]$Key,
    [string]$FilePath
  )

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
    Write-Host "❌ ERROR al subir $Key"
    Write-Host $resp
    exit 1
  }

  Write-Host "✅ OK -> $Key"
}

Write-Host "== TEST CONEXIÓN =="
$ping = curl.exe -s "$BASE_URL/ping?token=$TOKEN"
if ($ping -notmatch "PONG") {
  throw "No conecta a Upstash. Ping: $ping"
}
Write-Host "PONG OK"

Write-Host "== ARCHIVOS RAÍZ =="
Put-Key "cidef:keymap:v1"      "keymap_v1.json"
Put-Key "cidef:event_log:v1"   "event_log.json"
Put-Key "cidef:user_events:v1" "user_events.json"
Put-Key "cidef:user_state:v1"  "user_state.json"
Put-Key "cidef:router:v1"      "router_config_v1.json"

Write-Host "== CARPETAS =="

$folders = @(
  "mitos",
  "fichas",
  "Capa_comercial",
  "capa_clientes"
)

foreach ($folder in $folders) {
  Get-ChildItem $folder -Filter *.json | ForEach-Object {
    $name = $_.BaseName
    $key  = "cidef:$($folder.ToLower()):v1:$name"
    Put-Key $key $_.FullName
  }
}

Write-Host "== DONE =="
