# DEV-MEMO: growi-blume-sitegen

## プロジェクト概要

**growi-blume-sitegen** は、`content/pages/**/*.mdx` を単一ソースとして、Blume で静的サイト（GitHub Pages）を生成し、同時に GROWI へページ一括投稿できる CLI ツール。

- **リポジトリ名**: `growi-blume-sitegen`
- **npm パッケージ名**: `growi-blume-sitegen`
- **CLI コマンド名**: `growi-blume-sitegen`
- **設定ファイル**: `growi-blume-sitegen.config.yml` (YAML)

## アーキテクチャ決定一覧

### データモデル（単一ソース）

```
content/
├── pages/          # MDX ソース (Blume content.root)
│   ├── index.mdx
│   └── docs/intro.mdx
└── assets/         # GROWI 添付ファイル（画像/PDF等）
    └── images/a.png
```

- Markdown: **MDX** を使用するが、React コンポーネント等は使わず拡張 Markdown として扱う
- 最終的に .md として出力（growi-uploader は .md のみスキャン）
- assets 参照は `/assets/...`（先頭スラッシュあり絶対パス）で書く

### ページパス生成ルール

- `content/pages/<rel>.mdx` → GROWI ページパス: `/<parentPagePath>/<rel>`
  - 例: `content/pages/docs/intro.mdx` → `/MyDocs/docs/intro`
- 拡張子除去、相対パスから自動生成
- ページリンク置換は当ツールで事前に行う（growi-uploader は拡張子除去のみ行う）

### アセット（添付）の扱い

- 命名規約: growi-uploader 準拠 (`<page>_attachment_<filename>`)
- アセット参照 `/assets/images/a.png` → GROWI 用にリネームコピーし命名規約として配置
- 参照元ページに紐づけ（growi-uploader の命名規約検出 or リンク検出に任せる）

### リンク変換ルール

| 対象 | 変換前 | 変換後 (GROWI) |
|------|--------|----------------|
| ページリンク | `./docs/intro` | `/MyDocs/docs/intro` |
| アセット参照 | `/assets/images/a.png` | `./<rel>_attachment_a.png` (→ growi-uploader が `/attachment/{id}` に置換) |

- 外部URL (`http://`, `https://`) は変換しない
- 表示テキストは維持（URL のみ置換）

### GROWI 連携方式

- **growi-uploader を CLI サブプロセス呼び出し**
  - `npx @onozaty/growi-uploader <source-dir> -c <config>`
- 変換済みファイルは `content/.generated/growi/` に出力
  - `content/.generated/growi/<rel>.md`（拡張子 .md）
  - `content/.generated/growi/<rel>_attachment_<file>`（アセット）
- 一時的な `growi-uploader.json` を生成して渡す（方式A）

### Blume 連携

- `content.root = "content/pages"` と設定
- `public/` ディレクトリに `content/assets/` を同期（symlink or copy）してサイトビルド時参照可能に
- `blume.config.ts` の `deployment.site`, `deployment.base` はユーザー設定

### GitHub Pages デプロイ

- GitHub Actions で `main` ブランチへの push 時に自動デプロイ
- `build` のみ実行（upload は手動 or 別ワークフロー）
- 既存 blume-pe のワークフローを流用

### コマンド設計

| コマンド | 処理 |
|----------|------|
| `growi-blume-sitegen build` | Blume ビルド実行（public/ 同期含む）→ `dist/` |
| `growi-blume-sitegen upload` | MDX→GROWI 変換 + growi-uploader CLI 実行 |
| `growi-blume-sitegen release` | build → upload を直列実行 |

## ディレクトリ構造

```
growi-blume-sitegen/
├── .github/workflows/
│   └── deploy.yml
├── content/
│   ├── pages/
│   │   ├── index.mdx
│   │   └── docs/...
│   └── assets/
│       └── images/...
├── public/                  # Blume 静的アセット
│   └── assets/ → ../content/assets/
├── src/
│   ├── config.ts            # YAML 設定読み込み
│   ├── index.ts             # CLI エントリポイント (commander)
│   └── transform/
│       ├── buildPageIndex.ts
│       ├── buildAssetIndex.ts
│       └── transformMdxToGrowi.ts
├── scripts/
│   ├── build-site.ts
│   └── upload-growi.ts
├── blume.config.ts
├── growi-blume-sitegen.config.yml
├── package.json
├── tsconfig.json
└── .gitignore
```

## 既知の課題とトラブルシューティング

### ページタイトルの重複（修正済み）

- **原因**: Blume が MDX の最初の `# Heading` をページタイトルとして自動生成するが、content 内の `# Heading` もそのままレンダリングされるため、`<h1>` が2重に出力されていた
- **修正**: 全ページから `# Heading` を削除し、代わりに `title` フロントマターを追加。Blume 公式ドキュメントと同様のパターンに統一
  - フロントマター: `---\ntitle: ページタイトル\n---`
  - Content は `## Section Heading`（h2）から開始
- **GROWI への影響なし**: `stripMdxSyntax` がフロントマターを自動除去する

### GitHub Actions: Node.js 20 非推奨（修正済み）

- **原因**: 2026年6月2日以降、GitHub Actions が Node.js 20 actions を強制的に Node.js 24 で実行。旧バージョン（`@v4`）が正常動作しなかった
- **修正**: 以下の action を最新に更新
  | Action | 旧 | 新 |
  |--------|-----|-----|
  | `checkout` | `@v4` | `@v7` |
  | `setup-node` | `@v4` | `@v7` |
  | `configure-pages` | `@v4` | `@v6` |
  | `upload-pages-artifact` | `@v3` | `@v5` |
  | `deploy-pages` | `@v4` | `@v5` |

### `npx blume build` → `npm exec blume build`

- CI 環境で `npx` がハングする可能性があるため `npm exec` に変更（`src/build-site.ts`）

## 未確定・将来検討

- （なし。28回のQ&A + GitHub Pages 検討で全決定済み）
