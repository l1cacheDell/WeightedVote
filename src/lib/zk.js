// lib/zk.js
import { groth16 } from "snarkjs";

const WASM_PATH = "/zk/weighted_vote_js/weighted_vote.wasm";        // 放在 public/zk 下 => 绝对路径
const ZKEY_PATH = "/zk/circuit_final.zkey";        // 你的实际文件名

function abs(url) {
  // 确保是绝对 URL，避免被前端路由影响
  return new URL(url, window.location.origin).toString();
}

async function assertWasm(url) {
  const res = await fetch(url + `?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`WASM fetch failed (${res.status}) at ${url}`);
  }
  const buf = await res.arrayBuffer();
  const u8 = new Uint8Array(buf);
  // 魔数 00 61 73 6d
  if (!(u8[0] === 0x00 && u8[1] === 0x61 && u8[2] === 0x73 && u8[3] === 0x6d)) {
    const head = new TextDecoder().decode(u8.slice(0, 64));
    throw new Error(
      `Not a WASM file at ${url}. First bytes: ${[...u8.slice(0,4)]}. ` +
      `Looks like HTML (“${head.slice(0,20)}…”). ` +
      `Check that the file exists under public/zk and the path is absolute.`
    );
  }
}

export async function genProof(input) {
  const wasmUrl = abs(WASM_PATH);
  const zkeyUrl = abs(ZKEY_PATH);

  // 先校验 wasm，路径错能更快更清楚地报出来
  await assertWasm(wasmUrl);

  // snarkjs 自己还会再 fetch 一次 wasm/zkey，这里用同样的绝对 URL
  return groth16.fullProve(input, wasmUrl, zkeyUrl);
}
