import path from 'path'
import fs from 'fs-extra'
import fetch from 'node-fetch'

import { repoSetup } from './prepare/repo-setup'
import getActionInfo from './prepare/action-info'

import { CategorizedProjectsUtilities, logger, getDirSize, chainPromise, getEntryPoint, emitAssets } from './utils'
import { SpeedyCIPluginInitialization } from './speedy/plugins'

import { WORKING_DIR, TARGET_DIR, SOURCE_DIR, STAT_TYPE } from './constants'

import { finalizer } from './finalizer'

const actionInfo = getActionInfo()

const { repoBootstrap, repoBuild, repoInstallDep } = repoSetup(actionInfo)

const NODE_MODULES_TEST_FOLDERS = ['packages', 'tools', 'private-packages']

/**
 * Run nodeModules stats
 * @param {CategorizedProjectsUtilities} sourceCategory
 * @param {CategorizedProjectsUtilities} targetCategory
 */
const runNodeModulesStats = async (sourceCategory, targetCategory) => {
  const sourceCat = sourceCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()
  const targetCat = targetCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()

  const nodeModulesStats = {
    stat: {},
    type: STAT_TYPE.NODE_MODULES_STATS,
    title: 'Node Modules Stats'
  }

  logger('generating nodeModules stats...')

  const getEach = async (source, result, isSource) => {
    for (const [catName, pkgs] of Object.entries(source)) {
      result[catName] = result[catName] || {}

      await Promise.all(
        pkgs.map(async (pkg) => {
          const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

          const size = await getDirSize(pkg.absoluteFolder)
          logger(`${pkg.packageName}`)
          logger(`   size: ${size}`)

          // [target, source]
          if (isSource) {
            packageResult[1] = [pkg, size]
          } else {
            packageResult[0] = [pkg, size]
          }
        })
      )
    }
  }

  await Promise.all([
    getEach(targetCat, nodeModulesStats.stat, false),
    getEach(sourceCat, nodeModulesStats.stat, true)
  ])

  return nodeModulesStats
}

/**
 * Run nodeModules stats
 * @param {CategorizedProjectsUtilities} sourceCategory
 * @param {CategorizedProjectsUtilities} targetCategory
 */
const runBundleSizeStatus = async (sourceCategory, targetCategory) => {
  const sourceCat = sourceCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()
  const targetCat = targetCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()

  const bundleSizeStats = {
    stat: {},
    type: STAT_TYPE.BUNDLE_SIZE_STATS,
    title: 'Bundle Size Stats'
  }

  logger('generating bundleSize stats...')

  const getEach = async (source, result, isSource) => {
    for (const [catName, pkgs] of Object.entries(source)) {
      result[catName] = result[catName] || []

      await Promise.all(
        pkgs.map(async (pkg) => {
          const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

          const entryPoint = await getEntryPoint(pkg.absoluteFolder)

          if (!entryPoint) {
            return
          }

          const size = await getDirSize(entryPoint)
          logger(`${pkg.packageName}`)
          logger(`   entryPoint: ${entryPoint}`)
          logger(`   size: ${size}`)

          // [target, source]
          if (isSource) {
            packageResult[1] = [pkg, size]
          } else {
            packageResult[0] = [pkg, size]
          }
        })
      )
    }
  }

  await Promise.all([getEach(targetCat, bundleSizeStats.stat, false), getEach(sourceCat, bundleSizeStats.stat, true)])

  return bundleSizeStats
}

const runSpeedyCoreCodeStartStats = async (sourceCategory, targetCategory) => {
  const sourceCat = sourceCategory.filterCategory(['examples']).end()
  const targetCat = targetCategory.filterCategory(['examples']).end()

  const speedyCoreCodeStartStats = {
    stat: {},
    type: STAT_TYPE.SPEEDY_CORE_COLD_START_STATS,
    title: 'Speedy Cold Start Stats'
  }

  logger('generating speedyCoreColdStart stats...')

  const getEach = async (source, result, isSource) => {
    const currentDir = process.cwd()
    for (const [catName, pkgs] of Object.entries(source)) {
      result[catName] = result[catName] || []

      await chainPromise(
        pkgs.map((pkg) => {
          const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

          const configPath = path.join(pkg.absoluteFolder, 'speedy.config.ts')

          if (!fs.existsSync(configPath)) {
            logger.warn('Unable to find speedy config file for package: %s, at %s', pkg.packageName, configPath)
            return
          }

          return async () => {
            await repoInstallDep(pkg.absoluteFolder, ['sass'])
            process.chdir(pkg.absoluteFolder)

            const startTime = Date.now()
            const endTime = await new Promise(async (resolve) => {
              const Speedy = require(require.resolve('@speedy-js/speedy-core', {
                paths: [pkg.absoluteFolder]
              }))

              Speedy.SpeedyBundler.create({
                root: pkg.absoluteFolder,
                configFile: configPath,
                command: 'serve',
                plugins: [Speedy.devPlugin(), SpeedyCIPluginInitialization(resolve)]
              }).then((bundler) => {
                bundler.build()
              })
            }).then((compiler) => {
              compiler.close()
              compiler.hooks.shutdown.promise()
              return Date.now()
            })

            process.chdir(currentDir)

            logger(pkg.packageName)
            logger('   cold start time: %s', endTime - startTime)

            // [target, source]
            if (isSource) {
              packageResult[1] = [pkg, startTime, endTime]
            } else {
              packageResult[0] = [pkg, startTime, endTime]
            }
          }
        })
      )
    }
  }

  await chainPromise([
    () => getEach(targetCat, speedyCoreCodeStartStats.stat, false),
    () => getEach(sourceCat, speedyCoreCodeStartStats.stat, true)
  ])

  return speedyCoreCodeStartStats
}

const runStats = async (sourceDir, targetDir) => {
  const sourceCategory = CategorizedProjectsUtilities.create(sourceDir)
  const targetCategory = CategorizedProjectsUtilities.create(targetDir)

  const nodeModulesStats = await runNodeModulesStats(sourceCategory, targetCategory)
  const bundleSizeStats = await runBundleSizeStatus(sourceCategory, targetCategory)
  const speedyCoreCodeStartStats = await runSpeedyCoreCodeStartStats(sourceCategory, targetCategory)

  const result = await finalizer([speedyCoreCodeStartStats, bundleSizeStats, nodeModulesStats])

  logger(`finalized result:\n\n${JSON.stringify(result, null, 2)}`)

  await wrapReport(result)
}

const wrapReport = async (result) => {
  const { result: summary, warn } = result

  logger('Emitting report for CI...')

  if (actionInfo.customCommentEndpoint || (actionInfo.githubToken && actionInfo.commentEndpoint)) {
    logger(`Posting results to ${actionInfo.commentEndpoint}`)

    const body = {
      body: summary,
      ...(!actionInfo.githubToken
        ? {
            isRelease: actionInfo.isRelease,
            commitId: actionInfo.commitId,
            issueId: actionInfo.issueId
          }
        : {})
    }

    if (actionInfo.customCommentEndpoint) {
      logger(`Using body ${JSON.stringify({ ...body, body: 'OMITTED' })}`)
    }

    try {
      const res = await fetch(actionInfo.commentEndpoint, {
        method: 'POST',
        headers: {
          ...(actionInfo.githubToken
            ? {
                Authorization: `bearer ${actionInfo.githubToken}`
              }
            : {
                'content-type': 'application/json'
              })
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        logger.error(`Failed to post results ${res.status}`)
        try {
          logger.error(await res.text())
        } catch (_) {
          /* no-op */
        }
      } else {
        logger('Successfully posted results')
      }
    } catch (err) {
      logger.error('Error occurred posting results', err)
    }
  } else {
    logger('Not posting results', actionInfo.githubToken ? 'No comment endpoint' : 'no GitHub token')
  }
}

const run = async () => {
  fs.ensureDirSync(WORKING_DIR)
  fs.ensureDirSync(TARGET_DIR)

  logger('preparing target repo...')
  // await cloneRepo(prRepo, TARGET_DIR);
  // await checkoutRef(TARGET_BRANCH, TARGET_DIR);
  // await repoBootstrap(TARGET_DIR);
  await repoBuild(TARGET_DIR)

  logger('running stats for current merge request...')
  await runStats(SOURCE_DIR, TARGET_DIR)
}

export { run }
