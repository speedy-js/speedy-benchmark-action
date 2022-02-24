import { promisify } from 'util'
import { exec as execOrig, spawn as spawnOrig, SpawnOptionsWithoutStdio } from 'child_process'

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

async function runCommand (
  cmd: string,
  args?: Array<string>,
  options?: SpawnOptionsWithoutStdio,
  returnOutput?: boolean
) {
  const command = spawnOrig(cmd, args, options)

  let output = ''
  if (returnOutput) {
    command.stdout.on('data', (c) => {
      if (typeof c.toString !== 'undefined') {
        output += c.toString()
      }
    })
  }

  command.stderr.pipe(process.stderr)
  command.stdout.pipe(process.stdout)

  await new Promise((resolve, reject) => {
    command.once('close', (code) => {
      if (code !== 0) {
        const errorText = `command ${cmd} ${args && args.join(' ')} failed with status code ${code}.`
        console.error(errorText)
        return reject(errorText)
      }

      resolve(code)
    })
  })

  return { stdout: output.trim() }
}

export { exec, runCommand }
