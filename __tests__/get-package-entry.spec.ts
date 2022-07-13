import path from 'path'
import { expect, assert } from 'chai'

import { getPackageEntry } from '../src/utils/pkg'

const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/package-entry')

describe('get-package-entry', () => {
  it('should support basic entry', async () => {
    const result = await getPackageEntry(path.join(FIXTURE_ROOT, 'basic-entry'))
    expect(result.endsWith('dist')).to.be.true
  })
  it('should support multi-part entry', async () => {
    const result = await getPackageEntry(path.join(FIXTURE_ROOT, 'multipart-entry'))
    expect(result.endsWith('dist')).to.be.true
  })
  it('does not support entry without dir', async () => {
    let hasError = false

    try {
      await getPackageEntry(path.join(FIXTURE_ROOT, 'entry-without-dir'))
    } catch (e) {
      expect(e.message).equals("package.json's main field must be a path to a file, a single file is not supported yet.")
      hasError = true
    }

    expect(hasError).to.be.true
  })
})
