import path from 'path'
import fs from 'fs-extra'

import { SpeedyConfig } from '../../speedy/utils'
import { actionInfo } from '../../prepare/action-info'
import { PerformancePluginFixture, PluginBenchmark, RunFixtureCtxt } from '../base'
import { getLastCommitId, writeProfileToGitHubWithRetry } from '../../utils'

class BuildProfile extends PerformancePluginFixture {
  static id = 'build-profile-plugin'
  static title = 'Profile'

  async runEach (ctxt: RunFixtureCtxt): Promise<PluginBenchmark | void> {
    const { tmpBenchmarkDir, benchmarkConfig } = ctxt

    const { configPath } = this.checkFixtureStatus(ctxt)

    const speedyConfig = new SpeedyConfig(configPath)

    await speedyConfig.addProfile(true).write()

    await this.runSpeedy(tmpBenchmarkDir, 'build')

    await speedyConfig.restore()

    const speedyProfiles = (await fs.readdir(tmpBenchmarkDir)).filter(file => file.startsWith('speedy-profile'))

    console.log('generated speedy profiles', speedyProfiles)

    const generated = speedyProfiles[0]
    const renamed = `speedy-profile-${await getLastCommitId()}-${benchmarkConfig.name.split(' ').join('-').toLowerCase()}.cpuprofile`

    await fs.rename(path.join(tmpBenchmarkDir, generated), path.join(tmpBenchmarkDir, renamed))

    await writeProfileToGitHubWithRetry(path.join(tmpBenchmarkDir, renamed))

    for (const file of speedyProfiles) {
      const profilePath = path.join(tmpBenchmarkDir, file)
      await fs.remove(profilePath)
    }

    const profileUrl = `[Link to profile](https://cdn.jsdelivr.net/gh/speedy-js/speedy-profiles/${renamed})`

    return {
      metrics: [{
        id: 'profile',
        title: 'Profile',
        value: profileUrl
      }]
    }
  }
}

export { BuildProfile }
