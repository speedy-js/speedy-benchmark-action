import path from 'path'
import { expect } from 'chai'

import * as rushKit from '../src/utils/rush-kits'

const RUSH_KITS = path.resolve(__dirname, 'fixtures/rush-kits')
const RUSH_KITS_JSON = path.join(RUSH_KITS, 'rush.json')

describe('rushKit', () => {
  it('should get all packages', () => {
    const projects = rushKit.getProjects(RUSH_KITS_JSON)

    expect(projects.length).gt(0)
  })

  it('should get all packages without `shortName` duplications', () => {
    const projects = rushKit.getProjects(RUSH_KITS_JSON)

    const shortFolders = projects.map((project) => project.shortFolder)

    expect(
      shortFolders.filter((name, index) => {
        return shortFolders.indexOf(name) === index
      }).length
    ).eq(shortFolders.length)
  })

  it('should categorize all speedy projects', () => {
    const categorizedProjects = rushKit.getCategorizedProjects(RUSH_KITS_JSON)

    expect(categorizedProjects && typeof categorizedProjects).eq('object')
    expect(categorizedProjects.packages && Array.isArray(categorizedProjects.packages)).to.be.true
  })

  it('should filter correctly with category utilities', () => {
    const cat = rushKit.RushKit.fromRushDir(RUSH_KITS)

    const result = cat.filterCategory(['packages']).end()
    expect(Object.keys(result)).to.be.lengthOf(1)
  })
})
