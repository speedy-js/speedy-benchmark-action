import { getDirSize, RushKit, getPackageEntry } from '../../utils'
import { PerformancePluginSpeedy, PluginBenchmark, Project } from '../base'

class BundleSizePlugin extends PerformancePluginSpeedy {
  static id = 'bundle-size-plugin'
  static title = 'Bundle Size'

  getPackages (rushKit: RushKit) {
    return rushKit.filterCategory('packages').end()!
  }

  async runEach (project: Project): Promise<PluginBenchmark | void> {
    const entryPoint = await getPackageEntry(project.absoluteFolder)

    if (!entryPoint) {
      return
    }

    const bundleSize = await getDirSize(entryPoint)

    return {
      metrics: [{
        id: 'bundle-size',
        title: 'Bundle Size',
        value: bundleSize,
        format: 'bytes'
      }]
    }
  }
}

export { BundleSizePlugin }
