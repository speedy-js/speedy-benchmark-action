import fs from 'fs-extra'

const DEFAULT_SPEEDY_CONFIG = `
export = {
  plugins: []
}
`

const CODE_MOD_COMMENT = '/* __PERFORMANCE_CODE_MOD__ */'

const HELPER_FUNCTIONS = `
;function __isObject (item) {
  return Object.prototype.toString.call(item) === '[object Object]'
}

function __deepMerge(target, ...sources) {
  if (!sources.length) return target

  const source = sources.shift()

  if (__isObject(target) && __isObject(source)) {
    for (const key in source) {
      if (__isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        __deepMerge(target[key], source[key])
      } else if (key === "plugins") {
        // special case for plugin merging
        const plugins = [...(target.plugins || []), ...(source.plugins || [])]
        Object.assign(target, { plugins })
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return __deepMerge(target, ...sources)
};\n\n
`

type ConfigPath = string
// eslint-disable-next-line no-use-before-define
const speedyConfigCache = new Map<ConfigPath, SpeedyConfig>()

class SpeedyConfig {
  public originalContent!: string
  public content!: string

  private imports: Set<string> = new Set()
  private plugins: Set<string> = new Set()
  private profile: 'true' | 'false' | 'hooks' = 'false'

  constructor (public configFile: string) {
    let instance: SpeedyConfig | undefined
    // eslint-disable-next-line no-cond-assign
    if ((instance = speedyConfigCache.get(configFile))) {
      // Reset content to original content to avoid `speedy.config.ts` from been modified
      instance.content = instance.originalContent
      return instance
    }

    this.originalContent = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf-8').trim() : DEFAULT_SPEEDY_CONFIG
    this.content = this.originalContent
    speedyConfigCache.set(configFile, this)
  }

  private addImport (importStr: string) {
    this.imports.add(importStr)
  }

  public addPlugin (importStr: string, code: string) {
    this.addImport(importStr)
    this.plugins.add(code)
    return this
  }

  public addProfile (profile: boolean | 'hooks') {
    this.profile = String(profile) as 'true' | 'false' | 'hooks'
    return this
  }

  public generate () {
    const pluginCode = Array.from(this.plugins).join(',')
    const profile = this.profile

    let configCode = this.content
    const len = configCode.length

    if (this.content[len - 1] === ';') {
      configCode = configCode.slice(0, len - 1)
    }

    configCode = configCode.replace(/(export\s*=|export\s*default)/, 'export = __deepMerge(')
    configCode += ',' + CODE_MOD_COMMENT + ');\n\n' + HELPER_FUNCTIONS

    configCode = configCode.replace(CODE_MOD_COMMENT, `\n{ plugins: [${pluginCode}], profile: ${profile} }`)

    console.log(`Speedy profile generated for ${this.configFile}:`, configCode)

    configCode = Array.from(this.imports).join(';\n') + ';\n' + configCode

    return configCode
  }

  async write () {
    await fs.writeFile(this.configFile, this.generate(), 'utf-8')
  }

  async restore () {
    await fs.writeFile(this.configFile, this.originalContent)
  }
}

export { SpeedyConfig }
