# 一键安装 rustsilk-skills 仓库内全部 Skill（目录名 = 技能名，均为 rs-<主题名>）
# 用法:
#   .\scripts\install.ps1                 # 用户级 Cursor（默认）
#   .\scripts\install.ps1 -Target Codex
#   .\scripts\install.ps1 -Target Claude
#   .\scripts\install.ps1 -Target Project   # 项目级 .cursor\skills
#   .\scripts\install.ps1 -All              # Cursor + Codex + Claude

param(
    [ValidateSet("Cursor", "Codex", "Claude", "Project")]
    [string]$Target = "Cursor",
    [switch]$All
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Install-Skills {
    param([string]$DestBase)

    # 目录名 = 技能名 = SKILL.md 的 name，新增 Skill 只需追加一个名字
    $skills = @("rs-easy-query", "rs-mybatis-plus", "rs-rec-video")

    New-Item -ItemType Directory -Force -Path $DestBase | Out-Null

    foreach ($name in $skills) {
        $src = Join-Path $Root $name
        $dest = Join-Path $DestBase $name
        if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
        Copy-Item -Recurse $src $dest
        Write-Host "  OK $name -> $dest"
    }
}

function Get-DestBase {
    param([string]$Platform)

    switch ($Platform) {
        "Cursor" { return Join-Path $env:USERPROFILE ".cursor\skills" }
        "Codex" {
            $codex = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
            return Join-Path $codex "skills"
        }
        "Claude" { return Join-Path $env:USERPROFILE ".claude\skills" }
        "Project" { return Join-Path $Root ".cursor\skills" }
    }
}

Write-Host "rustsilk-skills 安装脚本"
Write-Host "仓库: $Root"
Write-Host ""

if ($All) {
    foreach ($p in @("Cursor", "Codex", "Claude")) {
        Write-Host ">>> 安装到 $p ..."
        Install-Skills (Get-DestBase $p)
    }
} else {
    Write-Host ">>> 安装到 $Target ..."
    Install-Skills (Get-DestBase $Target)
}

Write-Host ""
Write-Host "完成。请重启 Cursor / 重新加载窗口使 Skill 生效。"
if ($Target -eq "Project") {
    Write-Host "项目级路径: $(Join-Path $Root '.cursor\skills')（请提交到 git 以便团队共用）"
}
