/* eslint-disable @typescript-eslint/no-var-requires */

const os = require('os');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const { register } = require('esbuild-register/dist/node');

// override
const tmpRoot = path.join(os.homedir(), '.tmp/speedy-benchmark-action');
process.env.SPEEDY_BENCH_TMP = tmpRoot;

console.log('Detecting action dependencies...');
console.log(
  'node',
  'loc:',
  runCommand('which node'),
  'version:',
  process.version
);
console.log('npm', 'loc:', runCommand('which npm'), runCommand('npm -v'));
console.log('pnpm', 'loc:', runCommand('which pnpm'), runCommand('pnpm -v'));
console.log('yarn', 'loc:', runCommand('which yarn'), runCommand('yarn -v'));

console.log('Running with envs...');
console.log(process.env);

if (process.env.NODE_ENV === 'debug') {
  if (!fs.existsSync(tmpRoot)) {
    throw new Error(
      `tmp root ${tmpRoot} does not exist, please run \`pnpm setup:debug\` first.`
    );
  }

  process.env.GITHUB_REPOSITORY = 'hardfist/speedystack';
  process.env.GITHUB_REF = 'ci/action';
}

const define = Object.keys(process.env).reduce(
  (o, key) => {
    if (!key.startsWith('SPEEDY_BENCH_')) {
      return o;
    }

    return {
      ...o,
      ['process.env.' + key]: JSON.stringify(process.env[key]),
    };
  },
  {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }
);

register({
  target: 'node12',
  sourcemap: 'inline',
  define,
});

function runCommand(command) {
  return execSync(command).toString('utf-8');
}
