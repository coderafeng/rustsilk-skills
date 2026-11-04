#!/usr/bin/env bash
# 一键安装 rustsilk-skills 仓库内全部 Skill（目录名 = 技能名，均为 rs-<主题名>）
# 用法:
#   ./scripts/install.sh              # 安装到用户级 ~/.cursor/skills（默认）
#   ./scripts/install.sh --cursor     # 同上
#   ./scripts/install.sh --codex      # 安装到 ~/.codex/skills
#   ./scripts/install.sh --claude     # 安装到 ~/.claude/skills
#   ./scripts/install.sh --project    # 安装到当前仓库 .cursor/skills（项目级，需 git 提交）
#   ./scripts/install.sh --all        # 用户级 Cursor + Codex + Claude 全部安装

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="cursor"
INSTALL_ALL=false

for arg in "$@"; do
  case "$arg" in
    --cursor) TARGET="cursor" ;;
    --codex) TARGET="codex" ;;
    --claude) TARGET="claude" ;;
    --project) TARGET="project" ;;
    --all) INSTALL_ALL=true ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      exit 1
      ;;
  esac
done

install_one() {
  local platform="$1"
  local src="$2"
  local name="$3"
  local dest_base

  case "$platform" in
    cursor)
      if [[ "$TARGET" == "project" ]]; then
        dest_base="$ROOT/.cursor/skills"
      else
        dest_base="${HOME}/.cursor/skills"
      fi
      ;;
    codex)
      dest_base="${CODEX_HOME:-${HOME}/.codex}/skills"
      ;;
    claude)
      dest_base="${HOME}/.claude/skills"
      ;;
    *)
      echo "未知平台: $platform" >&2
      return 1
      ;;
  esac

  mkdir -p "$dest_base"
  rm -rf "${dest_base}/${name}"
  cp -r "$src" "${dest_base}/${name}"
  echo "  ✓ ${name} -> ${dest_base}/${name}"
}

install_skills() {
  local platform="$1"
  echo ">>> 安装到 ${platform} ..."
  # 目录名 = 技能名 = SKILL.md 的 name，新增 Skill 只需追加一个名字
  local skills=(rs-easy-query rs-mybatis-plus rs-rec-video)
  local s
  for s in "${skills[@]}"; do
    install_one "$platform" "$ROOT/$s" "$s"
  done
}

echo "rustsilk-skills 安装脚本"
echo "仓库: $ROOT"
echo ""

if $INSTALL_ALL; then
  install_skills "cursor"
  install_skills "codex"
  install_skills "claude"
else
  case "$TARGET" in
    cursor|project) install_skills "cursor" ;;
    codex) install_skills "codex" ;;
    claude) install_skills "claude" ;;
  esac
fi

echo ""
echo "完成。请重启 Cursor / 重新加载窗口使 Skill 生效。"
if [[ "$TARGET" == "project" ]]; then
  echo "项目级路径: $ROOT/.cursor/skills/（请提交到 git 以便团队共用）"
fi
