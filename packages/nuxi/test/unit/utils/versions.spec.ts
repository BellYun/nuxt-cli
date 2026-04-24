import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { getNuxtVersion } from '../../../src/utils/versions'

const tempDirs: string[] = []

function createFixture(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'nuxi-versions-'))
  tempDirs.push(dir)
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents)
  }
  return dir
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('getNuxtVersion', () => {
  it('falls back to package.json dependency spec when node_modules is missing', async () => {
    const cwd = createFixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { nuxt: '^4.4.2' },
      }),
    })

    // No node_modules exists — regression test for issue #1179
    // where `readPackageJSON('nuxt', { url, try: true })` leaked a throw.
    await expect(getNuxtVersion(cwd, false)).resolves.toBe('4.4.2')
  })

  it('falls back to package.json devDependency spec when node_modules is missing', async () => {
    const cwd = createFixture({
      'package.json': JSON.stringify({
        name: 'test',
        devDependencies: { nuxt: '^3.17.0' },
      }),
    })

    await expect(getNuxtVersion(cwd, false)).resolves.toBe('3.17.0')
  })

  it('returns default when neither resolved module nor package.json declares nuxt', async () => {
    const cwd = createFixture({
      'package.json': JSON.stringify({ name: 'test' }),
    })

    await expect(getNuxtVersion(cwd, false)).resolves.toBe('3.0.0')
  })

  it('returns default when package.json itself cannot be read', async () => {
    const cwd = createFixture({})

    await expect(getNuxtVersion(cwd, false)).resolves.toBe('3.0.0')
  })
})
