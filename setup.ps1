$ErrorActionPreference = 'Stop'

$appHome = Join-Path $env:USERPROFILE '.config\herdr-app'
$spacesSource = Join-Path $PSScriptRoot 'spaces-wsl'
$spacesTarget = Join-Path $appHome 'mods\spaces-wsl'
$menuSource = Join-Path $PSScriptRoot 'new-menu-wsl'
$menuTarget = Join-Path $appHome 'mods\new-menu-wsl'
$managerSource = Join-Path $PSScriptRoot 'wsl-manager'
$managerTarget = Join-Path $appHome 'mods\wsl-manager'
$layoutPath = Join-Path $appHome 'layouts\main-graph.json'
$tabsPath = Join-Path $appHome 'mods\tabs-graph\main.js'

foreach ($required in @($spacesSource, $menuSource, $managerSource, $layoutPath, $tabsPath)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Required Herdr file not found: $required" }
}

$layoutText = [IO.File]::ReadAllText($layoutPath)
$layout = $layoutText | ConvertFrom-Json
$pending = [System.Collections.Generic.Queue[object]]::new()
$pending.Enqueue($layout)
$panelBody = $null
$spacesBlock = $null
while ($pending.Count -gt 0) {
    $node = $pending.Dequeue()
    if ($node.id -eq 'panel-body') { $panelBody = $node }
    if ($node.id -eq 'spaces') { $spacesBlock = $node }
    foreach ($child in @($node.children)) {
        if ($null -ne $child) { $pending.Enqueue($child) }
    }
}
if ($null -eq $panelBody) { throw 'Could not find the panel-body stack in main-graph.json' }
if ($null -eq $spacesBlock) { throw 'Could not find the Spaces block in main-graph.json' }
$spacesBlock.content.mod = 'spaces-wsl'
$panelChildren = @($panelBody.children)
$panelBody.children = @($panelChildren | Where-Object { $_.id -ne 'wsl-manager' })
$updatedLayout = ConvertTo-Json -InputObject $layout -Depth 100

$tabsText = [IO.File]::ReadAllText($tabsPath)
$enabledWithWsl = 'const enabled = [...(shared("workspace.panels") ?? ["files", "changes"]), "graph", "wsl-manager"];'
$enabledBase = 'const enabled = [...(shared("workspace.panels") ?? ["files", "changes"]), "graph"];'
if ($tabsText.Contains($enabledWithWsl)) { $tabsText = $tabsText.Replace($enabledWithWsl, $enabledBase) }
elseif ($tabsText -notmatch 'const enabled = .*"graph"') { throw 'Could not find the panel list in tabs-graph/main.js' }
$tabsText = $tabsText.Replace('.child(panelButton("wsl-manager", "WSL", "mods/files-lazyvim/folder.svg"))', '')
$oldMenuCall = 'openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })'
$newMenuCall = 'openOverlay({ mod: "new-menu-wsl", kind: "popup", width: 250, height: 512 })'
if ($tabsText.Contains($oldMenuCall)) { $tabsText = $tabsText.Replace($oldMenuCall, $newMenuCall) }
elseif (-not $tabsText.Contains('mod: "new-menu-wsl"')) { throw 'Could not find the + menu call in tabs-graph/main.js' }

$backupTag = Get-Date -Format 'yyyyMMdd-HHmmss'
$layoutBackup = "$layoutPath.bak-wsl-manager-$backupTag"
$tabsBackup = "$tabsPath.bak-wsl-manager-$backupTag"
Copy-Item -LiteralPath $layoutPath -Destination $layoutBackup
Copy-Item -LiteralPath $tabsPath -Destination $tabsBackup

try {
    New-Item -ItemType Directory -Force -Path $spacesTarget | Out-Null
    Copy-Item -Path (Join-Path $spacesSource '*') -Destination $spacesTarget -Recurse -Force
    New-Item -ItemType Directory -Force -Path $menuTarget | Out-Null
    Copy-Item -Path (Join-Path $menuSource '*') -Destination $menuTarget -Recurse -Force
    New-Item -ItemType Directory -Force -Path $managerTarget | Out-Null
    Copy-Item -Path (Join-Path $managerSource '*') -Destination $managerTarget -Recurse -Force
    & herdr-app check $spacesTarget
    if ($LASTEXITCODE -ne 0) { throw 'Spaces WSL mod check failed; layout files were not changed.' }
    & herdr-app check $menuTarget
    if ($LASTEXITCODE -ne 0) { throw 'WSL menu mod check failed; layout files were not changed.' }
    & herdr-app check $managerTarget
    if ($LASTEXITCODE -ne 0) { throw 'WSL manager mod check failed; layout files were not changed.' }

    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText($layoutPath, $updatedLayout, $utf8)
    [IO.File]::WriteAllText($tabsPath, $tabsText, $utf8)
} catch {
    Copy-Item -LiteralPath $layoutBackup -Destination $layoutPath -Force
    Copy-Item -LiteralPath $tabsBackup -Destination $tabsPath -Force
    throw
}

Write-Host 'WSL spaces are grouped in the sidebar; use the server button beside Spaces to manage WSL.' -ForegroundColor Green
Write-Host "Backups: $layoutBackup`n         $tabsBackup"
