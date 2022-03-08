import fs from 'fs-extra'
import path from 'path'

import { tmpRoot } from '../run'
import { runCommand } from './exec'

export const writeProfileToGitHubWithRetry = async (profilePath: string) => {
  const name = path.basename(profilePath)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { repoSetup } = require('../prepare/repo-setup')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { actionInfo } = require('../prepare/action-info')

  const git = repoSetup({
    githubToken: process.env.PR_STATS_COMMENT_TOKEN!,
    gitRoot: actionInfo.gitRoot
  })
  const profileRepoDir = path.join(tmpRoot, 'speedy-profile')
  if (!fs.existsSync(profileRepoDir)) {
    await git.cloneRepo('speedy-js/speedy-profiles', profileRepoDir)
  } else {
    console.log('Profile repo dir exists, skipping clone', profileRepoDir)
  }

  const profile = path.join(profileRepoDir, name)

  await fs.move(profilePath, profile)
  await runCommand('git', ['status'], {
    cwd: profileRepoDir
  })
  await runCommand('git', ['add', profile], {
    cwd: profileRepoDir
  })
  await runCommand('git', [
    '-c',
    'user.name=speedy-benchmark-action',
    '-c',
    'user.email=github@users.noreply.github.com',
    'commit',
    '-m',
    `add ${name} profile for ${actionInfo.prRef}`
  ], {
    cwd: profileRepoDir
  })
  await git.push('main', 'speedy-js/speedy-profiles', profileRepoDir)

  // do some cleanups
  await fs.remove(profileRepoDir)
}
