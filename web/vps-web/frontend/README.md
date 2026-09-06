# English Vocab Quiz Frontend

FastAPIのクイズAPIに接続するReactフロントエンドです。

## 開発環境

```bash
cp .env.example .env
npm install
npm run dev
```

`.env` の `VITE_API_BASE_URL` にAPIのベースURLを設定してください。デフォルトの例は `http://localhost:8000/api` です。

開発サーバーは通常 `http://localhost:5173` で起動します。別ポートのFastAPIへ接続するため、バックエンド側ではこのオリジンを許可するCORS設定が必要です。

## ビルド

```bash
npm run build
```
