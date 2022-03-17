import fetch from 'node-fetch'

import { speedyPlugins, fixturePlugins, Metric } from '../performance-plugins'
import { SpeedyBenchmarkCompared, FixtureBenchmarkCompared, MetricComparison } from '../utils/compare-benchmarks'
import { markdownTable } from '../utils/table'
import { actionInfo } from '../prepare/action-info'
import { formatMetric } from '../utils/format-metrics'
import { zip } from '../utils'

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

  async finalizeFixture () {
    const fixtureComparison = this.fixtureComparison
    const fixture = Object.entries(fixtureComparison).map(([pluginId, cmped]) => {
      const plugin = Object.values(fixturePlugins).find((plugin) => pluginId === plugin.id)

      if (!plugin) {
        console.warn(`Unable to find plugin with id: ${pluginId}`)
        return null
      }

      const markdown = cmped.reduce<string>((markdown, { metricsCmped, raw, fixture }) => {
        metricsCmped = metricsCmped || []
        const mainMetrics = raw[0]?.metrics || []
        const prMetrics = raw[1]?.metrics || []

        const finalizeMetric = (mainMetric: Metric | undefined, prMetric: Metric | undefined, metricCmped: MetricComparison | undefined): [
          MainMetric: string,
          PRMetric:string,
          Diff: string
        ] => {
          const mainValue = mainMetric?.value
          const mainFormat = mainMetric ? 'format' in mainMetric ? mainMetric.format : undefined : undefined
          const prValue = prMetric?.value
          const prFormat = prMetric ? 'format' in prMetric ? prMetric.format : undefined : undefined

          return [
            mainMetric ? formatMetric(mainValue, mainFormat) : '-',
            prMetric ? formatMetric(prValue, prFormat) : '-',
            metricCmped ? formatMetric(metricCmped.diff, metricCmped.format) : '-'
          ]
        }

        const columns = ['Metric', 'Main', `Pull Request(${actionInfo.prRef})`, 'Diff']
        const data = zip(mainMetrics, prMetrics, metricsCmped).map(([mainMetric, prMetric, metricCmped]) => {
          return [
            mainMetric.title || prMetric.title || 'untitled',
            ...finalizeMetric(mainMetric, prMetric, metricCmped)
          ]
        })

        markdown += `\n**${fixture.name}**\n\n`

        markdown += markdownTable(
          [
            columns,
            ...data
          ]
        )

        return markdown + '\n\n'
      }, '')

      return `### ${plugin.title}\n\n${markdown}`
    }).join('\n')

    let fixtureMarkdown = '## Fixture\n\n'
    fixtureMarkdown += fixture

    return fixtureMarkdown
  }

  async finalizeSpeedy () {
    const speedyComparison = this.speedyComparison

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

    let speedyMarkdown = '## Speedy\n\n'

    speedyMarkdown += speedy.reduce((str, curr) => {
      const columns = [curr.columns, ...curr.data]
      return `${str}
### ${curr.title}
      
${markdownTable(columns)}
`
    }, '')

    return speedyMarkdown
  }

  async finalize () {
    return comment(`# Speedy Benchmark Result\n\n${this.finalizeFixture()}${this.finalizeSpeedy()}`)
  }
}

const fixture = {
  'cold-start-plugin': [
    {
        metricsCmped: [
            {
                id: 'a.js',
                title: 'a.js',
                diff: 304,
                format: 'bytes'
            },
            {
              id: 'b.js',
              title: 'b.js',
              diff: 600,
              format: 'bytes'
          }
        ],
        raw: [
            {
                metrics: [
                    {
                        id: 'a.js',
                        title: 'a.js',
                        value: 12378,
                        format: 'bytes'
                    },
                    {
                      id: 'b.js',
                      title: 'b.js',
                      value: 12378,
                      format: 'bytes'
                  }
                ],
                pluginId: 'cold-start-plugin',
                fixture: {
                    name: 'Arco Design',
                    directory: 'apps/arco-pro'
                }
            },
            {
                metrics: [
                    {
                        id: 'a.js',
                        title: 'a.js',
                        value: 12682,
                        format: 'bytes'
                    },
                    {
                      id: 'b.js',
                      title: 'b.js',
                      value: 12978,
                      format: 'bytes'
                  }
                ],
                pluginId: 'cold-start-plugin',
                fixture: {
                    name: 'Arco Design',
                    directory: 'apps/arco-pro'
                }
            }
        ],
        fixture: {
            name: 'Arco Design',
            directory: 'apps/arco-pro'
        },
        pluginId: 'cold-start-plugin'
    }
]
  // 'cold-start-plugin': [
  //     {
  //         metricsCmped: [
  //             {
  //                 id: 'cold-start-diff',
  //                 title: 'Cold Start Diff',
  //                 diff: 304,
  //                 format: 'ms'
  //             }
  //         ],
  //         raw: [
  //             {
  //                 metrics: [
  //                     {
  //                         id: 'cold-start-diff',
  //                         title: 'Cold Start Diff',
  //                         value: 12378,
  //                         format: 'ms'
  //                     }
  //                 ],
  //                 pluginId: 'cold-start-plugin',
  //                 fixture: {
  //                     name: 'Arco Design',
  //                     directory: 'apps/arco-pro'
  //                 }
  //             },
  //             {
  //                 metrics: [
  //                     {
  //                         id: 'cold-start-diff',
  //                         title: 'Cold Start Diff',
  //                         value: 12682,
  //                         format: 'ms'
  //                     }
  //                 ],
  //                 pluginId: 'cold-start-plugin',
  //                 fixture: {
  //                     name: 'Arco Design',
  //                     directory: 'apps/arco-pro'
  //                 }
  //             }
  //         ],
  //         fixture: {
  //             name: 'Arco Design',
  //             directory: 'apps/arco-pro'
  //         },
  //         pluginId: 'cold-start-plugin'
  //     }
  // ]
  // 'build-profile-plugin': [
  //     {
  //         metricsCmped: [

  //         ],
  //         raw: [
  //             {
  //                 metrics: [
  //                     {
  //                         id: 'profile',
  //                         title: 'Profile',
  //                         value: '[Link to profile](https://www.speedscope.app/#profileURL=https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fspeedy-js%2Fspeedy-profiles%2Fspeedy-profile-5091cab0b1adff0496df7e0803e923c76c2337e4-arco-design-1647505246457.cpuprofile)'
  //                     }
  //                 ],
  //                 pluginId: 'build-profile-plugin',
  //                 fixture: {
  //                     name: 'Arco Design',
  //                     directory: 'apps/arco-pro'
  //                 }
  //             },
  //             {
  //                 metrics: [
  //                     {
  //                         id: 'profile',
  //                         title: 'Profile',
  //                         value: '[Link to profile](https://www.speedscope.app/#profileURL=https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fspeedy-js%2Fspeedy-profiles%2Fspeedy-profile-5091cab0b1adff0496df7e0803e923c76c2337e4-arco-design-1647505372932.cpuprofile)'
  //                     }
  //                 ],
  //                 pluginId: 'build-profile-plugin',
  //                 fixture: {
  //                     name: 'Arco Design',
  //                     directory: 'apps/arco-pro'
  //                 }
  //             }
  //         ],
  //         fixture: {
  //             name: 'Arco Design',
  //             directory: 'apps/arco-pro'
  //         },
  //         pluginId: 'build-profile-plugin'
  //     }
  // ]
}

// const finalizer = new PullRequestFinalizer(null, fixture)

// console.log(finalizer.finalizeFixture())

export { PullRequestFinalizer }
