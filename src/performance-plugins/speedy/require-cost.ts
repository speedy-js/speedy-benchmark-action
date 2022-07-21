import { performance } from 'perf_hooks'

import { RushKit } from '../../utils'
import { PerformancePluginSpeedy, PluginBenchmark, Project } from '../base'

class RequireCost extends PerformancePluginSpeedy {
  static id = 'require-cost-plugin'
  static title = 'Require Cost'

  getPackages (rushKit: RushKit) {
    return rushKit.filterShortDir('speedy-core').end()!
  }

  async runEach (project: Project): Promise<PluginBenchmark> {
    const folder = project.absoluteFolder

    const oldRequireCache = require.cache
    require.cache = Object.create(null)

    global.unregisterEsbuild()

    const entrypoint = require.resolve(folder)
    console.log('[RequireCost] requiring entrypoint', entrypoint)

    const startTime = performance.now()
    require(entrypoint)
    const endTime = performance.now()

    global.registerEsbuild()

    require.cache = oldRequireCache

    return {
      metrics: [{
        id: 'require-cost',
        title: 'Require cost',
        value: endTime - startTime,
        format: 'ms'
      }]
    }
  }
}

export { RequireCost }
