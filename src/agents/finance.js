import { Interface, formatUnits } from "ethers";

const TOKEN_INTERFACE = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

async function rpcRequest(env, method, params = []) {
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

async function callTokenMethod(contractAddress, fnName) {
  const data = TOKEN_INTERFACE.encodeFunctionData(fnName, []);
  const result = await rpcRequest(this.env, "eth_call", [
    { to: contractAddress, data },
    "latest",
  ]);
  const [decoded] = TOKEN_INTERFACE.decodeFunctionResult(fnName, result);
  return decoded;
}

export async function analyzeToken(contractAddress, env) {
  if (!contractAddress) {
    throw new Error("contractAddress is required");
  }

  const context = { env };
  const name = await callTokenMethod.call(context, contractAddress, "name");
  const symbol = await callTokenMethod.call(context, contractAddress, "symbol");
  const totalSupply = await callTokenMethod.call(context, contractAddress, "totalSupply");
  const blockNumberHex = await rpcRequest(env, "eth_blockNumber", []);

  return {
    contractAddress,
    name,
    symbol,
    totalSupply: totalSupply.toString(),
    totalSupplyFormatted: formatUnits(totalSupply, 18),
    blockNumber: Number.parseInt(blockNumberHex, 16),
  };
}

export async function getMarketSnapshot(ticker = "SAMPLE1", env) {
  return {
    ticker,
    source: "placeholder",
    sentiment: "neutral",
    confidence: 0,
    metrics: {
      priceUsd: null,
      volume24h: null,
      marketCap: null,
      change24hPercent: null,
    },
    note: "Replace with real market data provider integration",
    generatedAt: new Date().toISOString(),
  };
}

export async function storeSnapshot(data, env) {
  if (!env.TOKEN_CACHE) {
    throw new Error("Missing required binding: TOKEN_CACHE");
  }

  await env.TOKEN_CACHE.put("finance:latest", JSON.stringify(data), {
    expirationTtl: 3600,
  });

  return { stored: true, key: "finance:latest", ttlSeconds: 3600 };
}

export async function getLatestSnapshot(env) {
  if (!env.TOKEN_CACHE) {
    throw new Error("Missing required binding: TOKEN_CACHE");
  }

  const raw = await env.TOKEN_CACHE.get("finance:latest");
  return raw ? JSON.parse(raw) : null;
}
