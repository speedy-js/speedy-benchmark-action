import { NodeModulesPlugin } from './node-modules'
import { BundleSizePlugin } from './bundle-size'
import { RequireCost } from './require-cost'

export const speedyPlugins = [RequireCost, NodeModulesPlugin, BundleSizePlugin]
