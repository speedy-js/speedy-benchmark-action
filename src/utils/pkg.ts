import path from 'path'
import fs from 'fs-extra'

import { logger } from './logger'

const getPackageEntry = async (dir: string) => {
  logger(`getting entry point for dir: ${dir}`)

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(path.join(dir, 'package.json'))
  logger.json(pkg)

  const mainField = pkg && pkg.main

  if (!mainField) {
    return null
  }

  const mainPath = path.resolve(dir, mainField)

  let entryDir
  const mainFieldCasted = mainField.split(path.sep)

  // normalize path if starting
  if (mainFieldCasted[0] === '.') {
    mainFieldCasted.shift()
  }

  if (mainFieldCasted && mainFieldCasted.length === 1) {
    throw new Error("package.json's main field must be a path to a file, a single file is not supported yet.")
  } else {
    // use the first part of the path as the entry dir
    entryDir = mainPath.replace(mainFieldCasted.slice(1).join('/'), '')
  }

  if (entryDir) {
    await fs.ensureDir(entryDir)
  }

  // normalize entryDir
  return path.resolve(entryDir)
}

export { getPackageEntry }
