import type { SpeedyBundler } from '@speedy-js/speedy-core'

let count = 0

function PluginDev () {
  const PLUGIN_NAME = 'speedy-plugin-dev'

  return {
    name: PLUGIN_NAME,
    apply (compiler: SpeedyBundler) {
      compiler.hooks.startCompilation.tapPromise(PLUGIN_NAME, async () => {
        console.log('PluginDev: startCompilation', count++)
      })
    }
  }
}

export { PluginDev }
