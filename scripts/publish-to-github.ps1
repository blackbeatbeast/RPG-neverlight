[CmdletBinding()]
param(
    [string]$Owner = "blackbeatbeast",
    [string]$Repo = "RPG-neverlight",
    [switch]$SkipIssues,
    [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FullName = "$Owner/$Repo"
$KnownInitialReadmeBlob = "0f80ce68aa2a1e82541375461f476e21b862de75"

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Or-InstallCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$WingetId,
        [Parameter(Mandatory = $true)][string]$DisplayName
    )

    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        return
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "$DisplayName が見つからない。Microsoft Store の『アプリ インストーラー』を有効にするか、$DisplayName を手動でインストールしてから再実行してね。"
    }

    Write-Step "$DisplayName をインストール"
    & winget install --id $WingetId --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "$DisplayName の自動インストールに失敗した。終了コード: $LASTEXITCODE"
    }

    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$DisplayName はインストールされたが、この画面では認識できなかった。いったん閉じて PUBLISH_RPG_NEVERLIGHT.cmd をもう一度実行してね。"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Program,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )

    & $Program @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "コマンドに失敗した: $Program $($ArgumentList -join ' ') (終了コード $LASTEXITCODE)"
    }
}

function Test-BlueprintAlreadyPresent {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (
        (Test-Path (Join-Path $Path "AGENTS.md")) -and
        (Test-Path (Join-Path $Path "CODEX_START_HERE.md")) -and
        (Test-Path (Join-Path $Path "backlog/001-bootstrap-monorepo.md")) -and
        (Test-Path (Join-Path $Path ".agents/skills/product-vision-keeper/SKILL.md"))
    )
}

function Assert-SafeInitialRemote {
    param([Parameter(Mandatory = $true)][string]$ClonePath)

    $tracked = @(& git -C $ClonePath ls-tree -r --name-only HEAD)
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub 側の main ブランチを確認できなかった。"
    }

    if ($tracked.Count -eq 0) {
        return
    }

    if ($tracked.Count -eq 1 -and $tracked[0] -eq "README.md") {
        $sourceReadme = Join-Path $SourceRoot "README.md"
        $remoteReadme = Join-Path $ClonePath "README.md"
        if (-not (Test-Path $sourceReadme) -or -not (Test-Path $remoteReadme)) {
            throw "README.md の照合に失敗した。"
        }

        $remoteBlob = (& git -C $ClonePath rev-parse "HEAD:README.md").Trim()
        if ($LASTEXITCODE -ne 0 -or -not $remoteBlob) {
            throw "GitHub 側 README.md の識別子を取得できなかった。"
        }

        $sourceText = [IO.File]::ReadAllText($sourceReadme).Replace("`r`n", "`n")
        $remoteText = [IO.File]::ReadAllText($remoteReadme).Replace("`r`n", "`n")
        $sameText = ($sourceText -eq $remoteText)
        $knownInitializer = ($remoteBlob -eq $KnownInitialReadmeBlob)
        if (-not $sameText -and -not $knownInitializer) {
            throw "GitHub 側の README.md が納品時に作成した既知の内容と異なるため、安全のため停止した。手動で内容を確認してね。"
        }
        return
    }

    throw "GitHub 側に README.md 以外の既存ファイルがあるため、安全のため停止した。既存内容は一切上書きしていない。"
}

function Copy-Blueprint {
    param([Parameter(Mandatory = $true)][string]$Destination)

    Get-ChildItem -LiteralPath $SourceRoot -Force | Where-Object { $_.Name -notin @(".git", "node_modules", ".publish-work") } | ForEach-Object {
        $target = Join-Path $Destination $_.Name
        if ($_.PSIsContainer) {
            Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
        } else {
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }
    }
}

Set-Location $SourceRoot

Write-Step "必要なツールを確認"
Require-Or-InstallCommand -Name "git" -WingetId "Git.Git" -DisplayName "Git"
Require-Or-InstallCommand -Name "gh" -WingetId "GitHub.cli" -DisplayName "GitHub CLI"

Write-Step "GitHub 認証を確認"
& gh auth status --hostname github.com 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ブラウザが開くので、blackbeatbeast の GitHub で許可してね。アクセストークンを貼り付ける必要はないよ。" -ForegroundColor Yellow
    Invoke-Checked -Program "gh" -ArgumentList @("auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web")
}
Invoke-Checked -Program "gh" -ArgumentList @("auth", "setup-git")

$login = (& gh api user --jq .login).Trim()
if ($LASTEXITCODE -ne 0 -or -not $login) {
    throw "GitHub のログインユーザーを確認できなかった。"
}
if ($login -ne $Owner) {
    throw "現在の GitHub ログインは '$login' だが、公開先は '$Owner' だ。blackbeatbeast でログインし直してね。"
}

Write-Step "設計ファイルを検証"
if (-not $SkipValidation) {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Invoke-Checked -Program "node" -ArgumentList @("scripts/validate-blueprint.mjs")
    } else {
        $required = @(
            "README.md",
            "AGENTS.md",
            "CODEX_START_HERE.md",
            "PROJECT_PLAN_JA.md",
            "backlog/001-bootstrap-monorepo.md",
            ".agents/skills/product-vision-keeper/SKILL.md",
            "scripts/create-github-issues.ps1"
        )
        foreach ($relative in $required) {
            if (-not (Test-Path (Join-Path $SourceRoot $relative))) {
                throw "必須ファイルがない: $relative"
            }
        }
        Write-Host "Node.js がないため簡易検証を実施した。納品時の完全検証は通過済みだよ。" -ForegroundColor Yellow
    }
}

Write-Step "公開先リポジトリを確認: $FullName"
& gh repo view $FullName --json nameWithOwner,defaultBranchRef,visibility 1>$null
if ($LASTEXITCODE -ne 0) {
    throw "GitHub リポジトリ $FullName を確認できなかった。URLと権限を確認してね。"
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("RPG-neverlight-publish-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
    Write-Step "GitHub の main ブランチを安全な作業領域へ取得"
    Invoke-Checked -Program "gh" -ArgumentList @("repo", "clone", $FullName, $tempRoot, "--", "--branch", "main", "--single-branch")

    if (Test-BlueprintAlreadyPresent -Path $tempRoot) {
        Write-Host "設計一式はすでに GitHub に入っている。重複コミットは作らなかったよ。" -ForegroundColor Green
    } else {
        Assert-SafeInitialRemote -ClonePath $tempRoot

        Write-Step "設計一式を追加"
        Copy-Blueprint -Destination $tempRoot

        $userId = (& gh api user --jq .id).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $userId) {
            throw "GitHub ユーザーIDを確認できなかった。"
        }
        Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "config", "user.name", $login)
        Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "config", "user.email", "$userId+$login@users.noreply.github.com")
        Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "add", "--all")
        foreach ($shellScript in @("scripts/create-github-issues.sh", "scripts/publish-to-github.sh")) {
            if (Test-Path (Join-Path $tempRoot $shellScript)) {
                Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "update-index", "--chmod=+x", "--", $shellScript)
            }
        }

        & git -C $tempRoot diff --cached --quiet
        if ($LASTEXITCODE -eq 0) {
            Write-Host "追加差分がないため、コミットは作らなかったよ。" -ForegroundColor Yellow
        } elseif ($LASTEXITCODE -eq 1) {
            Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "commit", "-m", "docs: add Project Neverlight blueprint and Codex skills")
            Write-Step "main ブランチへプッシュ"
            Invoke-Checked -Program "git" -ArgumentList @("-C", $tempRoot, "push", "origin", "main")
        } else {
            throw "Git差分の確認に失敗した。"
        }
    }

    if (-not $SkipIssues) {
        Write-Step "Codex用バックログIssueを作成"
        & (Join-Path $SourceRoot "scripts/create-github-issues.ps1") -Owner $Owner -Repo $Repo
    }

    Write-Host "`n公開完了: https://github.com/$FullName" -ForegroundColor Green
    if ($SkipIssues) {
        Write-Host "Issue作成はスキップした。"
    } else {
        Write-Host "設計ファイルとCodex用Issueの準備が整ったよ。"
    }
}
finally {
    if (Test-Path $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
