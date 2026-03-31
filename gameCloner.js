import dotenv from "dotenv";
dotenv.config();

import { select } from "@inquirer/prompts";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import cliProgress from "cli-progress";
import axios from "axios";

const workspace = "reevo1";
const username = process.env.BITBUCKET_USERNAME;
const password = process.env.YOUR_BITBUCKET_API_TOKEN;
if (!workspace || !username || !password) {
  console.error(
    "Missing BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, or YOUR_BITBUCKET_API_TOKEN in .env file."
  );
  process.exit(1);
}

const cloneDir = "C:\\Reevo\\titan-projects";
const MAX_PARALLEL = 5;
const MAX_RETRIES = 2;

// ---------------- Helper ----------------
function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const git = spawn("git", args, { stdio: "inherit", cwd });
    git.on("close", (code) => (code === 0 ? resolve() : reject(code)));
  });
}

async function cloneOrUpdateRepo(cloneLink, repoPath, name) {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    try {
      if (fs.existsSync(repoPath)) {
        console.log(`Pulling updates for ${name}...`);
        await runGit(["pull"], repoPath);
      } else {
        console.log(`Cloning ${name}...`);
        await runGit(["clone", cloneLink, repoPath], process.cwd());
      }
      return;
    } catch {
      attempt++;
      console.log(`Error with ${name}, retry ${attempt}/${MAX_RETRIES}`);
      if (attempt > MAX_RETRIES) console.log(`Failed to clone ${name}`);
    }
  }
}

// ---------------- Main ----------------
async function listCommits() {
  const answer = await select({
    message: "Select a package manager",
    choices: [
      { name: "Titan Clients DEV", value: "TIT" },
      { name: "Titan Client Core", value: "TCC" },
      { name: "Titan Clients LIVE", value: "TCL" },
    ],
  });

  let url = `https://api.bitbucket.org/2.0/repositories/${workspace}?q=project.key="${answer}"&pagelen=100`;
  const reposToClone = [];

  // Fetch all repos
  while (url) {
    const res = await axios.get(url, {
      auth: { username, password },
    });

    const data = res.data;
    for (const repo of data.values) {
      const cloneLink = repo.links.clone.find((l) => l.name === "https").href;
      const repoPath = path.join(cloneDir, repo.slug);
      reposToClone.push({ cloneLink, repoPath, name: repo.name });
    }

    url = data.next || null;
  }

  // Ensure cloneDir exists
  if (!fs.existsSync(cloneDir)) fs.mkdirSync(cloneDir, { recursive: true });

  // Progress bar
  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(reposToClone.length, 0);

  let index = 0;
  async function worker() {
    while (index < reposToClone.length) {
      const repo = reposToClone[index++];
      await cloneOrUpdateRepo(repo.cloneLink, repo.repoPath, repo.name);
      progress.increment();
    }
  }

  // Run parallel workers
  await Promise.all(Array.from({ length: MAX_PARALLEL }, worker));
  progress.stop();
  console.log("✅ All repos cloned/updated");
}

listCommits();