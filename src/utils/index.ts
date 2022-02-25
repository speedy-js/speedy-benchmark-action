export * from './async'
export * from './clone'
export * from './emit'
export * from './exec'
export * from './get-dir-size'
export * from './logger'
export * from './pkg'
export * from './rush-kits'
export * from './table'
export * from './pnpm'

export const chainPromises = async (p: (() => Promise<void>)[]) => {
  return p.reduce(async (prev, curr) => {
    await prev
    return curr()
  }, Promise.resolve())
}
