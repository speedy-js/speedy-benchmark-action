import { URL } from 'url'
import fs from 'fs-extra'

import { actionInfo } from '../prepare/action-info'
import { chainPromise, runCommand } from '../utils'

export const repoSetup = (info: {
  gitRoot: string
  githubToken: string
}) => {
  const gitRootUrl = new URL(info.gitRoot)
  const gitRoot = `${gitRootUrl.protocol}//${info.githubToken ? `${info.githubToken}@` : ''}${gitRootUrl.host}/`

  return {
    async cloneRepo (repoPath = '', dest = '') {
      const exists = await fs.pathExists(dest)
      if (exists) {
        return console.warn(`Cannot clone into ${dest}, directory already exists`)
      }
      const repoUrl = `${gitRoot}${repoPath}.git`
      console.log('Repo url', repoUrl)

      await fs.mkdirp(dest)
      await runCommand('git', ['clone', repoUrl, dest])
    },
    async checkoutRef (ref = '', repoDir = '', options: {
      force: boolean
    } = {
      force: false
    }) {
      const exists = await fs.pathExists(repoDir)
      if (!exists) {
        return console.warn('Repo dir does not exist: ', repoDir)
      }
      await runCommand('git', ['fetch'], {
        cwd: repoDir
      })
      await runCommand('git', ['checkout', `${ref}`, options.force ? '-f' : ''], {
        cwd: repoDir
      })
    },
    async pull (ref = '', repoDir = '') {
      const exists = await fs.pathExists(repoDir)
      if (!exists) {
        return console.warn('Repo dir does not exist: ', repoDir)
      }
      await runCommand('git', ['pull', 'origin', `${ref}`], {
        cwd: repoDir
      })
    },
    async push (ref = '', repoPath: string, repoDir = '') {
      const exists = await fs.pathExists(repoDir)
      if (!exists) {
        return console.warn('Repo dir does not exist: ', repoDir)
      }
      const repoUrl = `${gitRoot}${repoPath}.git`
      await runCommand('git', ['push', repoUrl, `${ref}`, '--no-verify'], {
        cwd: repoDir
      })
    },
    async resetToRef (ref = '', repoPath: string, repoDir = '') {
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

const { repoBootstrap, repoBuild, repoInstallDep, cloneRepo, checkoutRef, pull, push, resetToRef } = repoSetup(actionInfo)

export { repoBootstrap, repoBuild, repoInstallDep, cloneRepo, checkoutRef, pull, push, resetToRef }
