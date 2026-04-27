import * as fs from "node:fs";

type OpenCodeSession = {
  directory?: string;
  id?: string;
  title?: string;
};

function fail(message: string): never {
  void message;
  process.exit(1);
}

const title = process.argv[2]?.trim();
if (!title) {
  fail("Usage: opencode-session-lookup-runner <title>");
}

const input = fs.readFileSync(0, "utf8");

let sessions: OpenCodeSession[];
try {
  const parsed = JSON.parse(input) as unknown;
  if (!Array.isArray(parsed)) {
    fail("Expected OpenCode session list JSON array on stdin.");
  }

  sessions = parsed as OpenCodeSession[];
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Failed to parse OpenCode sessions JSON: ${message}`);
}

const cwd = process.cwd();
const match =
  sessions.find((session) => session.title === title && session.directory === cwd) ??
  sessions.find((session) => session.title === title);

if (!match?.id) {
  fail(`No OpenCode session found for title: ${title}`);
}

process.stdout.write(match.id);
