import { URL } from 'url'
import fs from 'fs-extra'

import { chainPromise, runCommand } from '../utils'

export const repoSetup = (actionInfo) => {
  const gitRootUrl = new URL(actionInfo.gitRoot)
  const gitRoot = `${gitRootUrl.protocol}//${actionInfo.githubToken}@${gitRootUrl.host}/`

  return {
    async cloneRepo (repoPath = '', dest = '') {
      const exists = await fs.pathExists(dest)
      if (exists) {
        return console.warn(`Cannot clone into ${dest}, directory already exists`)
      }
      const repoUrl = `${gitRoot}${repoPath}.git`
      await fs.mkdirp(dest)
      await runCommand('git', ['clone', repoUrl, dest])
    },
    async checkoutRef (ref = '', repoDir = '') {
      const exists = await fs.pathExists(repoDir)
      if (!exists) {
        return console.warn('Repo dir does not exist: ', repoDir)
      }
      await runCommand('git', ['fetch'], {
        cwd: repoDir
      })
      await runCommand('git', ['checkout', `${ref}`], {
        cwd: repoDir
      })
    },
    async getCommitId (repoDir = '') {
      const command = await runCommand(
        'git',
        ['rev-parse', 'HEAD'],
        {
          cwd: repoDir
        },
        true
      )
      return command.stdout
    },
    async resetToRef (ref = '', repoDir = '') {
      const exists = await fs.pathExists(repoDir)
      if (!exists) {
        return console.warn('Repo dir does not exist: ', repoDir)
      }
      await runCommand('git', ['reset', '--hard', ref], {
        cwd: repoDir
      })
    },
    async repoBootstrap (repoDir = '') {
      await runCommand('rush', ['install'], {
        cwd: repoDir
      })
    },
    async repoBuild (repoDir: string) {
      await runCommand('npm', ['run', 'build'], {
        cwd: repoDir
      })
    },
    async repoInstallDep (repoDir: string, depName: string | string[]) {
      const normalizedDeps = Array.isArray(depName) ? depName : [depName]

      await chainPromise(
        normalizedDeps.map((name) => {
          return async () => await runCommand('rush', ['add', '-p', name, '-m'], {
            cwd: repoDir
          })
        })
      )
    }
  }
}
