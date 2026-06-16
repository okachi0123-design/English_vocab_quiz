# Troubleshooting（詳細版）

開発中に遭遇したエラーと解決法の詳細記録。コード・実行結果・解決策まで具体的に残す。
カテゴリ（Shell / Python / Git / VPS）ごとに分け、今後はそれぞれの末尾に追記していく。

フォーマット: 「問題のコード（該当箇所だけ）→ 実行結果/エラー → 問題点 → 解決 → 学んだこと」

---

# Shell

## 正しく head が実行できない

### 問題のコード
```bash
for i in `seq 1 $1`
do
        head -i shuf.txt
done
```

### 実行結果
```
head: invalid option -- 'i'
Try 'head --help' for more information.
```

### 問題点
- `$10` : シェルは「10番目の引数」と解釈する（`$1` + 文字 "0" ではない）
- `head -i` : `-i` オプションは存在しない（行数指定は `-n`）
- `head -n i` にしても `head: invalid number of lines: 'i'`（i が変数展開されていない）
- そもそも i を「1〜引数まで1ずつ」と認識していない
- head は指定行までを表示するので、2以降は前の行も含み重複する（head自体が不適）

### 解決
```bash
head -n "$i" shuf.txt          # -n の後を "$i" にして初めて代入と認識
head -"$i" shuf.txt | tail -1  # i行目までを出し tail -1 で1行に絞る
```
※ そもそも1行ずつ処理は `while read` が定番。

### 学んだこと
- head の行数指定は `-n`。`-i` は存在しない
- 変数は明示的に `"$i"` で展開する。リテラル i は数値と見なされない
- 「N行目だけ」が欲しいなら head 単体ではなく `head | tail -1`、または while read

---

## while read のループ内で2つ目の read が CSV を読み込む

### 問題のコード
```bash
while IFS=',' read -r word meaning
do
    read -p "意味： " answer
    if [ "$answer" = "$meaning" ]
    ...
done < shuf.txt
```

### bash -x で確認した実行結果
```
+ read -p '意味： ' answer
+ '[' memo,社内文書 = 付け加える、末尾に追加する／添付する ']'
```
`answer` にユーザー入力ではなくCSVの次の行が入っていた。

### 問題点
- `done < shuf.txt` でループ全体がファイルから読み込み中
- ループ内の `read` も同じ入力源から取ろうとする
- 結果、CSVの次の行が `answer` に入ってしまう

### 解決
```bash
read -p "意味： " answer </dev/tty
```
ループ内の `read` に `</dev/tty` を付けて、キーボードから読むよう明示。

### 学んだこと
- `</dev/tty` は「現在の端末（キーボード）」を指す
- リダイレクト中のループ内で対話入力したい時の定番テクニック
- `bash -x` で変数の展開が見えてバグ特定が一発でできる

---

## シェルとPythonの変数共有問題

### 問題のコード
```bash
if /tmp/ENquiz/word.csv -nt EXCEL_PATH
```

### 問題点
- `EXCEL_PATH` は config.py（Python）で定義された変数
- シェルからは見えない（言語が違うため）
- 比較対象が「EXCEL_PATH」という文字列リテラルとして扱われ、エラー

### 解決
シェル用にもパスを定義：
```bash
EXCEL_PATH="/mnt/c/Users/.../file.xlsx"
```

### 学んだこと
- Pythonの変数とシェルの変数は別世界
- 共有したいなら環境変数（export）か、別途定義する
- if文は [ ] で囲む、前後にスペース必須

---

## シェルスクリプトの不可視文字: 全角スペース混入

### 問題のコード
```bash
if [ -z "$answer" ]
　　　　      then echo "skip"      # ← インデントが全角スペース
```

### 実行結果
見た目のコードは正しいのに `syntax error near unexpected token 'else'`。

### 問題点
- インデントに全角スペース（U+3000）が混入
- IMEオンのまま空白キーを押すと混入する典型パターン
- bash は全角スペースを空白として扱わず**コマンド名の一部**と解釈
- 結果、`　　　　then` という存在しないコマンドを実行しようとして
  `if` の `then` が見つからず、後続の `else` で構文エラー

### 解決
```bash
# cat -A で不可視文字を可視化
$ cat -A ask.grp.sh
M-cM-^@M-^@M-cM-^@M-^@M-cM-^@M-^@M-cM-^@M-^@      then echo "skip"
# ↑ M-cM-^@M-^@ が全角スペース（U+3000）のUTF-8バイト列

# vim で一括置換
:%s/　/    /g

# または sed で
sed -i 's/　/    /g' ask.grp.sh
```
再発防止のため `.vimrc` に全角スペース可視化設定を追加：
```vim
highlight ZenkakuSpace ctermbg=Red guibg=Red
match ZenkakuSpace /　/
```

### 学んだこと
- bash は不可視文字に厳しい（CR `\r`、NUL `\0`、全角スペースは全部構文を壊す）
- `cat -A` は不可視文字の検出に最強（タブは `^I`、CRは `^M`、全角空白は `M-cM-^@M-^@`）
- 日本語環境でコード編集する時はIMEオフを徹底
- vim の `.vimrc` 設定で編集時にリアルタイム検出できる

---

## bc 渡し前に変数が空 (standard_in) 1: syntax error

### 問題のコード
```bash
# proto.ENquiz.sh の構造
correct=$(grep -c "正解" /tmp/ENquiz/answer.tmp)
bash "percentage.sh" $1
```

### 実行結果
```
(standard_in) 1: syntax error
問正解
%
```

### 問題点
- bash で別スクリプトを起動すると新しい子プロセスができる
- 親シェルで定義した `$correct` は子シェルには引き継がれない（空文字になる）
- bc に渡る式が「scale=1;  * 100 / 5」となり syntax error
- 同じ理由で「問正解」「%」の前後の変数も空のまま表示される

### 解決
percentage.sh の中で correct を再計算する（または引数/ファイルで渡す）。

### 学んだこと
- シェル変数は子プロセスに自動継承されない（同じシェル内で source すれば別）
- スクリプトを分割するときは「引数で渡す」「ファイル経由で渡す」「source で同じシェル」のどれかを選ぶ
- bc の syntax error が出たら、まず渡している式の中身を echo で確認

---

## grep -c の部分一致でカウントが重複

### 問題のコード
```bash
correct=$(grep -c "正解" /tmp/ENquiz/answer.tmp)
```

### 問題点
- 「正解」は「不正解」の部分文字列でもある
- grep は部分一致なので、「不正解」の行も「正解」としてマッチ
- 結果、全問正解扱いになってしまう

### 解決
結果マーカーを記号に変更：
```bash
# 旧
echo "正解"
echo "不正解"
# 新
echo "○"
echo "✕"
```

### 学んだこと
- grep の部分一致は「含まれる文字列同士」の関係で誤マッチする
- 集計対象のマーカーは「他の文字列の部分にならない」記号を選ぶと安全
- ○/✕ のような記号はそれ自体が独立した意味を持ち、誤マッチしにくい

---

## tee で対話入力プロンプトが壊れる

### 問題のコード
```bash
bash "test.grp.ENquiz.sh" $1 | tee /tmp/ENquiz/answer.tmp
```

### 実行結果
```
意味： detail         ← detail は次の単語名。本来は入力プロンプト
意味： skip
詳細
headquarters
skip                   ← 「意味：」プロンプトが出ていない
本社
```
入力プロンプトと単語表示のタイミングがズレ、ユーザーが入力できない問題が断続的に発生。

### 問題点
- tee へのパイプによりパイプライン全体の標準入出力が再構成される
- ask.grp.sh の `read -p "意味： "` は `</dev/tty` で stdin を端末に向けているが、
  stdout 側のバッファリングが tee 経由で変則的になる
- 結果、プロンプト表示と read の実行タイミングがズレる

### 解決（暫定→本採用）
パイプを外し、ask.ct.sh が判定ごとに結果（1/0 や ○/✕）を COUNT_FILE に直接書き込む。
集計（percentage.sh）はそのファイルだけ読む。

### 学んだこと
- 対話入力するスクリプトをパイプ（| tee 等）に繋ぐと干渉リスクがある
- 「出力を記録したい」だけなら、スクリプト内でファイルに直接書く方が安全

---

## continue が想定した場所に戻らない

### 問題のコード
```bash
while IFS=',' read -r word meaning
do
    read -p "意味： " answer </dev/tty
    if [ ${#answer} -lt 2 ]
       then continue        # 「同じ問題で再入力」を期待
    fi
done < shuf.txt
```

### 問題点
- `continue` は「最も内側のループの先頭」に戻る
- ここでの最内ループは `while IFS=',' read` だったため、
  次の単語の読み込みに進んでしまった（＝再入力ではなくスキップ）

### 解決
内側に `while true` ループを作り、その中で continue/break を使い分ける：
```bash
while IFS=',' read -r word meaning
do
    while true
    do
        read -p "意味： " answer </dev/tty
        if [ ${#answer} -lt 2 ]
           then continue          # 内ループ先頭＝同じ単語で再入力
           else 判定 ... ; break  # 次の単語へ
        fi
    done
done < shuf.txt
```

### 学んだこと
- continue / break は「最も内側のループ」に作用する
- 「単語を順に出す外ループ」と「1問の入力を試す内ループ」で責務を分けると、
  continue/break の作用範囲が明確になる

---

## ID認証で文字入力が「アカウントが見つかりません」と誤表示される

### 問題のコード
```bash
read -p "IDを入力してね" ID
if [ "$ID" -lt 1 -o "$ID" -gt 999 ] 2>/dev/null   # 異常条件で弾こうとした
   then echo "不正な入力です"
        continue
   else if [ ! -f "$HOME"/"$ID"_score ]
        ...
fi
```

### 実行結果
"a"（文字）を入力すると「不正な入力です」ではなく「アカウントが見つかりません」が出た。

### 問題点
- `-lt`/`-gt` は数値専用。"a" を渡すと `integer expression expected` でエラー（偽扱い）
- `2>/dev/null` はエラー表示を消すだけで、「文字を不正と判定」はしてくれない
- 異常条件 `[ ... -lt 1 -o ... -gt 999 ]` が偽になる → then を飛ばして else（登録チェック）へ流れる
- 結果、文字入力なのに「アカウントが見つかりません」と誤表示

### 解決
判定を「正常条件で通す」向きに変え、異常系をまとめて else で弾く：
```bash
if [ "$ID" -ge 1 -a "$ID" -le 999 ] 2>/dev/null
   then 登録チェック ...
   else echo "不正な入力です"      # 範囲外も文字エラーもここに集約
        continue
fi
```
代替案: read 直後に `[[ "$ID" =~ ^[0-9]+$ ]]` で先に数字チェックしてもよい。

### 学んだこと
- `-lt`/`-gt`/`-le`/`-ge` は数値専用。文字を渡すとエラー（偽）になる
- `2>/dev/null` は「エラー表示を消す」だけで判定は正してくれない
- 判定の向きを「正常なら通す（-ge/-le）」にすると、異常系（範囲外・型エラー）を
  ひとつの else に集約して弾ける
- または `[[ =~ ^[0-9]+$ ]]` で先に数字判定する

---

## ループ末尾の無条件 break で聞き直しができない

### 問題のコード
```bash
while true
do
    read -p "IDを入力してね" ID
    if [ "$ID" -ge 1 -a "$ID" -le 999 ] 2>/dev/null
       then ...
    fi
    break          # ← ループ末尾に無条件で置いていた
done
```

### 問題点
- エラーで continue する前に、末尾の無条件 `break` で1回でループを抜けてしまう
- 聞き直しができない（不正入力でも即終了）

### 解決
- `break` は「正常完了の分岐」の中だけに置く
- 各エラー分岐は `continue`、クイズ完了時だけ `break`

### 学んだこと
- break は「正常完了」にだけ置く。無条件でループ末尾に置くと聞き直し不能になる
- エラーは continue（先頭へ）、成功は break（脱出）という対応を徹底する

---

## elif を使わず else if をネストして fi 対応が崩れる

### 問題のコード
```bash
if [ 条件A ]
   then ...
   else if [ 条件B ]
           then ...
           else ...
        fi
        # ← fi の対応が分かりづらく、else を二重に書く事故も起きた
fi
```

### 問題点
- `else if` のネストは `fi` の対応関係が崩れやすい
- else を2つ書いてしまう構文エラーを誘発した

### 解決
`elif` でフラットに書く：
```bash
if   [ 条件A ]; then ...
elif [ 条件B ]; then ...
else ...
fi
```

### 学んだこと
- `else if`（ネスト）より `elif`（フラット）の方が fi 対応が明確で安全
- if の else は1ブロックに1つだけ
- フラットにすると continue/break の配置も見通しやすい

---

## クイズ後のスコア表示で名前が2回出る

### 問題のコード
```bash
# スコアファイル 1_score の中身
#   username:murabito
#   3問中2問正解66%
#   3問中0問正解0%

head -1 "$HOME"/"$ID"_score   # 1行目（名前）を表示
tail -5 "$HOME"/"$ID"_score   # 直近5行を表示
```

### 実行結果
```
username:murabito
username:murabito
3問中2問正解66%
3問中0問正解0%
```
名前（1行目）が2回表示される。

### 問題点
- スコアがまだ5行未満なので `tail -5` がファイル全体を返す
- その中に1行目（名前）も含まれる
- 結果、`head -1` の名前と `tail -5` 内の名前が重複

### 解決
- 名前表示を「クイズ後」から「ID認証直後」に移動
- 1行目は名前だけにして、認証後に1行であいさつ表示：
```bash
echo "$(head -1 "$HOME"/"$ID"_score)さんようこそ"
```
- スコアが4件以上たまれば `tail -5` から名前行は自然に押し出される
  （最初の数回だけ混ざるのは少人数想定なので許容）

### 学んだこと
- `tail -N` は行数が N 未満だと全行を返す → ヘッダー行を巻き込む
- 表示位置（認証直後 / クイズ後）で役割を分けると重複を避けられる
- `$(コマンド)` で出力を文字列に埋め込めば1行で表示できる
  （`head -1 ... && echo "..."` だと2行に割れる）

---

## SSH設定を変えても効かない（デフォルト値の罠）

### 問題のコード
```
# /etc/ssh/sshd_config
#PasswordAuthentication no    ← コメントアウトのまま
```

### 実行結果
```
$ sudo sshd -T | grep passwordauthentication
passwordauthentication yes
```

### 問題点
- 設定ファイルに明示がない項目は、SSHのデフォルト値（yes）が使われる
- コメントアウト＝「デフォルトに従う」であって「無効化」ではない

### 解決
コメントを外し、明示的に書く：
```
PasswordAuthentication no
```

### 学んだこと
- コメントアウトは「無効化」ではなく「デフォルト値を採用」
- 現在有効な値は `sshd -T` で確認できる（デフォルト値も含めて全表示）

---

## config.sh の変数が空になる（source 忘れ）

### 問題のコード
```bash
cat $DATA_DIR/word.csv
```

### 実行結果
```
cat: /word.csv: No such file or directory
```

### 問題点
- `$DATA_DIR` は config.sh で定義した変数
- 手動コマンドでは source していないので空 → `/word.csv` になった

### 解決
```bash
source config.sh      # 先に読み込む
# またはフルパスで書く
```

### 学んだこと
- 変数定義ファイルは使う前に `source` する必要がある
- 子プロセス（bash 実行）ではなく source（同じシェル）で読むと変数が現シェルに入る

---

# Python

## venv（externally-managed-environment エラー）

### 実行結果
```
error: externally-managed-environment   （pip install 時、PEP668）
```

### 問題点
- Ubuntu 24系はシステムPythonを保護している（pipで直接入れさせない）

### 解決
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install openpyxl
```

### 学んだこと
- Ubuntu 24系ではシステムPythonにpip installできない
- 仮想環境（venv）を作ってその中で入れる

---

## OneDrive の Excel ファイルが見つからない

### 実行結果
```
FileNotFoundError    （config.py のパスが無効）
```

### 問題点
- OneDriveの同期状態やフォルダ構造の変化でパスが変わる

### 解決
```bash
find /mnt/c/Users/<user> -iname "*TOEIC*"   # 現在地を探す
# 見つけたパスで config を更新
```

### 学んだこと
- クラウド同期パスは動的に変わる
- 設定を外部化（config）しておくと修正が一箇所で済む

---

## Python コード内にリダイレクト > を書いて SyntaxError

### 問題のコード
```python
print(...) > file.csv
```

### 問題点
- `>` はシェルのリダイレクト。Pythonコード内では使えない

### 解決
実行時にシェル側でリダイレクトする：
```bash
python wordqz.py > csv.d/word.csv
```

### 学んだこと
- `>` はシェルの機能であってPythonの構文ではない
- 出力先の切り替えは実行時のシェルで行う

---

# Git

## push が email privacy で拒否

### 実行結果
```
push declined due to email privacy restrictions
```

### 問題点
- commitのメールアドレスがGitHubで非公開設定になっている

### 解決
```bash
git config user.email "<id>+<name>@users.noreply.github.com"
git commit --amend --reset-author
git push
```

### 学んだこと
- GitHubのメール非公開設定時は noreply アドレスを使う
- 既存コミットのメールは `--amend` で直す

---

## push が rejected（fetch first）

### 実行結果
```
! [rejected]        main -> main (fetch first)
```

### 問題点
- GitHub Web で作ったファイルがローカル（WSL）になく、リモートが先行している
- リモートにローカルが持っていないcommitがある

### 解決
```bash
git config --global pull.rebase false   # マージ方式
git pull
git push
```

### 学んだこと
- リモートが先行しているとpushは拒否される
- 作業開始前に `git pull` する習慣をつける

---

## vim のスワップファイル警告

### 実行結果
```
E325: ATTENTION   .config.sh.swp が既に存在
```

### 問題点
- 前回のvim異常終了でスワップファイルが残った

### 解決
- `A`（Abort）で抜けて、`rm .config.sh.swp` で削除してから再編集

### 学んだこと
- 異常終了するとスワップファイルが残る
- 中身を失っていなければ削除して再開してよい

---

# VPS（檻・インフラ）

## シェル変数代入のスペース問題

### 問題のコード
```bash
EXCEL_PATH = "/path/..."
```

### 実行結果
```
EXCEL_PATH: command not found
```

### 問題点
- シェルは `=` の前後にスペースがあると「コマンド実行」と解釈する

### 解決
```bash
EXCEL_PATH="/path/..."
```

### 学んだこと
- Pythonと違い、シェルでは `=` の前後にスペースを入れない

---

## /tmp 配下に CSV 出力したらディレクトリ無しでエラー

### 実行結果
```
No such file or directory: '/tmp/ENquiz/word.csv'
```

### 問題点
- `/tmp/ENquiz` ディレクトリが存在しない
- `>` は親ディレクトリを自動作成しない

### 解決
```bash
mkdir -p /tmp/ENquiz   # 先に確保
```

### 学んだこと
- ファイル書き込み前にディレクトリの存在を確保する
- `-p` は再帰作成＆既存でもエラーにしない

---

## ForceCommand 経由で $1 が空になり shuf がエラー

### 問題のコード
```bash
# VPS_quiz.sh
bash ask.ct.sh $1
bash percentage.sh $1
```

### 実行結果
```
shuf: invalid line count: '/opt/ENquiz/data.d/word.csv'
percentage.sh: line 3: correct * 100 /  : syntax error: operand expected
5問中問正解
%
```

### 問題点
- ForceCommand は VPS_quiz.sh を引数なしで起動する（SSHコマンドの引数を渡す経路がない）
- `$1` が空 → `shuf -n $1` がCSVパスを行数と誤解、bc に渡る式が壊れる
- ローカルで `bash VPS_quiz.sh 5` と打っていたときは $1 に 5 が入っていたので気づかなかった

### 解決
```bash
read -p "何問挑戦する？ " HOWMANY
if [ "$HOWMANY" -gt 0 ] 2>/dev/null && [ "$HOWMANY" -lt 999 ] 2>/dev/null
   then bash ask.ct.sh "$HOWMANY"
        bash percentage.sh "$HOWMANY"
   else echo "有効な入力をしてください！"
fi
```

### 学んだこと
- ForceCommand 環境では引数を渡せない。対話入力(read)で受け取る
- `-gt`/`-lt` は数値専用。文字列を渡すと integer expression expected →
  `2>/dev/null` で伏せて else に流す。または `[[ =~ ^[0-9]+$ ]]` で先に数字判定

---

## ForceCommand 環境でパスがズレてファイルを見つけられない

### 問題のコード
```bash
# config.sh
DATA_DIR="$HOME/data.d"
# VPS_quiz.sh
bash ask.ct.sh          # 相対パス呼び出し
```

### 問題点
- ForceCommand は challenger のホーム（/home/challenger）を起点に起動する
- `$HOME` が /home/challenger を指し、DATA_DIR がズレる
- 相対パス呼び出しもカレントがズレてファイルを見つけられない

### 解決
「スクリプトの置き場所」を基準にする：
```bash
# VPS_quiz.sh 先頭
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
# config.sh 先頭
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data.d"
```
入口で一度 cd すれば子スクリプトはカレントを引き継ぐので、ask.ct.sh / percentage.sh は無修正。

### 学んだこと
- 「ファイルの置き場所」と「起動時の居場所（カレント）」は別物
- `${BASH_SOURCE[0]}` でスクリプト自身の場所を基準にすると、どこから起動されても動く
- 修正は入口とconfigの2ファイルだけで済む

---

## $$ 化で count.txt が見つからない（親子で TMP_DIR がズレた）

### 問題のコード
```bash
# config.sh
TMP_DIR="/tmp/ENquiz_$$"
```

### 実行結果
```
grep: /tmp/ENquiz_66283/count.txt: No such file or directory
5問中問正解
0%
```

### 問題点
- `$$` は「自プロセスのPID」。VPS_quiz.sh / ask.ct.sh / percentage.sh はそれぞれ別プロセス
- 各スクリプトが source config.sh するたびに、自分のPIDで TMP_DIR を計算
- ask.ct.sh が count.txt を書く場所と、percentage.sh が読む場所がズレた
- （$USER のときは全員 challenger で同じ値になり、たまたま一致していた）

### 解決（当時は保留 → ID認証版で解消）
- 親で `export QUIZ_SESSION="$$"` すれば子に引き継げて直るが、TMP区別のためだけに
  導入するのは過剰と判断し当時は保留
- ID認証版で、ID を引数で config に渡し `TMP_DIR="/tmp/ENquiz_$ID"` でID別に分離して解決
  （export を使わず位置パラメータだけで完結。詳細は次項）

### 学んだこと
- $$ はプロセスごとに変わる。複数スクリプトで共通の値を使うには親で確定して export する
- export したシェル変数は環境変数として子プロセスに引き継がれる（無印は引き継がれない）
- 個別の対症療法より、これから作る機能（名前/ID管理）に吸収できないかを先に考えると無駄がない

---

## 同時接続のTMP衝突を ID 引数渡しで解決（export 不使用）

### 問題のコード
```bash
# 旧: $$ で分けようとして親子でズレた（前項）
TMP_DIR="/tmp/ENquiz_$$"
```

### 問題点
- 挑戦者は全員 challenger なので `$USER` では分離できない
- `$$` はスクリプトごとに変わり親子でズレる
- export で共通化できるが、TMP区別のためだけの導入は過剰

### 解決
ID認証で入力された ID を引数で config に渡し、ID別パスにする：
```bash
# VPS.quiz.sh（入口）
source VPS.config.sh "$ID"

# VPS.config.sh（source の第1引数=ID）
TMP_DIR="/tmp/ENquiz_$1"

# 子スクリプトには第2引数で ID を渡す
bash VPS.ask.ct.sh "$HOWMANY" "$ID"
bash VPS.percentage.sh "$HOWMANY" "$ID"   # $2 で ID を受け取る
```

### 学んだこと
- `source script "$X"` も `bash script "$X"` も引数を渡せる（export 不要）
- 数字IDは `/`・`.` を含まないので、パスに使ってもトラバーサル不能で安全
- 「個人識別（スコア）」と「TMP分離」を1つの仕組み（ID）で両方解決できた

---

## 公開鍵のコピペで改行・スペースが混入し認証失敗

### 問題のコード
```bash
# 改行が混入した例
echo "ssh-ed25519 AAAAC3NzaC1lZDI1
NTE5AAAA...leb4Ko sigure@
sigurenoMacBook-Air.local" | sudo tee -a /home/challenger/.ssh/authorized_keys

# スペースが消えてくっついた例
...leb4Koshigure@shigurenoMacBook-Air.local

# cat で書こうとした / ssh-ed25519 が抜けた例
cat ssh-ed25519 AAAA... | sudo tee -a ...
echo "AAAA...（本体だけ）" | sudo tee -a ...
```

### 問題点
- メッセージアプリが長い1行を折り返し、コピー時に改行が混入 → authorized_keys で複数行に割れる
- 鍵本体とコメントの間のスペースが消えると、鍵データが壊れて認証失敗
- `cat` は引数をファイル名と解釈する（文字列を書くなら echo）
- `ssh-ed25519`（種類）が抜けると sshd が鍵を解釈できない

### 解決
```bash
echo "ssh-ed25519 AAAA...（完全な1行）... user@host" \
    | sudo tee -a /home/challenger/.ssh/authorized_keys
sudo cat /home/challenger/.ssh/authorized_keys    # 各行が独立した1行か確認
# 割れていたら nano で改行を削除して1行に繋げる（テスト鍵の行は触らない）
```

### 学んだこと
- 公開鍵は必ず1行。スペースは「種類の後」「鍵本体の後（コメント前）」の2箇所だけ
- コメント（user@host）は認証に使われないが、鍵本体が切れると認証は失敗する
- 書き込みは cat ではなく echo（文字列を出力）。スペースを含むのでクォート必須
- authorized_keys は複数行可。各行が独立した「許可された公開鍵」

---

## sudo echo > file で書き込めない（リダイレクトの権限）

### 問題のコード
```bash
sudo echo "..." > /home/challenger/.ssh/authorized_keys
```

### 実行結果
```
bash: /home/challenger/.ssh/authorized_keys: Permission denied
```

### 問題点
- sudo が効くのは echo だけ
- リダイレクト `>` を処理するのは呼び出し側シェル（非昇格の現ユーザー権限）
- root所有ディレクトリへの書き込みが現ユーザー権限で行われ、拒否される

### 解決
```bash
echo "..." | sudo tee -a /home/challenger/.ssh/authorized_keys
```

### 学んだこと
- `>` はシェルの機能、`tee` は外部コマンド。sudo はコマンドにしか効かない
- tee 自体を sudo で昇格させれば、書き込み動作そのものが root 権限になる
- `-a` は追記。authorized_keys のように1行ずつ足していくファイルと相性がよい

---

## /opt への再コピー忘れでリポジトリ更新が檻に反映されない

### 問題点
- ローカルで直して push/pull したのに、challenger で古い挙動のまま
- `git pull` で更新されるのは ~/English_vocab_quiz。檻が見るのは /opt/ENquiz（別物）

### 解決
```bash
git pull
sudo cp ~/English_vocab_quiz/VPS.quiz.sh /opt/ENquiz/   # /opt への再コピー必須
ls -la /opt/ENquiz                                       # 権限確認
sudo chmod 755 /opt/ENquiz/VPS.quiz.sh                   # cp で 644 に戻っていたら直す
```

### 学んだこと
- 「リポジトリ」と「/opt の実体」は別物
- 反映は cp + chmod 確認まで含めて1セット
- 入口スクリプトをリネームしたら ForceCommand（sshd_config）の指す先も変更する

---

## スコアファイルが root 所有で challenger が追記できない

### 問題のコード
```bash
sudo touch /home/challenger/1_score   # root 所有で作ってしまう
```

### 問題点
- スコアは challenger がクイズ中に `>>` で追記する → challenger の書き込み権が要る
- `sudo touch`（root所有）だと challenger が追記できず Permission denied
- `sudo vim` だけで中身を書いても root 所有になる

### 解決
```bash
sudo -u challenger touch /home/challenger/1_score   # challenger 所有で作る
sudo -u challenger vim  /home/challenger/1_score    # 中身も challenger 所有で書く
```

### 学んだこと
- ファイルの所有者は「作った人」。`sudo -u <user>` で指定ユーザー所有にできる
- 本体は /opt（root所有=書けない=改ざん防止）、スコアは challenger ホーム（書ける）。
  役割が逆なので置き場所と所有者を分ける
