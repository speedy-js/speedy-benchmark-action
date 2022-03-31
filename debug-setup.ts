import os from 'os'
import path from 'path'
import fs from 'fs-extra'

import { runCommand } from './src/utils/exec'

export const tmpRoot = path.join(os.homedir(), '.tmp/speedy-benchmark-action')

const USE_SSH = typeof process.env.SPEEDY_USE_SSH !== 'undefined' ? process.env.SPEEDY_USE_SSH === 'true' : true
const SPEEDY_REPO = USE_SSH ? 'git@github.com:hardfist/speedystack.git' : 'https://github.com/hardfist/speedystack.git'
const FIXTURE_REPO = USE_SSH ? 'git@github.com:speedy-js/examples.git' : 'https://github.com/speedy-js/examples.git'
const PR_DIR = path.join(tmpRoot, '.tmp/pr')
const MAIN_DIR = path.join(tmpRoot, '.tmp/main')
const FIXTURE_DIR = path.join(tmpRoot, '.tmp/__speedy_fixtures__')

const git = {
  async clone (repoUrl: string, dest: string) {
    await runCommand('git', ['clone', repoUrl, dest])
  },
  async checkout (ref: string, repoDir: string) {
    const exists = await fs.pathExists(repoDir)
    if (!exists) {
      return console.warn('Repo dir does not exist: ', repoDir)
    }

    await runCommand('git', ['fetch'], {
      cwd: repoDir
    })
    await runCommand('git', ['checkout', ref], {
      cwd: repoDir
    })
  }
}

const rush = {
  async install (repoDir: string) {
    await runCommand('rush', ['install'], {
      cwd: repoDir
    })
  },
  async build (repoDir: string) {
    await runCommand('npm', ['run', 'build'], {
      cwd: repoDir
    })
  }
}

const pnpm = {
  async install (cwd: string) {
    const exists = await fs.pathExists(cwd)
    if (!exists) {
      throw new Error(`Cannot install pnpm deps in ${cwd}, directory does not exist`)
    }

    return runCommand('pnpm', ['install'], {
      cwd
    })
  }
}

const prepareSpeedyCopies = async () => {
  const prepareSpeedy = async (dir: string) => {
    await git.clone(SPEEDY_REPO, dir)
    await git.checkout('main', dir)
    await rush.install(dir)
    await rush.build(dir)
  }

  await Promise.all([
    prepareSpeedy(MAIN_DIR),
    prepareSpeedy(PR_DIR)
  ])
}

const prepareFixtureCopies = async () => {
  await git.clone(FIXTURE_REPO, FIXTURE_DIR)

  const sourceBenchmarkDir = FIXTURE_DIR
  const tmpBenchmarkDir = path.join(tmpRoot, '.tmp/benchmarks')
  await fs.copy(sourceBenchmarkDir, tmpBenchmarkDir, { recursive: true })
  await pnpm.install(tmpBenchmarkDir)
}

const run = async () => {
  await fs.ensureDir(tmpRoot)

  await prepareSpeedyCopies()
  await prepareFixtureCopies()
}

run().then(() => {
  console.log()
  console.log()
  console.log('Debug setup complete, you can now run the benchmarks with `pnpm action:debug`')
}).catch(e => {
  console.error('Error encountered on debug setup:', e)
  fs.remove(tmpRoot)
  process.exit(1)
})
