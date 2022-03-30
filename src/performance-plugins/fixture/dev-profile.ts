import path from 'path'
import fs from 'fs-extra'

import { PerformancePluginFixture, PluginBenchmark, RunFixtureCtxt } from '../base'

class DevProfile extends PerformancePluginFixture {
  static id = 'dev-profile'
  static title = 'Dev profile'

  async runEach ({ tmpBenchmarkDir }: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const devProfile = path.join(tmpBenchmarkDir, 'speedy-benchmark-dev-profile.json')
    const speedyConfig = await this.getSpeedyConfig(tmpBenchmarkDir)

    await speedyConfig
      .addPlugin(`import { SpeedyCIPluginDev } from "${path.resolve(__dirname, '../../speedy/plugins/SpeedyCIPluginDev')}"`, 'SpeedyCIPluginDev()')
      .setCache({
        transform: false
      })
      .write()

    await this.runSpeedy(tmpBenchmarkDir, 'dev')

    await speedyConfig.restore()

    const hotReloadWithoutCache = await fs.readJSON(devProfile)

    await speedyConfig
      .addPlugin(`import { SpeedyCIPluginDev } from "${path.resolve(__dirname, '../../speedy/plugins/SpeedyCIPluginDev')}"`, 'SpeedyCIPluginDev()')
      .setCache({
        transform: true
      })
      .write()

    await this.runSpeedy(tmpBenchmarkDir, 'dev')

    await speedyConfig.restore()

    const hotReloadWithCache = await fs.readJSON(devProfile)

    const nocache1 = hotReloadWithoutCache[0][1] - hotReloadWithoutCache[0][0]
    const nocache2 = hotReloadWithoutCache[1][1] - hotReloadWithoutCache[1][0]
    const nocache3 = hotReloadWithoutCache[2][1] - hotReloadWithoutCache[2][0]
    const nocacheAvg = (nocache1 + nocache2 + nocache3) / 3

    const cache1 = hotReloadWithCache[0][1] - hotReloadWithCache[0][0]
    const cache2 = hotReloadWithCache[1][1] - hotReloadWithCache[1][0]
    const cache3 = hotReloadWithCache[2][1] - hotReloadWithCache[2][0]
    const cacheAvg = (cache1 + cache2 + cache3) / 3

    return {
      metrics: [{
        id: 'hot-reload-nocache-avg',
        title: 'Reload(avg.)',
        value: nocacheAvg,
        format: 'ms'
      }, {
        id: 'hot-reload-cache-avg',
        title: 'Reload(cached avg.)',
        value: cacheAvg,
        format: 'ms'
      }, {
        id: 'diff',
        title: 'Diff(cached - nocache)',
        value: cacheAvg - nocacheAvg,
        format: 'ms'
      }]
    }
  }
}

// (async () => {
//   const tmpBenchmarkDir = '/Users/hanabi/.tmp/speedy-benchmark-action/.tmp/benchmarks/apps/arco-pro'
//   const speedyConfig = new SpeedyConfig(path.join(tmpBenchmarkDir, 'speedy.config.ts'))
//   console.log(await speedyConfig.getConfig())

//   const speedyEntrypoint = require.resolve('@speedy-js/speedy-core', {
//     paths: [tmpBenchmarkDir]
//   })

//   const SpeedyBundler = require(speedyEntrypoint).SpeedyBundler

//   const bundler = await SpeedyBundler.create({
//     ...await speedyConfig.getConfig(),
//     root: tmpBenchmarkDir
//   }) as RawSpeedyBundler
//   await bundler.build()
//   await bundler.close?.()
//   console.log('done')
// })()

export { DevProfile }
