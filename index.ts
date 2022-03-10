import fs from 'fs-extra'

import { run, tmpRoot, isDebug } from './src/run'

if (isDebug) {
  console.log('Running speedy benchmark action in debug mode...')
}

run().catch((e) => {
  console.log('Error encountered', e)

  if (isDebug) {
    console.log('Debug mode, skip cleaning tmp dir...', tmpRoot)
  } else {
    console.log('Cleaning tmp dir...', tmpRoot)
    fs.removeSync(tmpRoot)
  }

  process.exit(1)
})
