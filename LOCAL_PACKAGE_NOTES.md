# ローカルパッケージ使用に関するメモ

## 現在の状況
- rawsql-tsの機能拡張（CTE依存関係ベースのワンライナー機能）をローカルで実装
- npm公開を待たずに開発を継続するため、ローカルパッケージを使用中

## ローカルパッケージの詳細
- パッケージファイル: `rawsql-ts-0.11.10-beta.tgz`
- package.json設定: `"rawsql-ts": "file:./rawsql-ts-0.11.10-beta.tgz"`

## npm公開版への切り戻し手順
rawsql-tsのPull Requestが正式採用されてnpm公開された後：

1. package.jsonを元に戻す：
   ```json
   "dependencies": {
     "rawsql-ts": "^0.11.11"  // 新しいバージョンに更新
   }
   ```

2. ローカルパッケージファイルを削除：
   ```bash
   rm rawsql-ts-0.11.10-beta.tgz
   ```

3. npm install実行：
   ```bash
   npm install
   ```

4. このドキュメントを削除：
   ```bash
   rm LOCAL_PACKAGE_NOTES.md
   ```

## 関連するrawsql-ts修正内容
- SqlFormatter.ts: cteOnelineDependency オプション追加
- SqlPrinter.ts: CTE依存関係ベースのワンライナー制御機能
- 新機能: 全CTEをワンライナー化 + 直接参照CTEにimportコメント追加