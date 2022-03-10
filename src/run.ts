import path from 'path'
import fs from 'fs-extra'
import urlJoin from 'url-join'
import os from 'os'

import { actionInfo } from './prepare/action-info'
import { repoBootstrap, repoBuild, cloneRepo, checkoutRef } from './prepare/repo-setup'

import { RushKit, pnpmInstall, yarnLink, yarnUnlink, compareFixtureBenchmarks, compareSpeedyBenchmarks } from './utils'
import { speedyPlugins as performancePluginsSpeedy, fixturePlugins as performancePluginsFixture, PerformancePluginFixture, PerformancePluginSpeedy } from './performance-plugins'

import { REPO_BRANCH, REPO_NAME, REPO_OWNER } from './constants'

import { PullRequestFinalizer } from './finalizer/index'
import { BenchmarkConfig, FixtureBenchmark, SpeedyBenchmark } from './types'

export const tmpRoot = process.env.SPEEDY_BENCH_TMP || os.tmpdir() + Date.now()
export const isDebug = process.env.NODE_ENV === 'debug'

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
  if (isDebug) {
    console.log('Debug mode, skip speedystack cloning/bootstrap/build...')
  } else {
    console.log(`Cloning ${repoUrl}...`)
    await cloneRepo(repoUrl, outputDir)
    await checkoutRef(branch, outputDir)

    console.log(`Bootstrapping ${repoUrl}`)
    await repoBootstrap(outputDir)

    console.log(`Building ${repoUrl}`)
    await repoBuild(outputDir)
  }

  return RushKit.fromRushDir(outputDir)
}

const setupFixtureBenchmarks = async (opts: {
  benchmarkDir: string
  speedyPackages: RushKit
}) => {
  const { benchmarkDir, speedyPackages } = opts
  const sourceBenchmarkDir = path.join(__dirname, '../', 'benchmarks', benchmarkDir)
  const tmpBenchmarkDir = path.join(tmpRoot, `.tmp/${benchmarkDir.split('/').join('-')}`)

  if (isDebug) {
    console.log('Debug mode, skip copying benchmark fixtures...')
  } else {
    // Make a temporary benchmark copy
    await fs.copy(sourceBenchmarkDir, tmpBenchmarkDir, { recursive: true })

    // Use pnpm to install examples
    await pnpmInstall(tmpBenchmarkDir)
  }

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
    const pluginId = (plugin.constructor as typeof PerformancePluginFixture).id
    if (pluginIds.includes(pluginId)) {
      console.error(`Plugin ${pluginId} already exists`)
    }
    pluginIds.push(pluginId)
  })

  const fixtureBenchmarks = []

  for (const plugin of pluginInst) {
    const res = await plugin.runEach({
      benchmarkConfig,
      tmpBenchmarkDir
    })
    if (res) {
      fixtureBenchmarks.push({
        ...res,
        pluginId: (plugin.constructor as typeof PerformancePluginFixture).id,
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
    const pluginId = (plugin.constructor as typeof PerformancePluginSpeedy).id
    if (pluginIds.includes(pluginId)) {
      console.error(`Plugin ${pluginId} already exists`)
    }
    pluginIds.push(pluginId)
  })

  const speedyBenchmarks = []

  for (const plugin of pluginInst) {
      const pkgs = (await plugin.getPackages?.(speedyPackages.clone())) || speedyPackages.clone().projects

    for (const pkg of Object.values(pkgs).flat()) {
      const res = await plugin.runEach(pkg)
      const pluginId = (plugin.constructor as typeof PerformancePluginSpeedy).id

      if (res) {
        speedyBenchmarks.push({
          ...res,
          pluginId,
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
  if (isDebug) {
    console.log('Debug mode, skip cleaning mainDir', mainDir)
  } else {
    console.log(`Cleaning up ${mainDir}`)
    await fs.remove(mainDir)
  }
  const mainSpeedyPackages = await setupSpeedy({
    outputDir: mainDir,
    repoUrl: urlJoin(REPO_OWNER, REPO_NAME),
    branch: REPO_BRANCH
  })

  // Setup PR copy of Speedy
  const prDir = path.join(tmpRoot, '.tmp/pr')
  if (isDebug) {
    console.log('Debug mode, skip cleaning prDir', prDir)
  } else {
    console.log(`Cleaning up ${prDir}`)
    await fs.remove(prDir)
  }
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

  const pullRequest = new PullRequestFinalizer(speedyBenchmarksCompared, fixtureBenchmarksCompared)

  await pullRequest.finalize()
}

export { run }
