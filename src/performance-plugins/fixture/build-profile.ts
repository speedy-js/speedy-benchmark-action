import path from 'path'
import fs from 'fs-extra'

import { SpeedyConfig } from '../../speedy/utils'
import { artifactClient } from '../../utils'
import { actionInfo } from '../../prepare/action-info'
import { PerformancePluginFixture, PluginBenchmark, RunFixtureCtxt } from '../base'

class BuildProfile extends PerformancePluginFixture {
  static id = 'build-profile-plugin'
  static title = 'Profile'

  async runEach (ctxt: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const { tmpBenchmarkDir } = ctxt

    const { configPath } = this.checkFixtureStatus(ctxt)

    const speedyConfig = new SpeedyConfig(configPath)

    await speedyConfig.addProfile(true).write()

    await this.runSpeedy(tmpBenchmarkDir, 'build')

    await speedyConfig.restore()

    const speedyProfiles = (await fs.readdir(tmpBenchmarkDir)).filter(file => file.startsWith('speedy-profile'))

    console.log('generated speedy profiles', speedyProfiles)

    const generated = speedyProfiles[0]
    const renamed = `speedy-profile-${actionInfo.prRef}.cpuprofile`

    await fs.rename(path.join(tmpBenchmarkDir, generated), path.join(tmpBenchmarkDir, renamed))

    for (const file of speedyProfiles) {
      await fs.unlink(path.join(tmpBenchmarkDir, file))
    }

    return {
      metrics: [{
        id: 'cold-start-diff',
        title: 'Cold Start Diff',
        value: 'result'
      }]
    }
  }
}

export { BuildProfile }
