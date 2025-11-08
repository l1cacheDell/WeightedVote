#!/bin/bash

# WeightedVote Circom编译脚本
# 用于编译电路并生成所有必要的文件

set -e  # 遇到错误立即退出

npm run generate-commits
npm run build-tree