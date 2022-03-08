import fs from 'fs-extra'

import { run, tmpRoot } from './src/run'

run().catch((e) => {
  console.log('Error encountered', e)
  // console.log('Cleaning tmp dir...', tmpRoot)
  // fs.removeSync(tmpRoot)
  process.exit(1)
})
