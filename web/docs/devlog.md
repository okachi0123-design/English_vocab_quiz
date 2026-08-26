# 開発ログ - English Vocab Quiz Web

# 全体方針
- 現状のVPS,Localhost基盤のCLI版から,AWS基盤のGUIWeb版に変更する。
- データをCSVファイルからPostgreSQLに変更する
- VPS上でWebアプリを動く状態にし、それをAWSに移行する
- WebアプリはFastAPI，Pythonをメインで使う
- 開発順序は　Pythonコード→DB設計→DB接続→フロントエンド(AI使用)→フロントエンド接続→VPSデプロイで行う
- クイズアプリのURLの流れ　`get("/")`でトップ画面と挑戦するかを聞く→挑戦するを押すと`post("/attempt")`を開いて挑戦数を受け取る→DBから問題を受け取る→クイズ→採点→結果通知
## 目的
- AWS移行学習
- Webアプリ開発学習
- データベース設計学習
## Web版の構成

## 使用技術

## データベース方針

## API方針

## 開発環境

## デプロイ方針

## VPSからAWSへの移行方針

