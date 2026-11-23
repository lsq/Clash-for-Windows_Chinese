#!/bin/bash
# 用法: ./extract_diff.sh <COMMIT_A> <COMMIT_B>

mkdir -p tmp/diff_work/A tmp/diff_work/B

# 获取两个 commit 之间变更的文件列表
FILES=$(git diff --name-only $1 $2)

for FILE in $FILES; do
  if [[ $FILE =~ 'renderer.js' ]];then
  # 确保目录结构存在
  mkdir -p "tmp/diff_work/A/$(dirname $FILE)"
  mkdir -p "tmp/diff_work/B/$(dirname $FILE)"
  
  # 提取并格式化
  git show $1:$FILE > "tmp/diff_work/A/$FILE"
  git show $2:$FILE > "tmp/diff_work/B/$FILE"
  fi
done

# 统一格式化整个临时目录
npx prettier --write tmp/diff_work/A
npx prettier --write tmp/diff_work/B

echo "提取完成，请使用 IDE 对比 /tmp/diff_work/A 和 /tmp/diff_work/B 目录"
