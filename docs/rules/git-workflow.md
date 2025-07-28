# Git ワークフロー標準

このドキュメントは、zosqlプロジェクトにおけるGitの使用ルールと標準ワークフローを定義します。

## 基本原則

### ブランチ戦略
- **メインブランチ**: `main` または `master`
- **開発ブランチ**: 機能別にブランチを作成
- **ホットフィックス**: 緊急修正用ブランチ

### コミットの原則
- **小さく頻繁にコミット**: 論理的な単位でコミット
- **意味のあるコミット**: 1つのコミットで1つの変更内容
- **品質保証**: コミット前に必ず品質チェック実行

## コミットメッセージ規約

### 基本フォーマット（英語で記述）
```
type: brief description (50 characters or less)

Detailed explanation (if necessary)
- Reason for change
- Impact scope
- Notes

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 種別の分類
- `feat`: 新機能追加
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント変更
- `style`: コードスタイル修正（動作に影響なし）
- `test`: テスト追加・修正
- `chore`: ビルド・設定ファイル変更

### 例
```bash
feat: add CTE dependency analysis functionality

Implement automatic detection of WITH clause dependencies and optimize execution order
- Use SelectQueryParser for AST analysis
- Handle circular dependency errors
- Performance improvement: 30% faster for large queries

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 開発ワークフロー

### 前提: worktree環境
このプロジェクトではworktreeを使用してブランチ管理を行います：
- **ブランチ作成**: コマンドラインでworktreeとして作成済み
- **VSCode起動時**: 既に作業ブランチが設定されている
- **作業環境**: mainブランチと作業ブランチが分離

### 1. 現在のブランチ確認
```bash
# 現在のブランチを確認（重要）
git branch

# mainブランチにいる場合は作業禁止
# 作業ブランチにいることを確認してから開発開始
```

### 2. 開発・コミット（作業ブランチでのみ実行）
```bash
# 変更を確認
git status
git diff

# 品質チェック実行（必須）
tsc --noEmit
npm run lint
npm run test:run

# ステージング
git add .

# コミット
git commit -m "feat: add new functionality

Detailed explanation...

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 3. プッシュ・プルリクエスト
```bash
# リモートにプッシュ
git push origin current-branch

# プルリクエスト作成（GitHub CLI）
gh pr create --title "Add new functionality" --body "$(cat <<'EOF'
## Summary
Brief overview of the functionality

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests executed
- [ ] Integration tests confirmed
- [ ] Manual testing completed

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

## 品質保証

### コミット前チェック（必須）
```bash
# 段階的品質チェック
tsc --noEmit               # TypeScriptエラー: 0件
npm run lint               # Lintエラー: 0件
npm run test:run           # テスト: 全件合格
npm run build              # ビルド: 成功
```

### プルリクエスト前チェック
```bash
# 最新のメインブランチをマージ
git checkout main
git pull origin main
git checkout feature/branch-name
git merge main

# 競合解決後、再度品質チェック
tsc --noEmit && npm run lint && npm run test:run && npm run build
```

## マージ戦略

### コンフリクト解決フロー
コンフリクトが発生した場合の標準的な解決手順：

```bash
# 1. コンフリクトありの状態で一度コミット（解決前の記録）
git add .
git commit -m "feat: implement feature with merge conflicts

Note: This commit contains unresolved merge conflicts.
Will be resolved in the next commit.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 2. コンフリクト解決（AI主導）
# - 自動解決可能な場合: AIが解決案を提示・実行
# - 解決困難な場合: ユーザーに確認を求める

# 3. 解決後のコミット（解決方法を履歴に残す）
git add .
git commit -m "fix: resolve merge conflicts

Resolution strategy:
- Kept current branch changes for feature logic
- Preserved main branch updates for shared utilities
- Manual review required for business logic conflicts

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### AI主導のコンフリクト解決
1. **自動解決**: 明確な優先度がある場合
   - 新機能 vs 古いコード → 新機能を採用
   - フォーマット変更 → 統一されたスタイルを採用
   
2. **ユーザー確認**: 判断が困難な場合
   - ビジネスロジックの競合
   - 異なるアプローチの実装
   - データ構造の変更

### プルリクエストのマージ
- **履歴保持**: コンフリクト解決の経緯を残すため通常のmergeを使用
- **squash**: 小さな修正のみの場合に限定
- **透明性**: 解決プロセスを履歴として保持

### マージ後のクリーンアップ
```bash
# worktree環境では自動クリーンアップ
# 手動削除は通常不要
```

## 禁止事項

### 絶対にやってはいけないこと
```bash
# ❌ メインブランチでの作業（最重要）
# mainブランチを開いている場合は即座に作業を停止
git branch  # → main の場合は作業禁止

# ❌ 強制プッシュ（共有ブランチ）
git push --force origin main  # 禁止

# ❌ 品質チェックなしのコミット
git commit -m "とりあえずコミット"  # 禁止

# ❌ 意味のないコミットメッセージ
git commit -m "fix"           # 禁止
git commit -m "更新"          # 禁止
git commit -m "WIP"           # 避ける
```

### worktree環境での注意事項
```bash
# ✅ 作業前の確認（必須）
git branch | grep '^\*'  # 現在のブランチが作業ブランチであることを確認

# ❌ mainブランチでの作業は絶対禁止
# → 別のworktreeディレクトリで作業するか、プロジェクトを閉じる
```

### 避けるべきパターン
```bash
# ❌ 巨大なコミット
git add . && git commit -m "大量の変更"

# ❌ コミット履歴の改変（共有後）
git rebase -i HEAD~5  # 共有後は避ける

# ❌ バイナリファイルのコミット
git add *.log *.tmp  # 避ける
```

## 緊急対応

### ホットフィックス手順
```bash
# メインブランチからホットフィックスブランチ作成
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 修正・テスト
# 品質チェック実行

# 緊急マージ
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# 開発ブランチにも反映
git checkout develop
git merge hotfix/critical-bug-fix
git push origin develop
```

### ロールバック手順
```bash
# 直前のコミットを取り消し
git revert HEAD

# 特定のコミットを取り消し
git revert <commit-hash>

# 複数コミットの取り消し
git revert HEAD~3..HEAD
```

## GitHub連携

### プルリクエストテンプレート
```markdown
## 概要
このプルリクエストの目的と概要

## 変更内容
- [ ] 機能追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新

## テスト
- [ ] 単体テスト追加・更新
- [ ] 統合テスト確認
- [ ] 手動テスト実行

## チェックリスト
- [ ] TypeScriptエラー: 0件
- [ ] Lintエラー: 0件
- [ ] テスト: 全件合格
- [ ] ビルド: 成功
- [ ] ドキュメント更新済み

## 関連Issue
Closes #123
```

### 自動化設定
```yaml
# .github/workflows/pr-checks.yml
name: PR Quality Checks
on:
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: TypeScript check
        run: tsc --noEmit
      - name: Lint check
        run: npm run lint
      - name: Test
        run: npm run test:run
      - name: Build
        run: npm run build
```

## ベストプラクティス

### 効率的な開発
1. **小さなブランチ**: 1-3日で完了する規模
2. **頻繁なコミット**: 作業の区切りでコミット
3. **わかりやすいメッセージ**: 未来の自分が理解できる内容
4. **レビューしやすいサイズ**: PR当たり200-400行程度

### チーム協力
1. **コードレビュー**: 必ず他メンバーのレビューを受ける
2. **知識共有**: 重要な変更は詳細に説明
3. **継続的改善**: ワークフローの問題は積極的に改善提案

### セキュリティ
1. **秘密情報の除外**: API キー、パスワードは絶対にコミットしない
2. **.gitignore活用**: 機密ファイルを適切に除外
3. **履歴のクリーニング**: 誤ってコミットした機密情報は完全削除

## トラブルシューティング

### よくある問題と解決方法

#### マージ競合
```bash
# 競合発生時
git merge main
# CONFLICT (content): Merge conflict in src/file.ts

# 手動解決後
git add src/file.ts
git commit -m "fix: マージ競合を解決"
```

#### 間違ったコミット
```bash
# 直前のコミットを修正
git commit --amend -m "正しいメッセージ"

# ファイルを追加してコミット修正
git add forgotten-file.ts
git commit --amend --no-edit
```

#### ブランチ間違い
```bash
# 間違ったブランチでコミットした場合
git log --oneline -n 5  # コミットハッシュ確認
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1  # 間違ったコミットを削除
```

## 更新履歴
- 2025-01-27: 初版作成