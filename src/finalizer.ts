// TODO: optimization render
import prettyBytes from 'pretty-bytes'
import prettyMs from 'pretty-ms'

import { markdownTable, logger, clone } from './utils'
import { STAT_TYPE, SOURCE_BRANCH, TARGET_BRANCH } from './constants'

const prettify = (val, type = 'bytes') => {
  if (typeof val !== 'number') return 'N/A'
  return type === 'bytes' ? prettyBytes(val) : prettyMs(val)
}

const finalizeColumns = (columns) => {
  return markdownTable(columns)
}

const calculateDiff = (targetSize, sourceSize) => {
  const diff = sourceSize - targetSize

  const percent = (diff / sourceSize) * 100

  const percentStr = percent.toFixed(2)

  const trendType = diff < 0 ? 'down' : diff === 0 ? 'same' : 'up'

  return {
    diff,
    percent,
    percentStr,
    trendType
  }
}

const finalizeNodeModulesStats = async (stats) => {
  const { stat } = stats

  let result = ''
  let warn = false

  const columns = [['Package', `Source(${SOURCE_BRANCH})`, `Target(${TARGET_BRANCH})`, 'Diff(Source -> Target)']]

  for (const category in stat) {
    const categoryStat = stat[category]

    result += '\n\n **' + category + '** \n\n'
    const cols = clone(columns)

    for (const pkgName in categoryStat) {
      const pkgStat = categoryStat[pkgName]

      if (!pkgStat.length) continue

      const [targetPkg, sourcePkg] = pkgStat

      if (!targetPkg || !sourcePkg) {
        if (!targetPkg) {
          const size = sourcePkg[1]
          columns.push([pkgName, prettify(size), 'N/A', `${prettify(size)}(100%)`])
        }

        if (!sourcePkg) {
          const size = targetPkg[1]
          columns.push([pkgName, 'N/A', prettify(size), `${prettify(size)}(-100%)`])
        }
        continue
      }

      const targetSize = targetPkg[1]
      const sourceSize = sourcePkg[1]

      const { trendType, diff, percentStr } = calculateDiff(targetSize, sourceSize)

      const trendStr = trendType === 'up' ? '😿' : ''

      warn = warn || trendType === 'up'

      cols.push([
        pkgName,
        prettify(sourceSize),
        prettify(targetSize),
        `${prettify(diff)}(${percentStr}%${trendStr || ''})`
      ])
    }

    result += finalizeColumns(cols)
  }

  result = `\n\n### \`node_modules\` size ${warn ? '😿' : ''}\n\n` + result

  return {
    result,
    warn
  }
}

const finalizeBundleSizeStats = async (stats) => {
  const { stat } = stats

  let result = ''

  let warn = false

  const columns = [['Package', `Source(${SOURCE_BRANCH})`, `Target(${TARGET_BRANCH})`, 'Diff(Source -> Target)']]

  for (const category in stat) {
    const categoryStat = stat[category]

    result += '\n\n **' + category + '** \n\n'
    const cols = clone(columns)

    for (const pkgName in categoryStat) {
      const pkgStat = categoryStat[pkgName]

      if (!pkgStat.length) continue

      const [targetPkg, sourcePkg] = pkgStat

      if (!targetPkg || !sourcePkg) {
        if (!targetPkg) {
          const size = sourcePkg[1]
          columns.push([pkgName, prettify(size), 'N/A', `${prettify(size)}(100%)`])
        }

        if (!sourcePkg) {
          const size = targetPkg[1]
          columns.push([pkgName, 'N/A', prettify(size), `${prettify(size)}(-100%)`])
        }
        continue
      }

      const targetSize = targetPkg[1]
      const sourceSize = sourcePkg[1]

      const { trendType, diff, percentStr } = calculateDiff(targetSize, sourceSize)

      const trendStr = trendType === 'up' ? '😿' : ''

      warn = warn || trendType === 'up'

      cols.push([
        pkgName,
        prettify(sourceSize),
        prettify(targetSize),
        `${prettify(diff)}(${percentStr}%${trendStr || ''})`
      ])
    }

    result += finalizeColumns(cols)
  }

  result = `\n\n### Bundle Stats ${warn ? '😿' : ''}\n\n` + result

  return {
    result,
    warn
  }
}

const finalizeSpeedyCoreCodeStartStats = (stats) => {
  const { stat } = stats

  let result = ''

  let warn = false

  const columns = [['Package', `Source(${SOURCE_BRANCH})`, `Target(${TARGET_BRANCH})`, 'Diff(Source -> Target)']]

  for (const category in stat) {
    const categoryStat = stat[category]

    result += '\n\n **' + category + '** \n\n'
    const cols = clone(columns)

    for (const pkgName in categoryStat) {
      const pkgStat = categoryStat[pkgName]

      if (!pkgStat.length) continue

      const [targetPkg, sourcePkg] = pkgStat

      if (!targetPkg || !sourcePkg) {
        if (!targetPkg) {
          const [startTime, endTime] = sourcePkg.slice(1)
          const duration = endTime - startTime

          columns.push([pkgName, prettify(duration, 'ms'), 'N/A', `${prettify(duration, 'ms')}(100%)`])
        }

        if (!sourcePkg) {
          const [sourceStartTime, sourceEndTime] = targetPkg.slice(1)
          const sourceDuration = sourceEndTime - sourceStartTime

          columns.push([pkgName, 'N/A', prettify(sourceDuration, 'ms'), `${prettify(sourceDuration, 'ms')}(-100%)%)`])
        }

        continue
      }

      const [targetStartTime, targetEndTime] = targetPkg.slice(1)
      const [sourceStartTime, sourceEndTime] = sourcePkg.slice(1)

      const targetDuration = targetEndTime - targetStartTime
      const sourceDuration = sourceEndTime - sourceStartTime

      const { trendType, diff, percentStr } = calculateDiff(targetDuration, sourceDuration)

      const trendStr = trendType === 'up' ? '😿' : ''

      warn = warn || trendType === 'up'

      cols.push([
        pkgName,
        prettify(sourceDuration, 'ms'),
        prettify(targetDuration, 'ms'),
        `${prettify(diff, 'ms')}(${percentStr}%${trendStr || ''})`
      ])
    }

    result += finalizeColumns(cols)
  }

  result = `\n\n### Speedy Cold-start Stats ${warn ? '😿' : ''}\n\n` + result

  return {
    result,
    warn
  }
}

const finalizeEach = async (stat) => {
  const { type } = stat

  switch (type) {
    case STAT_TYPE.BUNDLE_SIZE_STATS: {
      return finalizeBundleSizeStats(stat)
    }

    case STAT_TYPE.NODE_MODULES_STATS: {
      return finalizeNodeModulesStats(stat)
    }

    case STAT_TYPE.SPEEDY_CORE_COLD_START_STATS: {
      return finalizeSpeedyCoreCodeStartStats(stat)
    }

    default: {
      throw new Error('unexpected stat type: ' + type)
    }
  }
}

const finalizer = async (stats) => {
  logger('Finalizing merge request report...')

  let result = ''
  let warn = false

  for (const stat of stats) {
    const { result: resultEach, warn: warnEach } = await finalizeEach(stat)
    result += resultEach
    warn = warn || warnEach
  }

  result = '# Stats Report \n\n' + result

  return {
    result,
    warn
  }
}

export { finalizer }
