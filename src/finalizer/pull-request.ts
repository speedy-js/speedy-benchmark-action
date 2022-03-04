import fetch from 'node-fetch'

import { speedyPlugins, fixturePlugins, PerformancePluginFixture, PerformancePluginSpeedy } from '../performance-plugins'
import { SpeedyBenchmarkCompared, FixtureBenchmarkCompared } from '../utils/compare-benchmarks'

class PullRequest {
  constructor (public speedyComparison: SpeedyBenchmarkCompared, public fixtureComparison: FixtureBenchmarkCompared) {}

  finalize () {
    const speedyComparison = this.speedyComparison
    const fixtureComparison = this.fixtureComparison

    Object.entries(speedyComparison).map(([pluginId, metrics]) => {
      const plugin = Object.values(speedyPlugins).find((plugin) => pluginId === plugin.id)

      if (!plugin) {
        console.warn(`Unable to find plugin with id: ${pluginId}`)
        return null
      }

      return {
        // title,
        // columns
      }
    }).filter((item): item is any => Boolean(item))
  }
}

export { PullRequest }
