/* c8 ignore start */
import path from 'path'
import rushLib from '@microsoft/rush-lib'

const getProjects = (configFile) => {
  const rushConfiguration = configFile
    ? rushLib.RushConfiguration.loadFromConfigurationFile(configFile)
    : rushLib.RushConfiguration.loadFromDefaultLocation()

  const normalized = rushConfiguration.projects.map((project) => {
    return Object.assign(project, {
      shortFolder: path.basename(project.projectFolder),
      relativeFolder: project.projectRelativeFolder,
      absoluteFolder: project.projectFolder
    })
  })

  return normalized
}

const getCategorizedProjects = (configFile) => {
  return getProjects(configFile).reduce((categories, project) => {
    const category = path.basename(project.absoluteFolder.replace(`/${project.shortFolder}`, ''))

    if (!categories[category]) {
      categories[category] = []
    }

    categories[category].push(project)

    return categories
  }, {})
}

class CategorizedProjectsUtilities {
  constructor (categorized) {
    this.projects = categorized || {}
    this.pending = null
  }

  /**
   * @private
   */
  get toFilter () {
    return this.pending || this.projects
  }

  /**
   * filter category
   * @param {string[] | string} categoryName
   */
  filterCategory (categoryName) {
    categoryName = Array.isArray(categoryName) ? categoryName : [categoryName]

    this.pending = Object.keys(this.toFilter).reduce((acc, name) => {
      if (categoryName.includes(name)) {
        acc[name] = this.toFilter[name]
      }
      return acc
    }, {})

    return this
  }

  /**
   * filterShortDirName
   * @param {string[] | string} shortDirName
   */
  filterShortDir (shortDirName) {
    shortDirName = Array.isArray(shortDirName) ? shortDirName : [shortDirName]

    this.pending = Object.keys(this.toFilter).reduce((acc, categoryName) => {
      const filtered = this.toFilter[categoryName].filter((project) => {
        return shortDirName.includes(project.shortFolder)
      })

      return {
        ...acc,
        [categoryName]: filtered
      }
    })

    return this
  }

  end () {
    const filtered = this.pending
    this.pending = null
    return filtered
  }

  static create (rushDirName) {
    return new this(getCategorizedProjects(rushDirName ? path.join(rushDirName, 'rush.json') : undefined))
  }
}

export {
  getCategorizedProjects,
  getProjects,
  CategorizedProjectsUtilities
}

/* c8 ignore stop */
