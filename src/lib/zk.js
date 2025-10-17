import { groth16 } from "snarkjs";

const base = (process.env.PUBLIC_URL || "").replace(/\/$/, ""); // 可能是 "/EE4032"，开发时也可能是 ""
const wasmPath = `${base}/zk/weighted_vote.wasm`;
const zkeyPath = `${base}/zk/circuit_final.zkey`;

export async function genProof(input) {
  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);
  return { proof, publicSignals };
}
