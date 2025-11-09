# Anonymous Weighted Voting Project

Group 1, EE4032-blockchain, 2025 fall

This project is presented as the interface demo for EE4032 Blockchain Engineering of NUS.

# How to run this project

The first thing is to install `nodejs`. If you can use `npm` cli tools, then continue:

First you need to get an etherscan account & API key:

Create a `.env` file and type it:

```bash
REACT_APP_ETHERSCAN_API_KEY="your-key-here"
```

```bash
npm install     # or you can use pnpm
npm start
```


# How to compile & run circom curcuit
## Manually
To compile the circuits:

```bash
# installation of circom compiler
npm install -g circom

npm install snarkjs

mkdir -p public/zk

circom circuits/weighted_vote.circom --r1cs --wasm --sym -o public/zk

# This will yield:
# - public/zk/weighted_vote.r1cs (约束系统)
# - public/zk/weighted_vote_js/weighted_vote.wasm (witness生成器)
# - public/zk/weighted_vote.sym (符号文件)
```

Generate Groth16's zkey

```bash
cd public/zk

# 生成Powers of Tau (通用设置)
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v

# 生成电路特定的zkey
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup weighted_vote.r1cs pot14_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="First contribution" -v

# 导出验证密钥
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
```

The final constructure:

```
public/zk/
├── weighted_vote.wasm          # witness生成器
├── circuit_final.zkey          # 证明密钥
├── verification_key.json       # 验证密钥
└── weighted_vote.r1cs          # 约束系统(可选保留)
```

## Script

```bash
bash compile.sh
```

Then, export the Verifier.sol by using the compilation output:

```bash
snarkjs zkey export solidityverifier public/zk/circuit_final.zkey src/contracts/Verifier.sol
```


# Deploy Contract

### Verifier Contract deploy records:

- Sourcify verification successful. https://repo.sourcify.dev/11155111/0x18B8DBa21C39CfD93FeE3172a1aEf0e06CC6a900/
- Routescan verification successful. https://testnet.routescan.io/address/0x18B8DBa21C39CfD93FeE3172a1aEf0e06CC6a900/contract/11155111/code

Address: 0x18B8DBa21C39CfD93FeE3172a1aEf0e06CC6a900

### WeightedVoteLive Contract deploy records:

**Notice: When deploy the `WeightedVoteLive.sol`, you need to pass the deployed address of previous `Verifier.sol`, to deploy this one.**

- Sourcify verification successful. https://repo.sourcify.dev/11155111/0x276a60f66Ae6e3d5AC4B47B1c592edf177bDE3B2/
- Routescan verification successful. https://testnet.routescan.io/address/0x276a60f66Ae6e3d5AC4B47B1c592edf177bDE3B2/contract/11155111/code

Address: 0x276a60f66Ae6e3d5AC4B47B1c592edf177bDE3B2