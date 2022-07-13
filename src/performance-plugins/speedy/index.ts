import { NodeModulesPlugin } from './node-modules'
import { BundleSizePlugin } from './bundle-size'

export const speedyPlugins = [BundleSizePlugin] as any || [NodeModulesPlugin, BundleSizePlugin]
