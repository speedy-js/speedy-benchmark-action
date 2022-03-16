import fs from 'fs-extra'

import { getEntryPoint } from '../../utils'
import { PerformancePluginFixture, RunFixtureCtxt, PluginBenchmark } from '../base'

class DistSizePlugin extends PerformancePluginFixture {
  static id = 'dist-size-plugin'
  static title = 'Dist size'

  async runEach ({ benchmarkConfig, tmpBenchmarkDir }: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const dirPath = await getEntryPoint(tmpBenchmarkDir)

    if (!dirPath || !await fs.pathExists(dirPath)) {
      return
    }

    const dirent = await fs.readdir(dirPath, { withFileTypes: true })

    return {
      metrics: [{
        id: 'dist-size',
        title: 'Dist Size',
        value: 123,
        format: 'bytes'
      }]
    }
  }
}

export { DistSizePlugin }
