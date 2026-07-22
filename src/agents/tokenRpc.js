import { Interface } from "ethers";

export const TOKEN_INTERFACE = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function burnTokens(uint256 amount)",
]);

export async function rpcRequest(env, method, params = []) {
  if (!env.RPC_URL) {
    throw new Error("Missing required env var: RPC_URL");
  }

  const response = await fetch(env.RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || "Unknown RPC error");
  }

  return payload.result;
}

export async function callTokenMethod(contractAddress, fnName, env) {
  const data = TOKEN_INTERFACE.encodeFunctionData(fnName, []);
  const result = await rpcRequest(env, "eth_call", [
    { to: contractAddress, data },
    "latest",
  ]);
  const [decoded] = TOKEN_INTERFACE.decodeFunctionResult(fnName, result);
  return decoded;
}
