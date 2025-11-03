const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');
const circomlib = require('circomlib');

// 投票选项
const VOTE_OPTIONS = {
    A: 0,
    B: 1
};

class VoteTest {
    constructor() {
        this.zkPath = path.join(__dirname, '../public/zk');
        this.dbPath = path.join(__dirname, '../db');
        this.wasmPath = path.join(this.zkPath, 'weighted_vote_js/weighted_vote.wasm');
        this.zkeyPath = path.join(this.zkPath, 'circuit_final.zkey');
        this.vkeyPath = path.join(this.zkPath, 'verification_key.json');
        this.votesDbPath = path.join(this.dbPath, 'votes.json');
        
        // 初始化投票数据库
        this.initVotesDb();
    }

    // 初始化投票数据库
    initVotesDb() {
        if (!fs.existsSync(this.votesDbPath)) {
            const initialVotes = {
                A: 0,
                B: 0,
                totalVotes: 0,
                nullifiers: [] // 防止重复投票
            };
            fs.writeFileSync(this.votesDbPath, JSON.stringify(initialVotes, null, 2));
            console.log('📊 初始化投票数据库');
        }
    }

    // 加载数据
    loadData() {
        const identities = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_identities.json')));
        const tree = JSON.parse(fs.readFileSync(path.join(this.dbPath, 'tree.json')));
        const election = JSON.parse(fs.readFileSync(path.join(this.dbPath, 'election.json')));
        const votes = JSON.parse(fs.readFileSync(this.votesDbPath));
        
        return { identities, tree, election, votes };
    }

    // 获取Merkle路径
    getMerklePath(tree, leafIndex) {
        const pathElements = [];
        const pathIndices = [];
        
        let currentIndex = leafIndex;
        
        for (let level = 0; level < tree.depth; level++) {
            const isRight = currentIndex % 2;
            const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
            
            pathIndices.push(isRight);
            
            if (tree.layers[level] && tree.layers[level][siblingIndex]) {
                pathElements.push(tree.layers[level][siblingIndex]);
            } else {
                pathElements.push("0");
            }
            
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        return { pathElements, pathIndices };
    }

    // 生成投票证明
    async generateVoteProof(voterIndex, voteOption) {
        console.log(`\n🗳️  为投票者 ${voterIndex} 生成投票证明 (选择: ${Object.keys(VOTE_OPTIONS)[voteOption]})`);
        
        const { identities, tree, election } = this.loadData();
        const voter = identities[voterIndex];
        
        if (!voter) {
            throw new Error(`投票者 ${voterIndex} 不存在`);
        }

        // 获取Merkle路径
        const { pathElements, pathIndices } = this.getMerklePath(tree, voterIndex);
        
        // 构建电路输入
        const input = {
            // 私有输入
            identity_nullifier: voter.nullifier,
            identity_trapdoor: voter.trapdoor,
            weight: voter.weight,
            pathElements: pathElements,
            pathIndices: pathIndices,
            
            // 公共输入
            merkleRoot: election.merkleRoot,
            externalNullifier: election.electionId,
            option: voteOption
        };

        console.log('   📝 电路输入已准备');
        console.log(`   👤 投票者权重: ${voter.weight}`);
        console.log(`   🌳 Merkle根: ${election.merkleRoot}`);

        try {
            // 生成witness和证明
            console.log('   ⚙️  生成witness...');
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                this.wasmPath,
                this.zkeyPath
            );

            console.log('   ✅ 证明生成成功');
            return { proof, publicSignals, input };
            
        } catch (error) {
            console.error('   ❌ 证明生成失败:', error.message);
            throw error;
        }
    }

    // 验证投票证明
    async verifyVoteProof(proof, publicSignals) {
        console.log('   🔍 验证证明...');
        
        try {
            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath));
            const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            if (isValid) {
                console.log('   ✅ 证明验证通过');
                return true;
            } else {
                console.log('   ❌ 证明验证失败');
                return false;
            }
        } catch (error) {
            console.error('   ❌ 验证过程出错:', error.message);
            return false;
        }
    }

    // 记录投票
    recordVote(publicSignals) {
        const votes = JSON.parse(fs.readFileSync(this.votesDbPath));
        
        // 提取公共信号
        const nullifierHash = publicSignals[0];
        const outWeight = parseInt(publicSignals[1]);
        const option = parseInt(publicSignals[2]);
        
        // 检查是否重复投票
        if (votes.nullifiers.includes(nullifierHash)) {
            console.log('   ⚠️  检测到重复投票，拒绝记录');
            return false;
        }

        // 记录投票
        const optionName = Object.keys(VOTE_OPTIONS)[option];
        votes[optionName] += outWeight;
        votes.totalVotes += outWeight;
        votes.nullifiers.push(nullifierHash);

        // 保存到文件
        fs.writeFileSync(this.votesDbPath, JSON.stringify(votes, null, 2));
        
        console.log(`   📊 投票已记录: ${optionName} +${outWeight}`);
        console.log(`   📈 当前票数: A=${votes.A}, B=${votes.B}, 总计=${votes.totalVotes}`);
        
        return true;
    }

    // 显示投票结果
    showResults() {
        const votes = JSON.parse(fs.readFileSync(this.votesDbPath));
        
        console.log('\n📊 当前投票结果:');
        console.log('┌─────────┬─────────┐');
        console.log('│ 选项    │ 票数    │');
        console.log('├─────────┼─────────┤');
        console.log(`│ A       │ ${votes.A.toString().padStart(7)} │`);
        console.log(`│ B       │ ${votes.B.toString().padStart(7)} │`);
        console.log('├─────────┼─────────┤');
        console.log(`│ 总计    │ ${votes.totalVotes.toString().padStart(7)} │`);
        console.log('└─────────┴─────────┘');
        console.log(`已投票人数: ${votes.nullifiers.length}`);
    }

    // 执行单次投票测试
    async testSingleVote(voterIndex, voteOption) {
        try {
            console.log(`\n🚀 开始投票测试 - 投票者${voterIndex} 投票给 ${Object.keys(VOTE_OPTIONS)[voteOption]}`);
            
            // 1. 生成证明
            const { proof, publicSignals } = await this.generateVoteProof(voterIndex, voteOption);
            
            // 2. 验证证明
            const isValid = await this.verifyVoteProof(proof, publicSignals);
            
            if (isValid) {
                // 3. 记录投票
                const recorded = this.recordVote(publicSignals);
                
                if (recorded) {
                    console.log('   ✅ 投票成功完成');
                    return true;
                } else {
                    console.log('   ❌ 投票记录失败');
                    return false;
                }
            } else {
                console.log('   ❌ 投票验证失败');
                return false;
            }
            
        } catch (error) {
            console.error(`   ❌ 投票测试失败: ${error.message}`);
            return false;
        }
    }

    // 执行批量投票测试
    async testBatchVotes() {
        console.log('🎯 开始批量投票测试\n');
        
        const testCases = [
            { voterIndex: 0, option: VOTE_OPTIONS.A }, // 权重1投A
            { voterIndex: 1, option: VOTE_OPTIONS.B }, // 权重1投B  
            { voterIndex: 2, option: VOTE_OPTIONS.A }, // 权重1投A
            { voterIndex: 3, option: VOTE_OPTIONS.B }, // 权重3投B
            { voterIndex: 4, option: VOTE_OPTIONS.A }, // 权重3投A
        ];

        let successCount = 0;
        
        for (const testCase of testCases) {
            const success = await this.testSingleVote(testCase.voterIndex, testCase.option);
            if (success) successCount++;
            
            // 添加延迟避免过快执行
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`\n📋 批量测试完成: ${successCount}/${testCases.length} 成功`);
        this.showResults();
    }
}

// 主函数
async function main() {
    const voteTest = new VoteTest();
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // 默认执行批量测试
        await voteTest.testBatchVotes();
    } else if (args.length === 2) {
        // 单次投票测试
        const voterIndex = parseInt(args[0]);
        const voteOption = args[1].toUpperCase() === 'A' ? VOTE_OPTIONS.A : VOTE_OPTIONS.B;
        
        await voteTest.testSingleVote(voterIndex, voteOption);
        voteTest.showResults();
    } else if (args[0] === 'results') {
        // 只显示结果
        voteTest.showResults();
    } else {
        console.log('用法:');
        console.log('  node test_vote.js                    # 批量测试');
        console.log('  node test_vote.js <投票者索引> <A|B>   # 单次投票');
        console.log('  node test_vote.js results            # 显示结果');
    }
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = VoteTest;