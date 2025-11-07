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
  return { 
    root: "0x" + root.toString(16), 
    layers: layers.map(arr => arr.map(x=>"0x"+x.toString(16))),
    leaves: layers[0].map(x=>"0x"+x.toString(16))
  };
}

export async function getMerklePath(tree, leafIndex) {
  if (!tree.layers || tree.layers.length === 0) {
    throw new Error("Invalid tree structure");
  }
  
  const pathElements = [];
  const pathIndices = [];
  let currentIndex = leafIndex;
  
  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    
    if (siblingIndex < layer.length) {
      pathElements.push(layer[siblingIndex]);
      pathIndices.push(currentIndex % 2);
    } else {
      // 如果兄弟节点不存在（树未填满），使用0
      pathElements.push("0x0");
      pathIndices.push(currentIndex % 2);
    }
    
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return { pathElements, pathIndices };
}

export async function findLeafIndex(tree, targetLeaf) {
  if (!tree.leaves) {
    return -1;
  }
  // 统一转换为BigInt进行比较
  const targetBig = typeof targetLeaf === 'string' ? BigInt(targetLeaf) : BigInt(targetLeaf);
  for (let i = 0; i < tree.leaves.length; i++) {
    const leafBig = typeof tree.leaves[i] === 'string' ? BigInt(tree.leaves[i]) : BigInt(tree.leaves[i]);
    if (leafBig === targetBig) {
      return i;
    }
  }
  return -1;
}
