#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python is required but was not found in PATH." >&2
  exit 1
fi

"$PYTHON_BIN" -m pip install -r requirements.txt
"$PYTHON_BIN" manage.py migrate --noinput
"$PYTHON_BIN" manage.py collectstatic --noinput
