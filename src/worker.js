import { formatUnits, parseUnits } from "ethers";
import {
  analyzeToken,
  getLatestSnapshot,
  getMarketSnapshot,
  storeSnapshot,
} from "./agents/finance.js";
import {
  getApplications,
  searchJobs,
  storeResults,
  trackApplication,
} from "./agents/jobs.js";
import { analyzeRepo, getLastAudit, runAudit } from "./agents/toolchain.js";
import {
  callTokenMethod,
  rpcRequest,
  TOKEN_INTERFACE,
} from "./agents/tokenRpc.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

const json = (success, data, status = 200) =>
  new Response(
    JSON.stringify({ success, data, timestamp: new Date().toISOString() }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    }
  );

function ensureAuth(request, env) {
  if (!env.API_SECRET) {
    throw new Error("Missing required env var: API_SECRET");
  }

  const auth = request.headers.get("Authorization") || "";
  const expected = "Bearer " + env.API_SECRET;
  if (auth !== expected) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}

async function listAgentState(env) {
  if (!env.AGENT_STATE) {
    throw new Error("Missing required binding: AGENT_STATE");
  }

  const listing = await env.AGENT_STATE.list({ prefix: "agent:" });
  const state = {};

  await Promise.all(
    listing.keys.map(async ({ name }) => {
      const value = await env.AGENT_STATE.get(name);
      state[name] = value ? JSON.parse(value) : null;
    })
  );

  return state;
}

async function logAgentRun(env, agentName, status, resultSummary) {
  if (!env.THEODORE_DB) {
    return;
  }

  await env.THEODORE_DB.prepare(
    "INSERT INTO agent_runs (agent_name, status, result_summary, ran_at) VALUES (?, ?, ?, ?)"
  )
    .bind(agentName, status, resultSummary, new Date().toISOString())
    .run();
}

async function logTokenEvent(env, eventType, txHash, amount, address, blockNumber = null) {
  if (!env.THEODORE_DB) {
    return;
  }

  await env.THEODORE_DB.prepare(
    "INSERT INTO token_events (event_type, tx_hash, block_number, amount, address, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(eventType, txHash || null, blockNumber, amount || null, address || null, new Date().toISOString())
    .run();
}

async function runScheduledAgents(env, trigger = "scheduled") {
  const financeTicker = env.FINANCE_TICKER || "SAMPLE1";
  const scheduledSkills = (env.JOB_SKILLS || "solidity,cloudflare,workers")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const scheduledLocation = env.JOB_LOCATION || "remote";

  const financeSnapshot = await getMarketSnapshot(financeTicker, env);
  await storeSnapshot(financeSnapshot, env);
  await env.AGENT_STATE.put("agent:finance", JSON.stringify(financeSnapshot));
  await logAgentRun(env, "finance", "success", `Snapshot stored for ${financeSnapshot.ticker}`);

  const jobs = await searchJobs(scheduledSkills, scheduledLocation, env);
  await storeResults(jobs, env);
  await env.AGENT_STATE.put("agent:jobs", JSON.stringify(jobs));
  await logAgentRun(env, "jobs", "success", `Saved ${jobs.jobs.length} job results`);

  const toolchainAudit = await runAudit(env);
  await env.AGENT_STATE.put("agent:toolchain", JSON.stringify(toolchainAudit));
  await logAgentRun(env, "toolchain", "success", "Toolchain audit completed");

  const summary = {
    trigger,
    completedAt: new Date().toISOString(),
    agents: ["finance", "jobs", "toolchain"],
  };

  await env.AGENT_STATE.put("agent:last-run", JSON.stringify(summary));
  return summary;
}

async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  ensureAuth(request, env);

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/") {
    return json(true, {
      status: "ok",
      network: env.NETWORK || "mainnet",
      services: {
        kvAgentState: Boolean(env.AGENT_STATE),
        kvTokenCache: Boolean(env.TOKEN_CACHE),
        d1: Boolean(env.THEODORE_DB),
      },
    });
  }

  if (request.method === "POST" && url.pathname === "/token/deploy") {
    const body = await request.json().catch(() => ({}));
    const bytecode = body.bytecode || env.TOKEN_BYTECODE;

    if (!bytecode) {
      return json(false, { error: "Missing bytecode or TOKEN_BYTECODE env var" }, 400);
    }

    let txHash;

    if (body.signedTransaction) {
      txHash = await rpcRequest(env, "eth_sendRawTransaction", [body.signedTransaction]);
    } else if (env.DEPLOYER_ADDRESS) {
      txHash = await rpcRequest(env, "eth_sendTransaction", [
        {
          from: env.DEPLOYER_ADDRESS,
          data: bytecode,
        },
      ]);
    } else {
      return json(
        false,
        {
          error:
            "Provide signedTransaction in request body or set DEPLOYER_ADDRESS for unlocked-account RPC deployment",
        },
        400
      );
    }

    await logTokenEvent(env, "deploy", txHash, null, env.DEPLOYER_ADDRESS || null);
    return json(true, { txHash, method: body.signedTransaction ? "eth_sendRawTransaction" : "eth_sendTransaction" });
  }

  if (request.method === "GET" && url.pathname === "/token/status") {
    const contractAddress = url.searchParams.get("contractAddress") || env.TOKEN_CONTRACT_ADDRESS;
    if (!contractAddress) {
      return json(false, { error: "Missing contractAddress query param or TOKEN_CONTRACT_ADDRESS env var" }, 400);
    }

    const [name, symbol, totalSupply] = await Promise.all([
      callTokenMethod(contractAddress, "name", env),
      callTokenMethod(contractAddress, "symbol", env),
      callTokenMethod(contractAddress, "totalSupply", env),
    ]);

    return json(true, {
      contractAddress,
      name,
      symbol,
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: formatUnits(totalSupply, 18),
    });
  }

  if (request.method === "POST" && url.pathname === "/token/burn") {
    const body = await request.json().catch(() => ({}));
    const contractAddress = body.contractAddress || env.TOKEN_CONTRACT_ADDRESS;

    if (!contractAddress) {
      return json(false, { error: "Missing contractAddress or TOKEN_CONTRACT_ADDRESS env var" }, 400);
    }

    if (!body.amount) {
      return json(false, { error: "Missing required field: amount" }, 400);
    }

    const burnAmount = parseUnits(String(body.amount), 18);
    let txHash;

    if (body.signedTransaction) {
      txHash = await rpcRequest(env, "eth_sendRawTransaction", [body.signedTransaction]);
    } else if (body.from || env.DEPLOYER_ADDRESS) {
      const from = body.from || env.DEPLOYER_ADDRESS;
      txHash = await rpcRequest(env, "eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: TOKEN_INTERFACE.encodeFunctionData("burnTokens", [burnAmount]),
        },
      ]);
    } else {
      return json(
        false,
        {
          error:
            "Provide signedTransaction in request body or include from/DEPLOYER_ADDRESS for unlocked-account RPC",
        },
        400
      );
    }

    await logTokenEvent(env, "burn", txHash, burnAmount.toString(), contractAddress);
    return json(true, {
      txHash,
      amount: burnAmount.toString(),
      amountFormatted: formatUnits(burnAmount, 18),
    });
  }

  if (request.method === "POST" && url.pathname === "/agent/finance") {
    const body = await request.json().catch(() => ({}));
    const ticker = body.ticker || "SAMPLE1";
    const snapshot = await getMarketSnapshot(ticker, env);
    await storeSnapshot(snapshot, env);

    let tokenAnalysis = null;
    if (body.contractAddress) {
      tokenAnalysis = await analyzeToken(body.contractAddress, env);
    }

    await env.AGENT_STATE.put(
      "agent:finance",
      JSON.stringify({ snapshot, tokenAnalysis, query: body.query || null })
    );

    return json(true, {
      query: body.query || null,
      snapshot,
      tokenAnalysis,
      latestSnapshot: await getLatestSnapshot(env),
    });
  }

  if (request.method === "POST" && url.pathname === "/agent/jobs") {
    const body = await request.json().catch(() => ({}));
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const location = body.location || "remote";

    const results = await searchJobs(skills, location, env);
    await storeResults(results, env);

    if (body.track && typeof body.track === "object") {
      await trackApplication(body.track, env);
    }

    let applications = [];
    let applicationsWarning = null;
    try {
      applications = await getApplications(env);
    } catch (error) {
      applicationsWarning = error.message;
    }

    await env.AGENT_STATE.put("agent:jobs", JSON.stringify({ results, applicationsCount: applications.length }));

    return json(true, {
      results,
      applications,
      applicationsWarning,
    });
  }

  if (request.method === "POST" && url.pathname === "/agent/toolchain") {
    const body = await request.json().catch(() => ({}));
    const analysis = await analyzeRepo(body.repoInfo || {}, env);
    const audit = await runAudit(env);

    await env.AGENT_STATE.put("agent:toolchain", JSON.stringify({ analysis, audit }));

    return json(true, {
      analysis,
      audit,
      lastAudit: await getLastAudit(env),
    });
  }

  if (request.method === "GET" && url.pathname === "/agent/status") {
    const state = await listAgentState(env);
    return json(true, state);
  }

  if (request.method === "POST" && url.pathname === "/cron") {
    const summary = await runScheduledAgents(env, "manual");
    return json(true, summary);
  }

  return json(false, { error: "Not Found" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return json(false, { error: error.message || "Internal Server Error" }, error.status || 500);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledAgents(env, "scheduled"));
  },
};
