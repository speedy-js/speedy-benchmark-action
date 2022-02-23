import path from 'path'

import getActionInfo from './prepare/action-info'

const actionInfo = getActionInfo()

const TARGET_BRANCH = actionInfo.prTargetRef || 'main'
const SOURCE_BRANCH = actionInfo.prRef

const WORKING_DIR = path.resolve(__dirname, '../../__stats_working_dir__')
const TARGET_DIR = path.resolve(WORKING_DIR, 'target')
const SOURCE_DIR = path.resolve(__dirname, '../../../')

const STAT_TYPE = {
  NODE_MODULES_STATS: 'nodeModulesStats',
  BUNDLE_SIZE_STATS: 'bundleSizeStats',
  SPEEDY_CORE_COLD_START_STATS: 'speedyCoreColdStartStats'
}

export {
  TARGET_BRANCH,
  SOURCE_BRANCH,

  WORKING_DIR,
  TARGET_DIR,
  SOURCE_DIR,

  STAT_TYPE
}
