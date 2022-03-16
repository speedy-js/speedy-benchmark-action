import type { SpeedyBundler } from '@speedy-js/speedy-core'

function SpeedyCIPluginInitialization () {
  const PLUGIN_NAME = 'SpeedyCIPluginInitialization'

  return {
    name: PLUGIN_NAME,
    apply (compiler: SpeedyBundler) {
      console.log('Registered plugin: ' + PLUGIN_NAME)

      compiler.hooks.done.tapPromise(PLUGIN_NAME, async () => {
        await compiler.close()
        await compiler.hooks.shutdown.promise()
        process.exit(0)
      })
    }
  }
}

export { SpeedyCIPluginInitialization }
