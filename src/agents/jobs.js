export async function searchJobs(skills = [], location = "remote", env) {
  const normalizedSkills = Array.isArray(skills) ? skills : [];

  return {
    query: {
      skills: normalizedSkills,
      location,
    },
    source: "placeholder",
    jobs: [
      {
        title: "Blockchain Engineer",
        company: "Example Labs",
        location,
        url: "https://example.com/jobs/blockchain-engineer",
        matchScore: normalizedSkills.length ? 0.86 : 0.72,
      },
      {
        title: "Cloudflare Worker Developer",
        company: "Edge Systems",
        location,
        url: "https://example.com/jobs/worker-developer",
        matchScore: normalizedSkills.length ? 0.81 : 0.68,
      },
    ],
    generatedAt: new Date().toISOString(),
    note: "Replace with job board API integration",
  };
}

export async function storeResults(results, env) {
  if (!env.AGENT_STATE) {
    throw new Error("Missing required binding: AGENT_STATE");
  }

  await env.AGENT_STATE.put("jobs:latest", JSON.stringify(results));
  return { stored: true, key: "jobs:latest" };
}

export async function getApplications(env) {
  if (!env.THEODORE_DB) {
    throw new Error("Missing required binding: THEODORE_DB");
  }

  const query = env.THEODORE_DB.prepare(
    "SELECT id, title, company, url, status, applied_at, notes FROM job_applications ORDER BY applied_at DESC"
  );

  const { results } = await query.all();
  return results;
}

export async function trackApplication(job, env) {
  if (!env.THEODORE_DB) {
    throw new Error("Missing required binding: THEODORE_DB");
  }

  const status = job.status || "saved";
  const appliedAt = job.applied_at || new Date().toISOString();

  await env.THEODORE_DB.prepare(
    "INSERT INTO job_applications (title, company, url, status, applied_at, notes) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(
      job.title || "Unknown title",
      job.company || "Unknown company",
      job.url || "",
      status,
      appliedAt,
      job.notes || null
    )
    .run();

  return { tracked: true, status, applied_at: appliedAt };
}
