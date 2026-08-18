# `blackbeatbeast/RPG-neverlight` へ公開する

公開先は作成済みだ。

- Repository: `blackbeatbeast/RPG-neverlight`
- Branch: `main`
- 作成時点の公開設定は`public`。公開スクリプトはvisibilityを変更しない
- 既存ファイルを無条件に上書きしない

## Windows：ダブルクリックだけで公開

ZIPを展開し、ルートにある次のファイルをダブルクリックする。

```text
PUBLISH_RPG_NEVERLIGHT.cmd
```

ランチャーは次を自動で行う。

1. GitとGitHub CLIを確認し、なければ`winget`で導入する。
2. GitHub認証がなければブラウザ認証を開く。
3. 設計ファイルを検証する。
4. `blackbeatbeast/RPG-neverlight`の`main`を一時領域へcloneする。
5. GitHub側が、納品版と同一の`README.md`だけであることを照合する。
6. 残りの設計・Codex Skills・バックログを1コミットで追加する。
7. `main`へ通常pushする。force pushは使わない。
8. `backlog/001`～`015`を重複チェック付きでGitHub Issue化する。
9. 一時領域を削除する。

アクセストークンをコピーして貼る必要はない。GitHubのブラウザ認証だけでよい。

### 安全停止する条件

次の場合は、何も上書きせず停止する。

- GitHub側の`README.md`が納品版と異なる
- GitHub側に未知の既存ファイルがある
- ログイン中のGitHubアカウントが`blackbeatbeast`ではない
- 検証、コミット、pushのいずれかが失敗する

途中で止まっても、もう一度ランチャーを実行できる。Issue作成はタイトルを照合するため、通常は重複しない。

## PowerShellから実行する場合

```powershell
.\scripts\publish-to-github.ps1
```

Issueをまだ作らない場合：

```powershell
.\scripts\publish-to-github.ps1 -SkipIssues
```

## macOS / Linux

Git、GitHub CLI、Node.jsを用意したうえで次を実行する。

```bash
./scripts/publish-to-github.sh
```

Issue作成を飛ばす場合：

```bash
SKIP_ISSUES=1 ./scripts/publish-to-github.sh
```

## 公開後にCodexへ渡す最初の指示

```text
AGENTS.md と CODEX_START_HERE.md を読み、
backlog/001-bootstrap-monorepo.md だけを実装してください。

指定されたSkillsだけを使用し、
受け入れ条件と実行するテストを先に整理してください。
検証結果を出した時点で停止し、次のIssueには進まないでください。
```

実装は必ず`001`から順に、原則として「1 Issue = 1 branch = 1 Pull Request」で進める。
