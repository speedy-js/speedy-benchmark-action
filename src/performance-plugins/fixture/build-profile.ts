import path from 'path'
import fs from 'fs-extra'

import { SpeedyConfig } from '../../speedy/utils'
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

    console.log('Running profile in', await fs.readdir(tmpBenchmarkDir))
    console.log('tmpBenchmark dir is ', tmpBenchmarkDir)

    const renamed = `speedy-profile-${await getLastCommitId(tmpBenchmarkDir)}-${benchmarkConfig.name.split(' ').join('-').toLowerCase()}-${Date.now()}.cpuprofile`

    await fs.rename(path.join(tmpBenchmarkDir, generated), path.join(tmpBenchmarkDir, renamed))

    await writeProfileToGitHubWithRetry(path.join(tmpBenchmarkDir, renamed))

    for (const file of speedyProfiles) {
      const profilePath = path.join(tmpBenchmarkDir, file)
      await fs.remove(profilePath)
    }

    const profileUrl = `https://cdn.jsdelivr.net/gh/speedy-js/speedy-profiles/${renamed}`

    const profileViewerUrl = `[Link to profile](https://www.speedscope.app/#profileURL=${encodeURIComponent(profileUrl)})`

    return {
      metrics: [{
        id: 'profile',
        title: 'Profile',
        value: profileViewerUrl
      }]
    }
  }
}

export { BuildProfile }
