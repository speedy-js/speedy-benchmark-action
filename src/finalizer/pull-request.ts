import fetch from 'node-fetch'

import { speedyPlugins, fixturePlugins } from '../performance-plugins'
import { SpeedyBenchmarkCompared, FixtureBenchmarkCompared } from '../utils/compare-benchmarks'
import { markdownTable } from '../utils/table'
import { actionInfo } from '../prepare/action-info'
import { formatMetric } from '../utils/format-metrics'

const comment = async (summary: string) => {
  if (actionInfo.customCommentEndpoint || (actionInfo.githubToken && actionInfo.commentEndpoint)) {
    const body = {
      body: summary,
      ...(!actionInfo.githubToken
        ? {
            commitId: actionInfo.commitId,
            issueId: actionInfo.issueId
          }
        : {})
    }

    if (actionInfo.customCommentEndpoint) {
      console.log(`Using body ${JSON.stringify({ ...body, body: 'OMITTED' })}`)
    }

    try {
      const res = await fetch(actionInfo.commentEndpoint, {
        method: 'POST',
        headers: {
          ...(actionInfo.githubToken
            ? {
                Authorization: `bearer ${actionInfo.githubToken}`
              }
            : {
                'content-type': 'application/json'
              })
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        console.error(`Failed to post results ${res.status}`)
        try {
          console.error(await res.text())
        } catch (_) {
          /* no-op */
        }
      } else {
        console.log('Successfully posted results')
      }
    } catch (err) {
      console.error('Error occurred posting results', err)
    }
  } else {
    console.log('Not posting results', actionInfo.githubToken ? 'No comment endpoint' : 'no GitHub token')
  }
}

class PullRequestFinalizer {
  constructor (public speedyComparison: SpeedyBenchmarkCompared, public fixtureComparison: FixtureBenchmarkCompared) {}

  async finalize () {
    const speedyComparison = this.speedyComparison
    const fixtureComparison = this.fixtureComparison

    const speedy = Object.entries(speedyComparison).map(([pluginId, cmped]) => {
      const plugin = Object.values(speedyPlugins).find((plugin) => pluginId === plugin.id)

      if (!plugin) {
        console.warn(`Unable to find plugin with id: ${pluginId}`)
        return null
      }

      const data = cmped.reduce<[packageName: string, mainValue: string, prValue: string, diff: string][]>((data, { metricsCmped, raw, pkg }) => {
        const mainMetric = raw[0]?.metrics[0]
        const prMetric = raw[1]?.metrics[0]

        const mainValue = mainMetric?.value
        const mainFormat = mainMetric ? 'format' in mainMetric ? mainMetric.format : undefined : undefined
        const prValue = prMetric?.value
        const prFormat = prMetric ? 'format' in prMetric ? prMetric.format : undefined : undefined

        return [...data, [
          pkg.packageName,
          mainMetric ? formatMetric(mainValue, mainFormat) : '-',
          prMetric ? formatMetric(prValue, prFormat) : '-',
          metricsCmped?.[0] ? formatMetric(metricsCmped[0].diff, metricsCmped[0].format) : '-'
        ]]
      }, [])

      return {
        title: plugin.title,
        columns: ['Package Name', 'Main', `Pull Request(${actionInfo.prRef})`, 'Diff'],
        data
      }
    }).filter((item): item is Exclude<typeof item, null> => Boolean(item))

    const fixture = Object.entries(fixtureComparison).map(([pluginId, cmped]) => {
      const plugin = Object.values(fixturePlugins).find((plugin) => pluginId === plugin.id)

      if (!plugin) {
        console.warn(`Unable to find plugin with id: ${pluginId}`)
        return null
      }

      const data = cmped.reduce<[packageName: string, mainValue: string, prValue: string, diff: string][]>((data, { metricsCmped, raw, fixture }) => {
        const mainMetric = raw[0]?.metrics[0]
        const prMetric = raw[1]?.metrics[0]

        const mainValue = mainMetric?.value
        const mainFormat = mainMetric ? 'format' in mainMetric ? mainMetric.format : undefined : undefined
        const prValue = prMetric?.value
        const prFormat = prMetric ? 'format' in prMetric ? prMetric.format : undefined : undefined

        return [...data, [
          fixture.name,
          mainMetric ? formatMetric(mainValue, mainFormat) : '-',
          prMetric ? formatMetric(prValue, prFormat) : '-',
          metricsCmped?.[0] ? formatMetric(metricsCmped[0].diff, metricsCmped[0].format) : '-'
        ]]
      }, [])

      return {
        title: plugin.title,
        columns: ['Fixture Name', 'Main', `Pull Request(${actionInfo.prRef})`, 'Diff'],
        data
      }
    }).filter((item): item is Exclude<typeof item, null> => Boolean(item))

    let speedyMarkdown = '## Speedy\n\n'
    let fixtureMarkdown = '## Fixture\n\n'

    speedyMarkdown += speedy.reduce((str, curr) => {
      const columns = [curr.columns, ...curr.data]
      return `${str}
### ${curr.title}
      
${markdownTable(columns)}
`
    }, '')

    fixtureMarkdown += fixture.reduce((str, curr) => {
      const columns = [curr.columns, ...curr.data]
      return `${str}
### ${curr.title}
      
${markdownTable(columns)}
`
    }, '')

    return comment(`# Speedy Benchmark Result\n\n${speedyMarkdown}${fixtureMarkdown}`)
  }
}

export { PullRequestFinalizer }
