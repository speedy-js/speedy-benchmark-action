import path from 'path'
import fs from 'fs-extra'
import { performance } from 'perf_hooks'

import type { SpeedyBundler } from '@speedy-js/speedy-core'

const MAX_COUNT = 4
let count = 0

function SpeedyCIPluginDev () {
  const PLUGIN_NAME = 'speedy-plugin-dev'
  type Count = number
  type StartTime = number
  type EndTime = number
  const time = new Map<Count, [StartTime?, EndTime?]>()

  return {
    name: PLUGIN_NAME,
    apply (compiler: SpeedyBundler) {
      const input = compiler.config.input
      const entrypoint = Object.values(input)[0]
      console.log('[PluginDev]: entrypoint', entrypoint)

      let entryContent = fs.readFileSync(entrypoint, 'utf-8')
      const originalEntryContent = entryContent
      console.log('[PluginDev]: entryContent', entryContent)

      compiler.hooks.startCompilation.tapPromise(PLUGIN_NAME, async () => {
        console.log('PluginDev: startCompilation, count:', ++count)
        if (count > 1) {
          time.set(count, [performance.now()])
        }
       })

      compiler.hooks.endCompilation.tapPromise(PLUGIN_NAME, async () => {
        const endTime = performance.now()
        if (count > 1) {
          const timeResult = time.get(count)

          if (timeResult) {
            const startTime = timeResult[0]!
            time.set(count, [startTime, endTime])
          } else {
            throw new Error('PluginDev: unable to get start time')
          }
        }

        if (count === MAX_COUNT) {
          // write to file
          await fs.writeFile(path.join(compiler.config.root, 'speedy-benchmark-dev-profile.json'), JSON.stringify(Array.from(time.values()), null, 2))
          await fs.writeFile(entrypoint, originalEntryContent, 'utf-8')
          process.exit(0)
        } else {
          setTimeout(() => {
            fs.writeFileSync(entrypoint, (entryContent = entryContent + '\nconsole.log()'), 'utf8')
          }, 2000)
        }
      })
    }
  }
}

export { SpeedyCIPluginDev }
