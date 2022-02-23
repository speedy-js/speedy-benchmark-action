const chainPromise = (promises) => {
  if (!promises.length) return Promise.resolve()

  return promises.reduce((prev, curr) => {
    return prev.then(() => curr())
  }, Promise.resolve())
}

export { chainPromise }
