import fs from 'fs-extra'

class SpeedyConfig {
  public originalContent: string
  public content: string

  constructor (public configFile: string) {
    this.originalContent = fs.readFileSync(configFile, 'utf-8')
    this.content = this.originalContent
  }

  private addImport (importStr: string) {
    this.content = importStr + ';\n' + this.content
  }

  public addPlugin (importStr: string, code: string) {
    this.addImport(importStr)
    this.content = this.content.replace(/plugins:\s*\[/g, `plugins: [${code}, `)
    console.log(`Added plugin ${code}`, this.content)
    return this
  }

  async write () {
    await fs.writeFile(this.configFile, this.content, 'utf-8')
  }

  async restore () {
    await fs.writeFile(this.configFile, this.originalContent)
  }
}

export { SpeedyConfig }
