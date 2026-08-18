# 17 — Codexへ渡す実行指示（日本語コピペ用）

## 0. リポジトリを初めて開いたとき

```text
このリポジトリはProject Neverlightの設計済み開発リポジトリだ。
最初にAGENTS.md、config/product-constraints.yml、CODEX_START_HERE.mdを読み、
読み込んだ指示元と、絶対に変更してはいけない制約を要約して。
まだコード変更はしないこと。
```

## 1. 最初の実装Issueを開始するとき

```text
backlog/001-bootstrap-monorepo.mdだけを実装して。
使用するProject Skillsは次の3つだけだ。
- cloudflare-fullstack-engineer
- test-and-verification-engineer
- product-vision-keeper

作業前に以下を日本語で提示して。
1. 目的
2. 対象範囲と対象外
3. 変更予定ファイル
4. 受入条件
5. 実行する検証コマンド
6. 追加依存関係と、そのライセンス・無料運用への影響

その後、001だけを実装し、全検証結果を報告した時点で止まって。
002以降には着手しないこと。
```

## 2. 任意のIssueを実装するとき

```text
AGENTS.mdとbacklog/<対象ファイル>.mdを読み、対象Issueだけを実装して。
Issueに書かれたRequired Skillsだけを使用し、必要なら理由を示して1個だけ追加してよい。

作業前に、受入条件、危険な境界、変更予定ファイル、テスト計画を提示して。
実装後は次を必ず報告して。
- 何を変更したか
- 各受入条件をどう満たしたか
- 実行したコマンドと結果
- セキュリティ／重複防止への影響
- DB移行／復旧への影響
- 無料枠／負荷への影響
- スマホ／キーボード／読み上げへの影響
- R-15／年齢／画像権利への影響
- 既知の制限

次のIssueには進まないこと。
```

## 3. 戦闘実装専用

```text
backlog/005-deterministic-combat.mdを実装して。
browser-rpg-loop-designer、combat-and-loot-designer、
test-and-verification-engineer、security-and-abuse-guardianを使用して。

packages/game-coreは純粋関数だけにし、Math.random、現在時刻、DB、ネットワーク、
ファイル、環境変数へ依存させないこと。
同じrulesetVersion、state、seed、commandsなら、正規化した結果が完全に再現されるようにする。
敵を最低3種類の行動パターンで作り、攻撃連打以外が正解になるテストを含めて。
固定seed試験、リプレイ試験、無効コマンド、上限、再帰発動、10000回シミュレーションを実行して止まって。
```

## 4. UI実装専用

```text
backlog/002-retro-modern-shell.mdを実装して。
retro-modern-ui-designerとaccessibility-performance-auditorを使用して。

レトロとモダンでDOM構造、ページ、情報、操作、ゲームロジックを分けないこと。
360px、1280px、200%拡大、キーボードのみ、画像無効、reduced motionで確認して。
参照サイトのCSS、画像、枠、配色セット、ページ構成をコピーしないこと。
スクリーンショットとキーボード操作の確認記録を出して止まって。
```

## 5. 元ゲームの追加調査をさせるとき

```text
historical-game-researcherとclean-room-ip-guardianを使用して、
「<調べたい機能>」について公開史料を調査して。

事実、メーカー主張、推測を分け、公開URLと日付を記録して。
元ゲームの画像、文章、名称一覧、数式、マップ、データベース、コードを収集・復元しないこと。
最後に、調べた特徴をProject Neverlightで独自に表現する案を3つ出し、
provenance/RESEARCH_LOG.mdとdocs/SOURCES.mdの更新案を作って。
実装はしないこと。
```

## 6. R-15キャラクター／画像を作る前の指示

```text
character-content-directorとclean-room-ip-guardianを使用して、
<キャラクター名>のキャラクターシートと画像制作指示を作って。

canonical ageは20歳以上とし、職業、目的、恐れ、矛盾、友人・対立関係、ゲーム上の役割を先に作ること。
一般向け画像指示を完成させた後でのみ、必要なら非露骨な任意R-15差分を別に作ること。
能力差、報酬差、性的課金、年齢曖昧、露骨な裸や性行為は不可。
既存キャラクターや特定作家の絵柄を模倣せず、画像権利と制作履歴の記録項目も出して。
```

## 7. Pull Requestをレビューさせるとき

```text
このPull RequestをAGENTS.md、対象backlog、関連ADR、product-constraints.ymlに照らしてレビューして。

重大度順に、次を確認して。
- 受入条件の未達
- クライアント側で確定している戦闘／報酬／所持品
- 再送、二重押し、競合による複製
- 認証、権限、XSS、荒らし、費用攻撃
- DB移行と復旧不能
- 無料枠を超える無制限処理
- 360px、キーボード、読み上げ、画像無効の問題
- R-15境界、成人年齢、一般向け差分、画像権利
- 元作品または参照サイトの表現コピー
- 課金が戦闘、ドロップ、カード、市場へ混入していないか

問題がなければ、その根拠と残るリスクを示して。
修正コードは、選択した指摘だけに限定して。
```

## 8. 次のIssueを選ぶとき

```text
現在のmainブランチ、未解決Issue、検証結果を確認し、
docs/10_ROADMAP.mdとdocs/11_CODEX_WORKPLAN.mdに基づいて、
今着手できる最小のbacklogを1つだけ推薦して。
前提条件が不足するIssueは推薦しないで。
実装は開始せず、推薦理由、未充足ゲート、必要Skillsだけを答えて。
```
