const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '.tmp');
fs.mkdirSync(outputDir, { recursive: true });
const logPath = path.join(outputDir, 'invocations.json');

function recordInvocation(entry) {
  let existing = [];
  if (fs.existsSync(logPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch {
      existing = [];
    }
  }
  existing.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
}

function ensureFileExists(flag, args) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    throw new Error(`Flag ${flag} is missing or has no value`);
  }
  const targetPath = args[index + 1];
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Expected file does not exist: ${targetPath}`);
  }
  return targetPath;
}

(async () => {
  const args = process.argv.slice(2);
  try {
    const expectedPath = ensureFileExists('--expected', args);
    ensureFileExists('--schema', args);
    recordInvocation({
      args,
      expectedPath,
      timestamp: new Date().toISOString(),
    });
    process.stdout.write(`mock spalidate called with ${expectedPath}\n`);
    process.exit(0);
  } catch (error) {
    recordInvocation({
      args,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    process.stderr.write(`${error}\n`);
    process.exit(1);
  }
})();
