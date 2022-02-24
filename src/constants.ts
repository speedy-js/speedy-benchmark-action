import path from 'path'

export const REPO_OWNER = 'hardfist'
export const REPO_NAME = 'speedystack'
export const REPO_BRANCH = 'main'

export const WORKING_DIR = path.resolve(__dirname, '../../__stats_working_dir__')
export const TARGET_DIR = path.resolve(WORKING_DIR, 'target')
export const SOURCE_DIR = path.resolve(__dirname, '../../../')

export const STAT_TYPE = {
  NODE_MODULES_STATS: 'nodeModulesStats',
  BUNDLE_SIZE_STATS: 'bundleSizeStats',
  SPEEDY_CORE_COLD_START_STATS: 'speedyCoreColdStartStats'
}
