#!/bin/bash
# auto-push.sh - ファイル変更を検知して自動コミット＆プッシュ
# 使い方: bash auto-push.sh

cd "$(dirname "$0")"

echo "Formulation Lab 自動プッシュ監視を開始..."
echo "変更を検知すると自動的にコミット＆プッシュします。"
echo "停止するには Ctrl+C を押してください。"
echo ""

while true; do
  # 変更があるかチェック
  changes=$(git status --porcelain 2>/dev/null | grep -v '\.env' | grep -v 'node_modules')

  if [ -n "$changes" ]; then
    echo "[$(date '+%H:%M:%S')] 変更を検知しました:"
    echo "$changes"
    echo ""

    # ステージング（.envファイルとnode_modulesは除外）
    git add -A
    git reset -- .env*.local .env.development .env.production 2>/dev/null

    # コミット
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "auto: update at ${timestamp}" --quiet

    # プッシュ
    if git push origin main --quiet 2>/dev/null; then
      echo "[$(date '+%H:%M:%S')] プッシュ完了"
    else
      echo "[$(date '+%H:%M:%S')] プッシュ失敗（ネットワークを確認してください）"
    fi
    echo ""
  fi

  sleep 10
done
