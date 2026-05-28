# 開発ログ - English Vocab Quiz

LPIC学習と並行したPythonクイズアプリ開発の記録。設計判断・エラーと解決法・学んだことをまとめる。

## 設計方針

- Python: ExcelをCSVに変換する部品（wordqz.py, phraseqz.py）
- Shell: CSVを読んでクイズを出題する指揮役（quiz.sh 予定）
- Unix哲学「小さな部品を組み合わせる」を実践

## 制作過程・設計判断
###  言語・環境の選択
- 選択肢: Python / HTML・JS / Bash、環境は VirtualBox / WSL
- 決定: Python + WSL
- 理由: キャリア的にも次に来る言語。WSLはExcelが /mnt/c/ から直接読めて楽（VirtualBoxはホストとのファイル共有が面倒）

###  どこで動かすか
- 選択肢: ターミナル(CLI) / デスクトップ(GUI) / Web
- 決定: ターミナル版
- 理由: Python基礎が全部学べる、LPICと相性が良い。まず動くものを作り見た目は後回し

###  クイズの出題形式（一番悩んだ部分）
- 選択肢の変遷:
  1. 記述式（意味を入力）
  2. スペル並べ替え（文字をシャッフルして組み立て）
  3. スペルを1文字ずつ4択で組み立て
- 決定: 2モード（意味入力モード + スペル4択組み立てモード）
- 理由: 意味入力＝思い出す力、スペル組み立て＝書く力、両方を鍛えられる

###  アーキテクチャ（構成）
- 選択肢: 全部Python / 全部Shellscript / Python部品+Shellscript指揮
- 決定: Python（Excel→CSV変換）+ Shellscript（クイズ本体）
- 理由: Shellスクリプトを自分で書くことがLPIC学習に直結。Pythonは苦手なのでAIに任せ、Shellスクリプトは自分で書く

###  データの扱い
- 決定1: Excel直読みではなくCSV経由にする → シェルがIFSで分割しやすい
- 決定2: Excelパスを config.py に分離し .gitignore で除外
- 理由: Excelは人間用（編集）、CSVは機械用（処理）と役割分担。個人パスをGitHubに出さない。将来VPS移行時もパスだけ書き換えれば済む
