import path from 'path'

import { PerformancePluginFixture, PluginBenchmark, RunFixtureCtxt } from '../base'

class ColdStartPlugin extends PerformancePluginFixture {
  static id = 'cold-start-plugin'
  static title = 'Cold start'

  async runEach ({ tmpBenchmarkDir }: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const speedyConfig = this.getSpeedyConfig(tmpBenchmarkDir)

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
