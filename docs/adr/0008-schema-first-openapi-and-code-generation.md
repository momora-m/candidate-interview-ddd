# ADR-0008: Schema-First (OpenAPI 3.1) アプローチと openapi-typescript による型自動生成

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-17

## コンテキスト (Context)
バックエンド（Hono API サーバー）とフロントエンド（React / 外部クライアント）間の通信仕様において、以下の2つのアプローチを比較検討した：

- **案1: Code-First アプローチ**: TypeScript のコードやフレームワーク（Zod など）から OpenAPI スキーマを逆生成する。
- **案2: Schema-First (Contract-First) アプローチ**: `openapi.yaml`（OpenAPI 3.1 仕様書）を唯一の信頼できる情報源（Single Source of Truth）として手動記述・設計し、そこから TypeScript のリクエスト・レスポンス型定義を自動生成（Code Generation）する。

## 決定事項 (Decision)
**案2（Schema-First アプローチ）を採用する。**

1. **API 仕様の単一正（Single Source of Truth）**:
   - `docs/openapi/openapi.yaml` にすべてのパス、HTTP メソッド、パラメータ、リクエストボディ、ステータスコード（200, 201, 400, 404, 409 等）、およびエラーレスポンススキーマを厳密に定義する。
2. **`openapi-typescript` による型自動生成**:
   - `npm run generate:types` コマンドにより、`docs/openapi/openapi.yaml` から完全な TypeScript 型定義 `src/api/generated/schema.d.ts` およびヘルパー型 `src/api/generated/types.ts` を自動生成する。
   - バックエンドのハンドラー、ユースケース DTO、およびフロントエンドの API クライアントは、この自動生成型を参照・準拠する。
3. **OpenAPI 仕様配信と Swagger UI の内包**:
   - Hono サーバーは `GET /openapi.yaml` で仕様書本体を配信し、`GET /docs` で Swagger UI を直接提供してブラウザ上で即座に対話テスト可能にする。

```
[ docs/openapi/openapi.yaml ]  (Single Source of Truth)
           │
           ├──▶ openapi-typescript ──▶ [ src/api/generated/schema.d.ts ]
           │                                 │
           │                                 ├──▶ Backend Routes & DTOs
           │                                 └──▶ Frontend API Client
           │
           └──▶ Hono API Server ──▶ GET /openapi.yaml & GET /docs (Swagger UI)
```

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **仕様と実装の完全一致**: API のインターフェース変更時はまず OpenAPI 仕様を修正し、コンパイルエラーを修正していく堅牢な開発フローが確立する。
  - **フロントエンド ↔ バックエンドの完全な型安全性**: 手動での二重型定義（TypeScript インターフェースの複製）によるタイポや食い違いバグを完全に排除できる。
  - **外部連携・ドキュメント性**: OpenAPI 仕様書があることで、モックサーバー生成（MSW 等）、クライアント SDK 生成、Swagger UI 閲覧が即座に利用可能。
- **トレードオフ**:
  - 仕様変更時に `npm run generate:types` の実行ステップが必要となる。
