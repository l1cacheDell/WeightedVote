import { ethers } from "ethers";

export function getProvider() {
  if (!window.ethereum) throw new Error("No wallet injected");
  return new ethers.providers.Web3Provider(window.ethereum, "any");
}

export async function getSigner() {
  const p = getProvider();
  await p.send("eth_requestAccounts", []);
  return p.getSigner();
}
