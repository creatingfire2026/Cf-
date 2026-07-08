#!/usr/bin/env bash
# scripts/setup.sh — Bootstrap the creatingfire.org development environment
# Usage: bash scripts/setup.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[ok]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }

info "Setting up creatingfire.org Orchestration Engine dev environment"
echo ""

# ── Node.js / npm ────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  warn "Node.js not found. Install from https://nodejs.org (LTS recommended)"
  exit 1
fi
success "Node.js $(node --version)"

# ── Wrangler (Cloudflare CLI) ─────────────────────────────────────────────────
if ! command -v wrangler &>/dev/null; then
  info "Installing Wrangler..."
  npm install -g wrangler
fi
success "Wrangler $(wrangler --version 2>/dev/null | head -1)"

# ── Install project dependencies ──────────────────────────────────────────────
info "Installing npm dependencies..."
npm install
success "npm dependencies installed"

# ── mob.sh ───────────────────────────────────────────────────────────────────
if ! command -v mob &>/dev/null; then
  info "Installing mob.sh..."
  if curl -sL install.mob.sh | sh; then
    success "mob.sh installed"
  else
    warn "mob.sh install failed — install manually: https://mob.sh"
  fi
else
  success "mob $(mob version 2>/dev/null)"
fi

# ── git-toolbelt ─────────────────────────────────────────────────────────────
if ! command -v git-current-branch &>/dev/null; then
  info "Installing git-toolbelt..."
  TOOLBELT_DIR="$HOME/.git-toolbelt"
  if [ -d "$TOOLBELT_DIR" ]; then
    git -C "$TOOLBELT_DIR" pull --quiet
  else
    git clone --quiet https://github.com/nvie/git-toolbelt.git "$TOOLBELT_DIR"
  fi
  # Add to PATH if not already there
  if ! grep -q "git-toolbelt" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.git-toolbelt:$PATH"' >> "$HOME/.bashrc"
  fi
  if ! grep -q "git-toolbelt" "$HOME/.zshrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.git-toolbelt:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
  fi
  export PATH="$TOOLBELT_DIR:$PATH"
  success "git-toolbelt installed at $TOOLBELT_DIR"
else
  success "git-toolbelt already available"
fi

# ── git-absorb ───────────────────────────────────────────────────────────────
if ! command -v git-absorb &>/dev/null; then
  info "Installing git-absorb..."
  if command -v cargo &>/dev/null; then
    cargo install git-absorb --quiet
    success "git-absorb installed via cargo"
  elif command -v brew &>/dev/null; then
    brew install git-absorb
    success "git-absorb installed via brew"
  else
    warn "git-absorb requires Rust (cargo) or Homebrew — install from: https://github.com/tummychow/git-absorb"
  fi
else
  success "git-absorb $(git absorb --version 2>/dev/null)"
fi

echo ""
info "Next steps:"
echo "  1. wrangler login               — authenticate with Cloudflare"
echo "  2. wrangler secret put API_SECRET — set your API key"
echo "  3. wrangler kv namespace create CF_KV  — create KV namespace"
echo "  4. Update wrangler.toml with the KV namespace IDs"
echo "  5. wrangler queues create cf-workflow-queue"
echo "  6. wrangler r2 bucket create cf-assets"
echo "  7. npm run deploy               — deploy to creatingfire.org"
echo ""
success "Setup complete!"
