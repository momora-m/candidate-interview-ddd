import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const REQUIRED_NPM = '11.10.0';
const REQUIRED_AGE = '7';

const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim();

if (!isAtLeast(npmVersion, REQUIRED_NPM)) {
  console.error(
    `npm ${npmVersion} cannot enforce min-release-age. Install npm >= ${REQUIRED_NPM} and run this check again.`
  );
  process.exit(1);
}

const npmrc = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8');
if (!/^min-release-age=7\s*$/m.test(npmrc)) {
  console.error('.npmrc must set min-release-age=7');
  process.exit(1);
}

// npm folds min-release-age into the absolute `before` cutoff and does not
// echo the original number from `npm config get min-release-age`.
const before = spawnSync('npm', ['config', 'get', 'before'], {
  encoding: 'utf8',
}).stdout.trim();
const beforeMs = Date.parse(before);
const ageDays = (Date.now() - beforeMs) / 86_400_000;

if (!Number.isFinite(beforeMs) || ageDays < 6.5 || ageDays > 7.5) {
  console.error(
    `min-release-age=${REQUIRED_AGE} was not applied. npm resolved before=${before || 'null'}.`
  );
  process.exit(1);
}

run('npm', ['audit', '--audit-level=moderate']);
run('npm', ['audit', 'signatures']);

console.log(
  `supply-chain check passed (npm ${npmVersion}, min-release-age=${REQUIRED_AGE} days, before=${before})`
);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function isAtLeast(actual, minimum) {
  const left = actual.split('.').map((part) => Number.parseInt(part, 10));
  const right = minimum.split('.').map((part) => Number.parseInt(part, 10));
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}
