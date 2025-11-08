#!/bin/bash

# WeightedVote Circom编译脚本
# 用于编译电路并生成所有必要的文件

set -e  # 遇到错误立即退出

echo "🚀 开始编译WeightedVote电路..."

# 检查必要的工具
echo "🔍 检查工具依赖..."
if ! command -v circom &> /dev/null; then
    echo "❌ circom未安装，请先安装: cargo install --locked --git https://github.com/iden3/circom circom
"
    exit 1
fi

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs未安装，请先安装: npm install -g snarkjs"
    exit 1
fi

# 创建输出目录
echo "📁 创建输出目录..."
mkdir -p public/zk
cd public/zk

# 清理旧文件
echo "🧹 清理旧文件..."
rm -f *.ptau *.zkey *.r1cs *.wasm *.sym verification_key.json

# 第一步：编译电路
echo "⚙️  第一步：编译电路..."
# 检查circomlib是否存在
if [ -d "../../node_modules/circomlib/circuits" ]; then
    echo "   使用本地circomlib..."
    circom ../../circuits/weighted_vote.circom \
        --r1cs --wasm --sym --c \
        -l ../../node_modules/circomlib/circuits
elif [ -d "/usr/local/lib/node_modules/circomlib/circuits" ]; then
    echo "   使用全局circomlib..."
    circom ../../circuits/weighted_vote.circom \
        --r1cs --wasm --sym --c \
        -l /usr/local/lib/node_modules/circomlib/circuits
else
    echo "   尝试不指定库路径..."
    circom ../../circuits/weighted_vote.circom --r1cs --wasm --sym --c
fi

if [ $? -ne 0 ]; then
    echo "❌ 电路编译失败"
    exit 1
fi

echo "✅ 电路编译成功"
echo "   - 生成了 weighted_vote.r1cs (约束系统)"
echo "   - 生成了 weighted_vote_js/ (WASM witness生成器)"
echo "   - 生成了 weighted_vote.sym (符号文件)"

# 检查约束数量
echo "📊 电路统计信息:"
if [ -f "weighted_vote.r1cs" ]; then
    snarkjs r1cs info weighted_vote.r1cs
fi

# 第二步：Powers of Tau仪式
echo "🔐 第二步：Powers of Tau仪式..."

# 根据约束数量选择合适的tau大小
# 对于我们的电路，14应该足够 (2^14 = 16384约束)
TAU_SIZE=14

echo "   生成初始Powers of Tau (大小: $TAU_SIZE)..."
snarkjs powersoftau new bn128 $TAU_SIZE pot${TAU_SIZE}_0000.ptau -v

echo "   第一次贡献..."
snarkjs powersoftau contribute pot${TAU_SIZE}_0000.ptau pot${TAU_SIZE}_0001.ptau \
    --name="First contribution" --entropy="$(date)" -v

echo "   准备Phase 2..."
snarkjs powersoftau prepare phase2 pot${TAU_SIZE}_0001.ptau pot${TAU_SIZE}_final.ptau -v

echo "✅ Powers of Tau仪式完成"

# 第三步：生成zkey
echo "🔑 第三步：生成证明和验证密钥..."

echo "   初始化zkey..."
snarkjs groth16 setup weighted_vote.r1cs pot${TAU_SIZE}_final.ptau circuit_0000.zkey

echo "   贡献随机性..."
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey \
    --name="First contribution" --entropy="$(date)" -v

echo "   导出验证密钥..."
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

echo "✅ 密钥生成完成"

# 第四步：验证设置
echo "🔍 第四步：验证设置..."
snarkjs zkey verify weighted_vote.r1cs pot${TAU_SIZE}_final.ptau circuit_final.zkey

# 清理中间文件
echo "🧹 清理中间文件..."
rm -f pot${TAU_SIZE}_*.ptau circuit_0000.zkey 
rm -rf weighted_vote_cpp/

# 显示最终文件
echo "🎉 编译完成！生成的文件："
echo "📁 public/zk/"
ls -la

echo ""
echo "📋 关键文件说明："
echo "   - weighted_vote_js/weighted_vote.wasm: witness生成器"
echo "   - circuit_final.zkey: 证明密钥"
echo "   - verification_key.json: 验证密钥"
echo "   - weighted_vote.r1cs: 约束系统"
echo ""
echo "✅ 电路已准备就绪，可以开始生成证明！"