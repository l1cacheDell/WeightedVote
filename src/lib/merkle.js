import * as circomlibjs from "circomlibjs";

export async function buildPoseidon() {
  return circomlibjs.buildPoseidon();
}

export async function poseidonLeaf(commitment, weight) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const cBig = BigInt(commitment); // commitment 形如 0x...
  const leaf = poseidon([cBig, BigInt(weight)]);
  return BigInt("0x" + F.toString(leaf,16));
}

export async function buildMerkle(leaves, levels = 20) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  // 补齐到 2^levels
  const n = 1 << levels;
  const L = leaves.map(BigInt);
  while (L.length < n) L.push(0n);

  let layer = L;
  const layers = [layer];
  for (let i=0; i<levels; i++) {
    const next = [];
    for (let j=0; j<layer.length; j+=2) {
      const h = poseidon([layer[j], layer[j+1]]);
      next.push(BigInt("0x" + F.toString(h, 16)));
    }
    layers.push(next);
    layer = next;
  }
  const root = layer[0];
  return { root: "0x" + root.toString(16), layers: layers.map(arr => arr.map(x=>"0x"+x.toString(16))) };
}
