import { formatUnits } from "ethers";
import { callTokenMethod, rpcRequest } from "./tokenRpc.js";

export async function analyzeToken(contractAddress, env) {
  if (!contractAddress) {
    throw new Error("contractAddress is required");
  }

  const name = await callTokenMethod(contractAddress, "name", env);
  const symbol = await callTokenMethod(contractAddress, "symbol", env);
  const totalSupply = await callTokenMethod(contractAddress, "totalSupply", env);
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
