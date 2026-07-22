export async function analyzeRepo(repoInfo = {}, env) {
  const packageManager = repoInfo.packageManager || "npm";
  const language = repoInfo.language || "solidity/javascript";

  return {
    repo: {
      name: repoInfo.name || "unknown",
      branch: repoInfo.branch || "main",
      packageManager,
      language,
    },
    suggestions: [
      {
        category: "dependencies",
        recommendation: "Run npm audit and regularly update high-severity dependencies.",
        priority: "high",
      },
      {
        category: "security",
        recommendation: "Enable mandatory secret scanning and branch protection on main.",
        priority: "high",
      },
      {
        category: "performance",
        recommendation: "Cache npm dependencies and Hardhat artifacts in CI for faster builds.",
        priority: "medium",
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export async function runAudit(env) {
  const report = {
    auditType: "toolchain",
    status: "completed",
    summary: "Baseline audit generated. Replace placeholders with real analyzer integrations.",
    generatedAt: new Date().toISOString(),
  };

  if (!env.AGENT_STATE) {
    throw new Error("Missing required binding: AGENT_STATE");
  }

  await env.AGENT_STATE.put("toolchain:last-audit", JSON.stringify(report));
  return report;
}

export async function getLastAudit(env) {
  if (!env.AGENT_STATE) {
    throw new Error("Missing required binding: AGENT_STATE");
  }

  const raw = await env.AGENT_STATE.get("toolchain:last-audit");
  return raw ? JSON.parse(raw) : null;
}
