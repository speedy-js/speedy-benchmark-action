import { promisify } from 'util'
import { exec as execOrig, spawn as spawnOrig } from 'child_process'

import { logger } from './logger'

const execP = promisify(execOrig)
const env = {
  ...process.env
}

function exec (command, noLog = false, opts = {}) {
  if (!noLog) logger(`exec: ${command}`)
  return execP(command, {
    timeout: 180 * 1000,
    maxBuffer: 1024 * 1024 * 10,
    ...opts,
    env: { ...env, ...opts.env }
  })
}

exec.spawn = function spawn (command = '', noLog = false, opts = {}) {
  if (!noLog) logger(`spawn: ${command}`)
  const exitOnError = opts.exitOnError ?? false
  const child = spawnOrig('/bin/bash', ['-c', command], {
    ...opts,
    env: {
      ...env,
      ...opts.env
    },
    stdio: opts.stdio || 'inherit'
  })

  child.on('exit', (code, signal) => {
    logger(`spawn exit (${code}, ${signal}): ${command}`)
    if (exitOnError && code !== 0) {
      process.exit(code)
    }
  })
  return child
}

export { exec }
