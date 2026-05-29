# 開発ログ - English Vocab Quiz

LPIC学習と並行したPythonクイズアプリ開発の記録。設計判断・エラーと解決法・学んだことをまとめる。

## 設計方針

- Python: ExcelをCSVに変換する部品（wordqz.py, phraseqz.py）
- Shell: CSVを読んでクイズを出題する指揮役（ask.sh）
- Unix哲学「小さな部品を組み合わせる」を実践

## 制作過程・設計判断

### 言語・環境の選択
- 選択肢: Python / HTML・JS / Bash、環境は VirtualBox / WSL
- 決定: Python + WSL
- 理由: キャリア的にも次に来る言語。WSLはExcelが /mnt/c/ から直接読めて楽（VirtualBoxはホストとのファイル共有が面倒）

### どこで動かすか
- 選択肢: ターミナル(CLI) / デスクトップ(GUI) / Web
- 決定: ターミナル版
- 理由: Python基礎が全部学べる、LPICと相性が良い。まず動くものを作り見た目は後回し

### クイズの出題形式（一番悩んだ部分）
- 選択肢の変遷:
  1. 記述式（意味を入力）
  2. スペル並べ替え（文字をシャッフルして組み立て）
  3. スペルを1文字ずつ4択で組み立て
- 決定: 2モード（意味入力モード + スペル4択組み立てモード）
- 理由: 意味入力＝思い出す力、スペル組み立て＝書く力、両方を鍛えられる
- 現状: まず意味入力モードを実装中

### アーキテクチャ（構成）
- 選択肢: 全部Python / 全部Shellscript / Python部品+Shellscript指揮
- 決定: Python（Excel→CSV変換）+ Shellscript（クイズ本体）
- 理由: Shellスクリプトを自分で書くことがLPIC学習に直結。Pythonは苦手なのでAIに任せ、Shellスクリプトは自分で書く

### データの扱い
- 決定1: Excel直読みではなくCSV経由にする → シェルがIFSで分割しやすい
- 決定2: Excelパスを config.py に分離し .gitignore で除外
- 理由: Excelは人間用（編集）、CSVは機械用（処理）と役割分担。個人パスをGitHubに出さない。将来VPS移行時もパスだけ書き換えれば済む

### 学習スタイル: 同じ機能を2バージョン作る
- wr_simplequiz.sh: 表示のみ（while readの練習）
- ask.sh: 答え合わせ機能付き（本番版）
- 段階的に機能を足すことで、各部品を理解しながら進められた

## 実装の進捗

### Python部品の完成
- wordqz.py: 単語ログをCSV出力
- phraseqz.py: フレーズログをCSV出力
- put.data.test.sh: 2つを呼び出してCSVを一括生成
- 動作: Excelに単語追加 → put.data.test.sh実行 → 最新CSV生成

### Shellクイズスクリプトの完成（ask.sh）
- 引数で出題数を受け取る（bash ask.sh 5 で5問）
- shufでランダム抽出、while IFS=',' read で1行ずつ単語と意味を取得
- read -p で意味を入力させ、if [ ] で正解判定
- 不正解時は正解を表示

## Troubleshooting

### venv（externally-managed-environment エラー）
- 問題: pip install で PEP668 エラー
- 原因: Ubuntu 24系はシステムPythonを保護している
- 解決: python3 -m venv .venv で仮想環境を作る

### GitHub push が email privacy で拒否
- 問題: push declined due to email privacy restrictions
- 原因: commitのメールがGitHubで非公開設定
- 解決: noreplyアドレスを git config に設定 → git commit --amend

### git push が rejected（fetch first）
- 問題: GitHub Webで作ったファイルがWSLになく、pushが拒否された
- 原因: リモートにローカルが持っていないcommitがある
- 解決: git config --global pull.rebase false → git pull → git push
- 教訓: 作業開始前に git pull する習慣をつける

### Pythonコード内にリダイレクト > を書いてSyntaxError
- 問題: print(...) > file.csv と書いてエラー
- 原因: > はシェルのコマンド。Pythonコード内では使えない
- 解決: 実行時に python wordqz.py > csv.d/word.csv とする

### シェルスクリプトのシバン誤り
- 問題: #!bin/bash と書いた
- 原因: 先頭のスラッシュが抜けていた
- 解決: #!/bin/bash が正しい

### $10は10番目の引数と解釈される
- 問題: seq 1 $10 で意図しない動作
- 原因: シェルは $10 を「10番目の引数」と読む（$1+"0"ではない）
- 解決: 出題数は $1 を使う

### head -i は存在しない
- 問題: head -i shuf.txt がエラー
- 原因: head の行数指定は -n。-i は存在しない
- 解決: そもそも1行ずつ処理は while read が定番

### cut で他フィールドが消える
- 問題: shuf | cut -f1 > a.txt の後、cut -f2 で意味が取れない
- 原因: パイプは使い捨て、元データが残らない
- 解決: 一度ファイルに保存してから複数回 cut、または while IFS read で一度に取り出す

### if [ ] のスペース忘れ
- 問題: if ["$answer" = "meaning"] が動かない
- 原因1: [ はコマンドなので前後にスペース必須
- 原因2: 比較に変数を使うには $ を付ける（"meaning"は文字列、"$meaning"が変数）
- 解決: if [ "$answer" = "$meaning" ]

### while read のループ内で read が CSV を食う
- 問題: ユーザー入力の前にCSVの次行が answer に入る
- 原因: done < shuf.txt でループ全体がファイル入力中、ループ内の read も同じソースから読む
- 解決: read -p "..." answer </dev/tty でキーボードから読むよう明示
- 教訓: bash -x でデバッグすると変数の中身が見えて原因特定が速い

## 学んだコマンド・概念

- shuf -n N file : ランダムにN行抽出
- cut -d',' -f1 : 区切り文字指定でフィールド抽出
- while IFS=',' read -r a b : 1行をカンマで分割して変数a,bに格納
- read -p "msg" var : プロンプト付き入力
- /dev/tty : 現在の端末（キーボード）を指す特殊ファイル
- if [ "$a" = "$b" ] : 文字列比較（スペース必須、変数は $ で囲む）
- bash -x script : 実行を1行ずつトレース表示（デバッグの定番）
- chmod +x : 実行権限を付与
- > と >> : 上書きと追記
- SSH鍵の用途別分離 : VPS用とGitHub用を分け、~/.ssh/config で使い分け
