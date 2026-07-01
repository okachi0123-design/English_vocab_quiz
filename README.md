# English Vocab Quiz

A terminal-based English vocabulary quiz app built with Bash and Python.

This project converts English vocabulary data from an Excel file into CSV files, then uses those CSV files to run quizzes in the terminal.

The project has two versions:

- **Local version**: runs on WSL/Linux and generates quiz CSV files from an Excel file.
- **VPS version**: runs on a VPS and lets other people try the quiz through SSH.

## Overview

### Local version

```text
Excel file
  ↓ Python
CSV files
  ↓ Bash
Terminal quiz
  ↓
Score result
```

### VPS version

```text
Prepared CSV files
  ↓
/opt/english-vocab-quiz/data.d/
  ↓ Bash
Terminal quiz over SSH
  ↓
User score file
```

This project is both an English vocabulary quiz app and a hands-on learning project for Linux, Bash, Python, Git, SSH, and VPS operation.

## Features

- Run English vocabulary quizzes in the terminal
- Choose the number of questions before starting
- Generate CSV quiz data from an Excel file
- Use CSV files as quiz data
- Judge answers by exact match or partial match
- Treat empty input as skipped
- Show the number of correct answers and accuracy rate
- Separate local and VPS versions
- Keep personal data and generated quiz data out of Git
- Keep directory structure with `.gitkeep`
- Let other users try the quiz on a VPS through SSH

## Directory Structure

```text
English_vocab_quiz/
├── data.d/
│   └── .gitkeep
├── docs/
│   ├── devlog.md
│   ├── vps-setup.md
│   └── Troubleshooting/
├── local/
│   ├── ask.ct.sh
│   ├── complete.ENquiz.sh
│   ├── config.py.example
│   ├── config.sh.example
│   ├── percentage.sh
│   ├── phraseqz.py
│   ├── put.data.test.sh
│   ├── quiz.part.sh
│   └── wordqz.py
├── vps/
│   ├── data.d/
│   │   └── .gitkeep
│   ├── VPS.ask.ct.sh
│   ├── VPS.config.sh.example
│   ├── VPS.percentage.sh
│   └── VPS.quiz.sh
└── .gitignore
```

## Technologies Used

- Bash / Shell Script
- Python
- openpyxl
- Excel
- CSV
- Linux
- WSL
- VPS
- SSH
- Git / GitHub

## Local Version

The local version is for studying on your own machine, such as WSL or Linux.

Python reads an Excel file and generates CSV files.  
Bash scripts then read the CSV files, ask quiz questions, judge answers, and show the score.

### Main Local Files

| File | Role |
|---|---|
| `complete.ENquiz.sh` | Entry point for the local quiz. It asks how many questions to try. |
| `quiz.part.sh` | Checks whether CSV files exist and whether they are newer than the Excel file. |
| `put.data.test.sh` | Runs the Python scripts and generates CSV files. |
| `wordqz.py` | Reads the `単語ログ` sheet and outputs word quiz data. |
| `phraseqz.py` | Reads the `フレーズログ` sheet and outputs phrase quiz data. |
| `ask.ct.sh` | Randomly selects questions, asks them, and judges the answers. |
| `percentage.sh` | Calculates and displays the score and accuracy rate. |
| `config.sh.example` | Example Bash config file. |
| `config.py.example` | Example Python config file. |

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/okachi0123-design/English_vocab_quiz.git
cd English_vocab_quiz/local
```

### 2. Create a Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install openpyxl
```

### 3. Create local config files

Copy the example config files.

```bash
cp config.sh.example config.sh
cp config.py.example config.py
```

Edit `config.sh` and `config.py` for your environment.

Example `config.py`:

```python
EXCEL_PATH = "/mnt/c/Users/your-name/Documents/vocab.xlsx"
```

Example `config.sh`:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EXCEL_PATH="/mnt/c/Users/your-name/Documents/vocab.xlsx"

DATA_DIR="$SCRIPT_DIR/data.d"

TMP_DIR="/tmp/ENquiz_$USER"
SHUF_FILE="$TMP_DIR/shuf.txt"
COUNT_FILE="$TMP_DIR/count.txt"
```

`DATA_DIR` is the directory where generated CSV files are placed.  
With the example above, CSV files are generated under `local/data.d`.

### 4. Run the quiz

```bash
bash complete.ENquiz.sh
```

The script asks how many questions you want to try.

```text
何問挑戦する？
```

Enter a number, and the quiz starts.

### 5. How quiz data is generated

In the local version, you usually do not need to create CSV files manually.

When you run `complete.ENquiz.sh`, it calls `quiz.part.sh`.  
`quiz.part.sh` checks whether the required CSV files already exist.

It checks for:

```text
data.d/word.csv
data.d/phrase.csv
```

If either CSV file does not exist, or if the Excel file has been updated after the CSV files were created, the script automatically runs `put.data.test.sh`.

`put.data.test.sh` generates CSV files from the Excel file.

```text
data.d/
├── word.csv
└── phrase.csv
```

Actual CSV files are ignored by Git because they are generated data and may contain personal study data.

> Note: If CSV generation fails but CSV files are still updated, delete `data.d/word.csv` and `data.d/phrase.csv`, then run `bash complete.ENquiz.sh` again.

You can also regenerate the CSV files manually if needed.

```bash
bash put.data.test.sh
```

## Expected Excel Format

The Python scripts expect the following Excel format.

### Word Sheet

| Item | Value |
|---|---|
| Sheet name | `単語ログ` |
| Start row | Row 3 |
| English word | Column C |
| Meaning | Column E |

### Phrase Sheet

| Item | Value |
|---|---|
| Sheet name | `フレーズログ` |
| Start row | Row 3 |
| Phrase | Column C |
| Meaning | Column E |

## CSV Format

Quiz data is stored as simple CSV files.

Example:

```csv
apple,りんご
improve,改善する
environment,環境
```

The first column is the English word or phrase.  
The second column is the meaning.

## Answer Judgement

Answers are judged in the following order:

1. Empty input is treated as skipped.
2. Exact match is judged as correct.
3. One-character answers are rejected, and the user must enter again.
4. If the meaning contains the user's answer, it is judged as correct.
5. Otherwise, it is judged as incorrect.

Example:

```text
improve
意味： 改善
○
改善する
```

## VPS Version

The VPS version is designed to let other people try the quiz through SSH.

Detailed VPS setup notes are written in [`docs/vps-setup.md`](docs/vps-setup.md).  
This README only explains the basic flow.

## VPS Setup

### 1. Copy the VPS directory to `/opt`

The quiz app is placed under `/opt` so that the restricted quiz user cannot modify or delete the application files.

Example:

```bash
sudo cp -r vps /opt/english-vocab-quiz
cd /opt/english-vocab-quiz
```

The VPS app directory should look like this:

```text
/opt/english-vocab-quiz/
├── data.d/
├── VPS.ask.ct.sh
├── VPS.config.sh.example
├── VPS.percentage.sh
└── VPS.quiz.sh
```

### 2. Create the VPS config file

```bash
sudo cp VPS.config.sh.example VPS.config.sh
```

The config file uses the script location as the base directory.

Example:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data.d"

TMP_DIR="/tmp/ENquiz_$1"
SHUF_FILE="$TMP_DIR/shuf.txt"
COUNT_FILE="$TMP_DIR/count.txt"
```

### 3. Copy CSV files into `data.d`

Actual quiz data is not included in Git.

CSV files should be generated locally and copied to the VPS data directory.

```bash
sudo mkdir -p /opt/english-vocab-quiz/data.d
sudo cp /path/to/word.csv /opt/english-vocab-quiz/data.d/word.csv
sudo cp /path/to/phrase.csv /opt/english-vocab-quiz/data.d/phrase.csv
```

The important point is:

```text
/opt/english-vocab-quiz/data.d/word.csv
/opt/english-vocab-quiz/data.d/phrase.csv
```

The `vps/data.d` directory is kept in Git with `.gitkeep`, but the actual CSV files are ignored.

### 4. Prepare a challenger user

The VPS operator can let other people play the quiz by using SSH public key authentication.

The basic operation flow is:

1. The challenger creates an SSH key pair.
2. The challenger sends only their public key to the VPS operator.
3. The VPS operator registers the public key on the VPS.
4. The VPS operator assigns a quiz user ID.
5. The VPS operator creates a score file for that ID.

Private keys must never be shared.

### 5. Create user score files

The VPS version asks for a user ID.

For example, if the restricted Linux user is `challenger` and the assigned quiz ID is `1`, the VPS operator creates the score file with an admin user.

```bash
sudo -u challenger bash -c 'echo "challenger_name" > "$HOME/1_score"'
```

The file name is based on the quiz user ID.

```text
/home/challenger/1_score
```

When the challenger enters ID `1`, the quiz uses this file as that user's score file.

### 6. Run the VPS quiz

The operator can test the quiz manually:

```bash
bash VPS.quiz.sh
```

In actual VPS use, the challenger connects with SSH.

```bash
ssh challenger@your-vps-ip
```

Depending on the SSH configuration, the challenger can be sent directly into the quiz.

The script asks:

```text
IDを入力してね
何問挑戦する？
```

After the quiz, it appends the result to the user score file and shows recent results.

## Git Ignore Policy

This repository keeps code and directory structure in Git, but it does not include personal data, local config files, generated quiz data, or temporary files.

Tracked examples:

```text
data.d/.gitkeep
vps/data.d/.gitkeep
local/config.py.example
local/config.sh.example
vps/VPS.config.sh.example
```

Ignored examples:

```text
*.xlsx
config.py
config.sh
VPS.config.sh
data.d/*
vps/data.d/*
.venv/
__pycache__/
shuf*.txt
```

The current `.gitignore` design keeps the directory structure while ignoring actual quiz data files.

```gitignore
# Quiz data
data.d/*
!data.d/.gitkeep

vps/data.d/*
!vps/data.d/.gitkeep
```

## What I Learned

Through this project, I practiced:

- Writing Bash scripts
- Reading CSV files with `while read`
- Splitting CSV columns with `IFS`
- Randomizing questions with `shuf`
- Checking answers with `grep`
- Using `if`, `while`, `break`, and `continue`
- Connecting Python and Bash
- Reading Excel files with `openpyxl`
- Managing config files separately from code
- Designing `.gitignore`
- Keeping directory structure with `.gitkeep`
- Preparing files for VPS deployment
- Managing simple user score files
- Using SSH public key authentication
- Designing a restricted quiz user for VPS operation

## Future Improvements

- Add a phrase quiz mode
- Add a spelling quiz mode
- Save detailed answer history
- Show rankings by user ID
- Prioritize low-accuracy words
- Add a setup script
- Add `requirements.txt`
- Improve error handling
- Support configurable Excel columns
- Add English UI messages
- Add screenshots or terminal output examples

## Notes

This project is a small English vocabulary quiz app, but it is also a learning record for Linux, Bash, Python, Git, SSH, and VPS operation.
