/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs-extra'
import path from 'path'

import { runCommand } from './exec'

export const writeProfileToGitHubWithRetry = async (profilePath: string) => {
  const name = path.basename(profilePath)
  const { repoSetup } = require('../prepare/repo-setup')
  const { actionInfo } = require('../prepare/action-info')
  const { tmpRoot } = require('../run')

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

  if (fs.existsSync(profile)) {
    console.log('profile exists, skipping upload', name)
  } else {
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
  }

  // do some cleanups
  await fs.remove(profileRepoDir)
}
