#!/bin/bash

# 投票测试脚本
echo "🗳️  WeightedVote 投票测试"
echo "========================"

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")/.."

# 检查编译产物
if [ ! -f "public/zk/weighted_vote_js/weighted_vote.wasm" ]; then
    echo "❌ 编译产物不存在，请先运行 bash compile.sh"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 运行测试
echo "🚀 开始投票测试..."
node tests/test_vote.js "$@"

echo ""
echo "✅ 测试完成"