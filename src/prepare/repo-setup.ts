import { URL } from 'url'
import { remove } from 'fs-extra'

import { logger, exec, chainPromise } from '../utils'

export const repoSetup = (actionInfo) => {
  const gitRootUrl = new URL(actionInfo.gitRoot)
  const gitRoot = `${gitRootUrl.protocol}//${actionInfo.githubToken}@${gitRootUrl.host}/`

  return {
    async cloneRepo (repoPath = '', dest = '') {
      await remove(dest)
      await exec(`git clone ${gitRoot}${repoPath}.git ${dest}`)
    },
    async checkoutRef (ref = '', repoDir = '') {
      await exec(`cd ${repoDir} && git fetch && git checkout ${ref}`)
    },
    async getCommitId (repoDir = '') {
      const { stdout } = await exec(`cd ${repoDir} && git rev-parse HEAD`)
      return stdout.trim()
    },
    async resetToRef (ref = '', repoDir = '') {
      await exec(`cd ${repoDir} && git reset --hard ${ref}`)
    },
    async mergeBranch (ref = '', origRepoDir = '', destRepoDir = '') {
      await exec(`cd ${destRepoDir} && git remote add upstream ${origRepoDir}`)
      await exec(`cd ${destRepoDir} && git fetch upstream`)

      try {
        await exec(`cd ${destRepoDir} && git merge upstream/${ref}`)
        logger('Auto merge of main branch successful')
      } catch (err) {
        logger.error('Failed to auto merge main branch:', err)

        if (err.stdout && err.stdout.includes('CONFLICT')) {
          await exec(`cd ${destRepoDir} && git merge --abort`)
          logger('aborted auto merge')
        }
      }
    },
    async repoBootstrap (repoDir = '') {
      await exec(`cd ${repoDir} && ./scripts/ci.sh install`, false, {
        timeout: 5 * 60 * 1000
      })
    },
    async repoBuild (dir) {
      const child = exec.spawn(`cd ${dir} && ./scripts/ci.sh build`, false, {
        timeout: 10 * 60 * 1000
      })

      return new Promise((resolve) => {
        child.on('close', resolve)
      })
    },
    async repoInstallDep (dir, depName) {
      depName = Array.isArray(depName) ? depName : [depName]

      await chainPromise(
        depName.map((name) => {
          return async () => await exec(`cd ${dir} && rush add -p ${name} -m`)
        })
      )
    }
  }
}
