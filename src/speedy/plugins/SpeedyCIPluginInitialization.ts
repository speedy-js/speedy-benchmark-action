function SpeedyCIPluginInitialization (resolve) {
  const PLUGIN_NAME = 'SpeedyCIPluginInitialization'
  return {
    name: PLUGIN_NAME,
    apply (compiler) {
      compiler.hooks.done.tapPromise(PLUGIN_NAME, async () => {
        resolve(compiler)
      })
    }
  }
}

export { SpeedyCIPluginInitialization }
