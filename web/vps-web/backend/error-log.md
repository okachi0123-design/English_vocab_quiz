# Error Log

## エラー概要

### 発生した作業

FastAPI用バックエンドで、仮想環境 `.venv` 内に `pydantic` をインストールしようとした。

---

## 発生したエラー

```text
Command 'python' not found, did you mean:
  command 'python3' from deb python3
```

さらに `pip install` 実行時に、

```text
externally-managed-environment
```

および、

```text
You can override this, at the risk of breaking your Python installation
by passing --break-system-packages.
```

と表示された。

---

## 確認した内容

仮想環境を有効化すると、

```text
(.venv)
```

と表示されていたが、

```bash
which python3
which pip
```

を確認すると、

```text
/usr/bin/python3
/usr/bin/pip
```

となっており、仮想環境内の Python・pip を使用できていなかった。

さらに、

```bash
echo $VIRTUAL_ENV
pwd
```

を確認すると、

```text
VIRTUAL_ENV:
/home/okachi/English_vocab_quiz/web/backend/.venv

現在地:
/home/okachi/English_vocab_quiz/web/vps-web/backend
```

となっていた。

---

## 原因

`.venv` を作成した後に、プロジェクトのディレクトリを移動またはコピーしたため。

`.venv/bin/activate` 内には作成時の絶対パス、

```text
/home/okachi/English_vocab_quiz/web/backend/.venv
```

が残っていた。

そのため、

```text
(.venv)
```

と表示されていても、実際には現在の仮想環境を正しく参照できていなかった。

---

## 解決方法

古い `.venv` を削除し、現在のディレクトリで作り直した。

```bash
deactivate
rm -rf .venv

python3 -m venv .venv
source .venv/bin/activate
```

その後、

```bash
echo $VIRTUAL_ENV
which python
which pip
```

を確認。

正常時：

```text
/home/okachi/English_vocab_quiz/web/vps-web/backend/.venv
/home/okachi/English_vocab_quiz/web/vps-web/backend/.venv/bin/python
/home/okachi/English_vocab_quiz/web/vps-web/backend/.venv/bin/pip
```

となり、仮想環境が正常に利用できるようになった。

---

## その後のインストール

```bash
python -m pip install fastapi uvicorn pydantic
```

確認：

```bash
python -m pip show pydantic
```

---

## 学んだこと

- `(.venv)` と表示されるだけでは、仮想環境が正常とは限らない
- 確認には以下を使う

```bash
which python
which pip
echo $VIRTUAL_ENV
```

- `.venv` は作成後に別ディレクトリへ移動しない方がよい
- ディレクトリを移動した場合は `.venv` を作り直す
- `--break-system-packages` は今回のようなケースでは使用しない
