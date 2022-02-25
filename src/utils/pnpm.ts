import fs from 'fs-extra'

import { runCommand } from '../utils'

async function link (cwd: string, pkgName?: string) {
  const exists = await fs.pathExists(cwd)
  if (!exists) {
    throw new Error(`Cannot link pnpm pkg in ${cwd}, directory does not exist`)
  }

  const args = ['link']
  if (pkgName) {
    args.push(pkgName)
  }

  return runCommand('pnpm', args, {
    cwd
  })
}

async function install (cwd: string) {
  const exists = await fs.pathExists(cwd)
  if (!exists) {
    throw new Error(`Cannot install pnpm deps in ${cwd}, directory does not exist`)
  }

  return runCommand('pnpm', ['install'], {
    cwd
  })
}

async function unlink (cwd: string, pkgName?: string) {
  const exists = await fs.pathExists(cwd)
  if (!exists) {
    throw new Error(`Cannot unlink pnpm pkg in ${cwd}, directory does not exist`)
  }

  const args = ['unlink']
  if (pkgName) {
    args.push(pkgName)
  }

  return runCommand('pnpm', args, {
    cwd
  })
}

const pnpm = {
  link,
  install,
  unlink
}

export { link as pnpmLink, install as pnpmInstall, unlink as pnpmUnlink, pnpm }
