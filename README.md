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

To compile the circuits:

```bash
cargo install --locked --git https://github.com/iden3/circom circom
pnpm add -D snarkjs
pnpm add -D circomlib

circom circuits/weighted_vote.circom \
  --r1cs --wasm --sym \
  -l node_modules/circomlib/circuits \
  -o circuits/build
```

Generate Groth16's zkey

```bash
pnpm dlx snarkjs powersoftau new bn128 16 circuits/build/pot16_0000.ptau
pnpm dlx snarkjs powersoftau contribute circuits/build/pot16_0000.ptau circuits/build/pot16_0001.ptau
pnpm dlx snarkjs powersoftau prepare phase2 circuits/build/pot16_0001.ptau circuits/build/pot16_final.ptau

pnpm dlx snarkjs groth16 setup \
  circuits/build/weighted_vote.r1cs \
  circuits/build/pot16_final.ptau \
  circuits/build/weighted_vote_0000.zkey
pnpm dlx snarkjs zkey contribute circuits/build/weighted_vote_0000.zkey circuits/build/weighted_vote_final.zkey --name="zkey1" -v

pnpm dlx snarkjs zkey export verificationkey circuits/build/weighted_vote_final.zkey circuits/build/verification_key.json
```

Copy to `public/`:

```bash
cp circuits/build/weighted_vote_js/weighted_vote.wasm public/zk/weighted_vote.wasm
cp circuits/build/weighted_vote_final.zkey        public/zk/circuit_final.zkey
```