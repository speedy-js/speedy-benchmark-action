import path from 'path'

import { getDirSize, RushKit } from '../../utils'
import { PerformancePluginSpeedy, PluginBenchmark, Project } from '../base'

class NodeModulesPlugin extends PerformancePluginSpeedy {
  id = 'node-modules-plugin'
  title = 'Node Modules Size'

  getPackages (rushKit: RushKit) {
    return rushKit.filterCategory('packages').projects
  }

  async runEach (project: Project): Promise<PluginBenchmark> {
    const size = await getDirSize(path.join(project.absoluteFolder, 'node_modules'))
    return {
      metrics: [{
        id: 'node-modules-size',
        title: 'Node Module Size',
        value: size,
        format: 'bytes'
      }]
    }
  }
}

export { NodeModulesPlugin }
