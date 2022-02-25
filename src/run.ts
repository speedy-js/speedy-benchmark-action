import path from 'path'
import fs from 'fs-extra'
import fetch from 'node-fetch'
import urlJoin from 'url-join'
import os from 'os'

import { repoSetup } from './prepare/repo-setup'
import getActionInfo from './prepare/action-info'

import { RushKit, logger, getDirSize, chainPromise, getEntryPoint, emitAssets, pnpmInstall, pnpmLink, Project } from './utils'
import { SpeedyCIPluginInitialization } from './speedy/plugins'
import { speedyPlugins as performancePluginsSpeedy, fixturePlugins as performancePluginsFixture } from './performance-plugins'

import { REPO_BRANCH, STAT_TYPE, REPO_NAME, REPO_OWNER } from './constants'

import { finalizer } from './finalizer'
import { PerformancePluginFixture, PerformancePluginSpeedy } from './performance-plugins/base'
import { BenchmarkConfig, FixtureBenchmark, SpeedyBenchmark } from './types'
import { yarnLink, yarnUnlink } from './utils/yarn'
import { compareFixtureBenchmarks, compareSpeedyBenchmarks } from './utils/compare-benchmarks'

const actionInfo = getActionInfo()

const { repoBootstrap, repoBuild, repoInstallDep, cloneRepo, checkoutRef } = repoSetup(actionInfo)

// const NODE_MODULES_TEST_FOLDERS = ['packages', 'tools', 'private-packages']

// /**
//  * Run nodeModules stats
//  * @param {RushKit} sourceCategory
//  * @param {RushKit} targetCategory
//  */
// const runNodeModulesStats = async (sourceCategory, targetCategory) => {
//   const sourceCat = sourceCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()
//   const targetCat = targetCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()

//   const nodeModulesStats = {
//     stat: {},
//     type: STAT_TYPE.NODE_MODULES_STATS,
//     title: 'Node Modules Stats'
//   }

//   logger('generating nodeModules stats...')

//   const getEach = async (source, result, isSource) => {
//     for (const [catName, pkgs] of Object.entries(source)) {
//       result[catName] = result[catName] || {}

//       await Promise.all(
//         pkgs.map(async (pkg) => {
//           const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

//           const size = await getDirSize(pkg.absoluteFolder)
//           logger(`${pkg.packageName}`)
//           logger(`   size: ${size}`)

//           // [target, source]
//           if (isSource) {
//             packageResult[1] = [pkg, size]
//           } else {
//             packageResult[0] = [pkg, size]
//           }
//         })
//       )
//     }
//   }

//   await Promise.all([
//     getEach(targetCat, nodeModulesStats.stat, false),
//     getEach(sourceCat, nodeModulesStats.stat, true)
//   ])

//   return nodeModulesStats
// }

// /**
//  * Run nodeModules stats
//  * @param {RushKit} sourceCategory
//  * @param {RushKit} targetCategory
//  */
// const runBundleSizeStatus = async (sourceCategory, targetCategory) => {
//   const sourceCat = sourceCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()
//   const targetCat = targetCategory.filterCategory(NODE_MODULES_TEST_FOLDERS).end()

//   const bundleSizeStats = {
//     stat: {},
//     type: STAT_TYPE.BUNDLE_SIZE_STATS,
//     title: 'Bundle Size Stats'
//   }

//   logger('generating bundleSize stats...')

//   const getEach = async (source, result, isSource) => {
//     for (const [catName, pkgs] of Object.entries(source)) {
//       result[catName] = result[catName] || []

//       await Promise.all(
//         pkgs.map(async (pkg) => {
//           const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

//           const entryPoint = await getEntryPoint(pkg.absoluteFolder)

//           if (!entryPoint) {
//             return
//           }

//           const size = await getDirSize(entryPoint)
//           logger(`${pkg.packageName}`)
//           logger(`   entryPoint: ${entryPoint}`)
//           logger(`   size: ${size}`)

//           // [target, source]
//           if (isSource) {
//             packageResult[1] = [pkg, size]
//           } else {
//             packageResult[0] = [pkg, size]
//           }
//         })
//       )
//     }
//   }

//   await Promise.all([getEach(targetCat, bundleSizeStats.stat, false), getEach(sourceCat, bundleSizeStats.stat, true)])

//   return bundleSizeStats
// }

// const runSpeedyCoreCodeStartStats = async (sourceCategory, targetCategory) => {
//   const sourceCat = sourceCategory.filterCategory(['examples']).end()
//   const targetCat = targetCategory.filterCategory(['examples']).end()

//   const speedyCoreCodeStartStats = {
//     stat: {},
//     type: STAT_TYPE.SPEEDY_CORE_COLD_START_STATS,
//     title: 'Speedy Cold Start Stats'
//   }

//   logger('generating speedyCoreColdStart stats...')

//   const getEach = async (source, result, isSource) => {
//     const currentDir = process.cwd()
//     for (const [catName, pkgs] of Object.entries(source)) {
//       result[catName] = result[catName] || []

//       await chainPromise(
//         pkgs.map((pkg) => {
//           const packageResult = (result[catName][pkg.packageName] = result[catName][pkg.packageName] || [])

//           const configPath = path.join(pkg.absoluteFolder, 'speedy.config.ts')

//           if (!fs.existsSync(configPath)) {
//             logger.warn('Unable to find speedy config file for package: %s, at %s', pkg.packageName, configPath)
//             return () => Promise.resolve()
//           }

//           return async () => {
//             await repoInstallDep(pkg.absoluteFolder, ['sass'])
//             process.chdir(pkg.absoluteFolder)

//             const startTime = Date.now()
//             const endTime = await new Promise(async (resolve) => {
//               // eslint-disable-next-line @typescript-eslint/no-var-requires
//               const Speedy = require(require.resolve('@speedy-js/speedy-core', {
//                 paths: [pkg.absoluteFolder]
//               }))

//               Speedy.SpeedyBundler.create({
//                 root: pkg.absoluteFolder,
//                 configFile: configPath,
//                 command: 'serve',
//                 plugins: [Speedy.devPlugin(), SpeedyCIPluginInitialization(resolve)]
//               }).then((bundler) => {
//                 bundler.build()
//               })
//             }).then((compiler) => {
//               compiler.close()
//               compiler.hooks.shutdown.promise()
//               return Date.now()
//             })

//             process.chdir(currentDir)

//             logger(pkg.packageName)
//             logger('   cold start time: %s', endTime - startTime)

//             // [target, source]
//             if (isSource) {
//               packageResult[1] = [pkg, startTime, endTime]
//             } else {
//               packageResult[0] = [pkg, startTime, endTime]
//             }
//           }
//         })
//       )
//     }
//   }

//   await chainPromise([
//     () => getEach(targetCat, speedyCoreCodeStartStats.stat, false),
//     () => getEach(sourceCat, speedyCoreCodeStartStats.stat, true)
//   ])

//   return speedyCoreCodeStartStats
// }

// const runStats = async (sourceDir: string, targetDir: string) => {
//   const sourceCategory = RushKit.create(sourceDir)
//   const targetCategory = RushKit.create(targetDir)

//   const nodeModulesStats = await runNodeModulesStats(sourceCategory, targetCategory)
//   const bundleSizeStats = await runBundleSizeStatus(sourceCategory, targetCategory)
//   const speedyCoreCodeStartStats = await runSpeedyCoreCodeStartStats(sourceCategory, targetCategory)

//   const result = await finalizer([speedyCoreCodeStartStats, bundleSizeStats, nodeModulesStats])

//   logger(`finalized result:\n\n${JSON.stringify(result, null, 2)}`)

//   await wrapReport(result)
// }

// const wrapReport = async (result) => {
//   const { result: summary, warn } = result

//   logger('Emitting report for CI...')

//   if (actionInfo.customCommentEndpoint || (actionInfo.githubToken && actionInfo.commentEndpoint)) {
//     logger(`Posting results to ${actionInfo.commentEndpoint}`)

//     const body = {
//       body: summary,
//       ...(!actionInfo.githubToken
//         ? {
//             isRelease: actionInfo.isRelease,
//             commitId: actionInfo.commitId,
//             issueId: actionInfo.issueId
//           }
//         : {})
//     }

//     if (actionInfo.customCommentEndpoint) {
//       logger(`Using body ${JSON.stringify({ ...body, body: 'OMITTED' })}`)
//     }

//     try {
//       const res = await fetch(actionInfo.commentEndpoint, {
//         method: 'POST',
//         headers: {
//           ...(actionInfo.githubToken
//             ? {
//                 Authorization: `bearer ${actionInfo.githubToken}`
//               }
//             : {
//                 'content-type': 'application/json'
//               })
//         },
//         body: JSON.stringify(body)
//       })

//       if (!res.ok) {
//         logger.error(`Failed to post results ${res.status}`)
//         try {
//           logger.error(await res.text())
//         } catch (_) {
//           /* no-op */
//         }
//       } else {
//         logger('Successfully posted results')
//       }
//     } catch (err) {
//       logger.error('Error occurred posting results', err)
//     }
//   } else {
//     logger('Not posting results', actionInfo.githubToken ? 'No comment endpoint' : 'no GitHub token')
//   }
// }

const tmpRoot = '/var/folders/7k/vj8hldbj0vx_psy70ml9b4qm0000gn/T1646041720890' || os.tmpdir() + Date.now()

const setupSpeedy = async ({
  outputDir,
  repoUrl,
  branch
}: {
  outputDir: string
  repoUrl: string
  branch: string
}) => {
  // Setup speedystack clone
  // await cloneRepo(repoUrl, outputDir)
  // await checkoutRef(branch, outputDir)

  console.log(`Bootstrapping ${repoUrl}`)
  // await repoBootstrap(outputDir)

  console.log(`Building ${repoUrl}`)
  // await repoBuild(outputDir)

  return RushKit.fromRushDir(outputDir)
}

const setupFixtureBenchmarks = async (opts: {
  benchmarkDir: string
  speedyPackages: RushKit
}) => {
  const { benchmarkDir, speedyPackages } = opts
  const sourceBenchmarkDir = path.join(__dirname, '../', 'benchmarks', benchmarkDir)
  const tmpBenchmarkDir = path.join(tmpRoot, `.tmp/${benchmarkDir.split('/').join('-')}-${Date.now()}`)

  // Make a temporary benchmark copy
  await fs.copy(sourceBenchmarkDir, tmpBenchmarkDir, { recursive: true })

  // Use pnpm to install examples
  await pnpmInstall(tmpBenchmarkDir)

  const packageJSON = await import(path.join(tmpBenchmarkDir, 'package.json'))
  const deps = { ...packageJSON.dependencies, ...packageJSON.devDependencies }
  const speedyDeps = [
    ...Object.keys(deps).filter((dep) => /^@speedy-js/.test(dep))
  ]

  // Link speedy packages to the temporary benchmark directory
  const linkedDeps: {
    pkgName: string
    directory: string
  }[] = []
  for (const speedyDep of speedyDeps) {
    await Object.values(speedyPackages.projects).flat()
      .filter(p => p.packageName === speedyDep).reduce(async (prev, curr) => {
          await prev
          // Use yarn link as pnpm link would not recognize `workspaces:*` defined in other packages
          console.log(`Linking ${curr.packageName} from ${curr.absoluteFolder} to ${tmpBenchmarkDir}`)

          linkedDeps.push({
            pkgName: curr.packageName,
            directory: path.join(tmpBenchmarkDir)
          })
          try {
            await yarnUnlink(curr.packageName)
          } catch (err) {}
          // Link it to global
          await yarnLink(curr.absoluteFolder)
          // Then link it to fixture
          await yarnLink(tmpBenchmarkDir, curr.packageName)
      }, Promise.resolve())
  }

  return { linkedDeps, tmpBenchmarkDir }
}

const cleanupBenchmarks = async (tmpDir: string, linkedDeps: {
  pkgName: string
  directory: string
}[]) => {
  for (const { pkgName, directory } of linkedDeps) {
    console.log(`Unlinking ${pkgName} for ${directory}`)
    await yarnUnlink(directory, pkgName)
  }

  await fs.remove(tmpDir)
}

const runFixtureBenchmarks = async <T extends {
  new(): (InstanceType<typeof PerformancePluginFixture>)
}>(opts: {
  plugins: T[]
  speedyPackages: RushKit
  benchmarkConfig: BenchmarkConfig
}): Promise<FixtureBenchmark[]> => {
  const { plugins, speedyPackages, benchmarkConfig } = opts

  const { linkedDeps, tmpBenchmarkDir } = await setupFixtureBenchmarks({
    benchmarkDir: benchmarkConfig.directory,
    speedyPackages
  })

  const pluginIds: string[] = []
  const pluginInst = Array.from(new Set(plugins)).map(Ctor => new Ctor())
  pluginInst.forEach(plugin => {
      if (pluginIds.includes(plugin.id)) {
        console.error(`Plugin ${plugin.id} already exists`)
      }
      pluginIds.push(plugin.id)
  })

  const fixtureBenchmarks = []

  for (const plugin of pluginInst) {
    const res = await plugin.runEach({
      benchmarkConfig
    })
    if (res) {
      fixtureBenchmarks.push({
        ...res,
        pluginId: plugin.id,
        fixture: benchmarkConfig
      })
    }
  }

  // Do some cleanups
  await cleanupBenchmarks(tmpBenchmarkDir, linkedDeps)

  return fixtureBenchmarks
}

const runSpeedyBenchmarks = async <T extends {
  new(): (InstanceType<typeof PerformancePluginSpeedy>)
}>(opts: {
  plugins: T[]
  speedyPackages: RushKit
}): Promise<SpeedyBenchmark[]> => {
  const { plugins, speedyPackages } = opts

  const pluginIds: string[] = []
  const pluginInst = Array.from(new Set(plugins)).map(Ctor => new Ctor())
  pluginInst.forEach(plugin => {
    if (pluginIds.includes(plugin.id)) {
      console.error(`Plugin ${plugin.id} already exists`)
    }
    pluginIds.push(plugin.id)
  })

  const speedyBenchmarks = []

  for (const plugin of pluginInst) {
      const pkgs = (await plugin.getPackages?.(speedyPackages.clone())) || speedyPackages.clone().projects

    for (const pkg of Object.values(pkgs).flat()) {
      const res = await plugin.runEach(pkg)

      if (res) {
        speedyBenchmarks.push({
          ...res,
          pluginId: plugin.id,
          pkg
        })
      }
    }
  }
  return speedyBenchmarks
}

const run = async () => {
  // Setup main copy of Speedy
  const mainDir = path.join(tmpRoot, '.tmp/main')
  console.log(`Cleaning up ${mainDir}`)
  // await fs.remove(mainDir)
  console.log(`Cloning ${urlJoin(REPO_OWNER, REPO_NAME)}`)
  const mainSpeedyPackages = await setupSpeedy({
    outputDir: mainDir,
    repoUrl: urlJoin(REPO_OWNER, REPO_NAME),
    branch: REPO_BRANCH
  })

  // Setup PR copy of Speedy
  const prDir = path.join(tmpRoot, '.tmp/pr')
  console.log(`Cleaning up ${prDir}`)
  // await fs.remove(prDir)
  console.log(`Cloning ${actionInfo.prRepo}...`)
  const prSpeedyPackages = await setupSpeedy({
    outputDir: prDir,
    repoUrl: actionInfo.prRepo,
    branch: actionInfo.prRef
  })

  // Run benchmarks
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BENCHMARKS_CONFIG = require(path.join(__dirname, '../', 'benchmarks.json'))

  console.log('Benchmark config', JSON.stringify(BENCHMARKS_CONFIG, null, 4))

  console.log('Running benchmarks for speedy packages on main branch...')
  const mainSpeedyBenchmarks = await runSpeedyBenchmarks({
    plugins: Object.values(performancePluginsSpeedy),
    speedyPackages: mainSpeedyPackages
  })

  console.log('mainSpeedyBenchmarks', mainSpeedyBenchmarks)

  const mainFixtureBenchmarks = []
  for (const benchmarkConfig of BENCHMARKS_CONFIG) {
    console.log(`Running ${benchmarkConfig.name} on main branch...`)
    mainFixtureBenchmarks.push(await runFixtureBenchmarks({
      plugins: Object.values(performancePluginsFixture) as [],
      speedyPackages: mainSpeedyPackages,
      benchmarkConfig
    }))
  }

  console.log('Running benchmarks for speedy packages on pull request branch...')
  const prSpeedyBenchmarks = await runSpeedyBenchmarks({
    plugins: Object.values(performancePluginsSpeedy),
    speedyPackages: prSpeedyPackages
  })

  const prFixtureBenchmarks = []
  for (const benchmarkConfig of BENCHMARKS_CONFIG) {
    console.log(`Running ${benchmarkConfig.name} on pull request branch...`)
    prFixtureBenchmarks.push(await runFixtureBenchmarks({
      plugins: Object.values(performancePluginsFixture) as [],
      speedyPackages: prSpeedyPackages,
      benchmarkConfig
    }))
  }

  const speedyBenchmarksCompared = compareSpeedyBenchmarks(mainSpeedyBenchmarks, prSpeedyBenchmarks)
  const fixtureBenchmarksCompared = compareFixtureBenchmarks(mainFixtureBenchmarks.flat(), prFixtureBenchmarks.flat())

  console.log(speedyBenchmarksCompared)

  logger('running stats for current merge request...')
  // await runStats(SOURCE_DIR, TARGET_DIR)
}

export { run }
