const fs = require("fs");
const { execFileSync } = require("child_process");

const patterns = [
  { name: "private key block", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Ethereum private key", regex: /(^|[^0-9a-f])0x[0-9a-f]{64}([^0-9a-f]|$)/i },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { name: "GitHub fine-grained token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "OpenAI key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: "Stripe live key", regex: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: "Stripe webhook secret", regex: /\bwhsec_[A-Za-z0-9]{16,}\b/ },
];

const allowedPlaceholderFragments = [
  "YOUR_TESTNET_ONLY_DEPLOYER_PRIVATE_KEY",
  "REPLACE_WITH_SELF_CUSTODY_WALLET_ADDRESS",
  "YOUR_PROJECT_ID",
  "REPLACE_AFTER_FINAL_APPROVAL",
];

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const findings = [];

for (const file of files) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 1024 * 1024) continue;

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  const sanitized = allowedPlaceholderFragments.reduce(
    (text, placeholder) => text.split(placeholder).join(""),
    content
  );

  for (const pattern of patterns) {
    if (pattern.regex.test(sanitized)) {
      findings.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} tracked files.`);
