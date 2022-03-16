import fs from 'fs-extra'

import { getEntryPoint, getDirFileSize } from '../../utils'
import { PerformancePluginFixture, RunFixtureCtxt, PluginBenchmark } from '../base'

class DistSizePlugin extends PerformancePluginFixture {
  static id = 'dist-size-plugin'
  static title = 'Dist size'

  async runEach ({ tmpBenchmarkDir }: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const dirPath = await getEntryPoint(tmpBenchmarkDir)

    if (!dirPath || !await fs.pathExists(dirPath)) {
      return
    }

    const distFileSize = await getDirFileSize(tmpBenchmarkDir)

    const metrics = distFileSize.map((file) => {
      return { id: file.path, title: file.path, value: file.size, format: 'bytes' } as const
    }).sort((a, b) => {
      return a.title.length - b.title.length
    })

    return {
      metrics
    }
  }
}

export { DistSizePlugin }
