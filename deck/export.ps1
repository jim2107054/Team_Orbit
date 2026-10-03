param(
  [Parameter(Mandatory=$true)][string]$Pptx,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [int]$Width = 1600
)

$Pptx   = (Resolve-Path $Pptx).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

# Clear stale renders so a shorter deck cannot leave old slides behind.
Get-ChildItem -Path $OutDir -Filter '*.png' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

$ppt = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  # msoTrue = 1 on Visible; PowerPoint refuses to run fully hidden.
  $pres = $ppt.Presentations.Open($Pptx, $true, $false, $false)   # ReadOnly, Untitled, WithWindow=false

  $sw = $pres.PageSetup.SlideWidth
  $sh = $pres.PageSetup.SlideHeight
  $h  = [int][math]::Round($Width * $sh / $sw)

  Write-Output ("slides={0} canvas={1}x{2}pt export={3}x{4}px" -f $pres.Slides.Count, $sw, $sh, $Width, $h)

  foreach ($s in $pres.Slides) {
    $n = '{0:D2}' -f $s.SlideIndex
    $s.Export("$OutDir\slide-$n.png", 'PNG', $Width, $h)
  }
  $pres.Close()
  Write-Output "OK exported to $OutDir"
}
catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  exit 1
}
finally {
  if ($ppt) { $ppt.Quit() | Out-Null; [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
