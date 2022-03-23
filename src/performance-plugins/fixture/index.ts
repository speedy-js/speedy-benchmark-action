import { ColdStartPlugin } from './cold-start'
import { BuildProfile } from './build-profile'
import { DistSizePlugin } from './dist-size'
import { DevProfile } from './dev-profile'

export const fixturePlugins = [DevProfile, ColdStartPlugin, BuildProfile, DistSizePlugin]
