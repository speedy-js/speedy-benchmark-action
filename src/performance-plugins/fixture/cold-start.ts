import fs from 'fs-extra'
import path from 'path'

import { SpeedyConfig } from '../../speedy/utils'
import { PerformancePluginFixture, PluginBenchmark, RunFixtureCtxt } from '../base'

class ColdStartPlugin extends PerformancePluginFixture {
  static id = 'cold-start-plugin'
  static title = 'Cold start'

  async runEach ({ benchmarkConfig, tmpBenchmarkDir }: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const { name } = benchmarkConfig

    const configPath = path.join(tmpBenchmarkDir, 'speedy.config.ts')

    if (!fs.existsSync(configPath)) {
      console.warn('Unable to find speedy config file for package: %s, at %s', name, configPath)
    }

    const speedyConfig = new SpeedyConfig(configPath)

    await speedyConfig
      .addPlugin(`import { SpeedyCIPluginInitialization } from "${path.resolve(__dirname, '../../speedy/plugins/SpeedyCIPluginInitialization')}"`, 'SpeedyCIPluginInitialization()')
      .write()

    const startTime = Date.now()
    await this.runSpeedy(tmpBenchmarkDir, 'dev')
    const endTime = Date.now()

    speedyConfig.restore()

    return {
      metrics: [{
        id: 'cold-start-diff',
        title: 'Cold Start Diff',
        value: endTime - startTime,
        format: 'ms'
      }]
    }
  }
}

export { ColdStartPlugin }
