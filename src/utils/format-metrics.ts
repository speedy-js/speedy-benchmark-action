import prettyBytes from 'pretty-bytes'
import prettyMs from 'pretty-ms'

import { Metric } from '../performance-plugins'

const formatMetric = (value: any, format?: 'bytes' | 'ms') => {
  if (format) {
    return format === 'bytes' ? prettyBytes(value) : prettyMs(value)
  }

  return value
}

export { formatMetric }
