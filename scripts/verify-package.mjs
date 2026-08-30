import { access, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function fail(message) {
  console.error(`Package verification failed: ${message}`)
  process.exitCode = 1
}

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patchPath = packageJson.dsh?.bundle?.patch

if (typeof patchPath !== 'string' || patchPath.length === 0) {
  fail('package.json must declare dsh.bundle.patch')
} else if (!(await exists(resolve(root, patchPath)))) {
  fail(`bundle patch does not exist: ${patchPath}`)
}

for (const path of [
  'lib/index.js',
  'lib/client.js',
  'README.md',
  'README.zh.md',
  'LICENSE',
]) {
  if (!(await exists(resolve(root, path)))) fail(`required file does not exist: ${path}`)
}

const screenshotsPath = resolve(root, 'screenshots.json')
if (await exists(screenshotsPath)) {
  const manifest = JSON.parse(await readFile(screenshotsPath, 'utf8'))
  const screenshots = Array.isArray(manifest) ? manifest : manifest.screenshots
  if (!Array.isArray(screenshots) || screenshots.length < 1 || screenshots.length > 8) {
    fail('screenshots.json must declare between 1 and 8 screenshot paths')
  } else {
    for (const screenshot of screenshots) {
      if (typeof screenshot !== 'string' || isAbsolute(screenshot) || screenshot.includes('..')) {
        fail(`screenshot path must stay inside the repository: ${screenshot}`)
        continue
      }
      const target = resolve(root, screenshot)
      if (relative(root, target).startsWith('..')) fail(`screenshot path leaves the repository: ${screenshot}`)
      else if (!(await exists(target))) fail(`screenshot does not exist: ${screenshot}`)
    }
  }
}

if (process.exitCode !== 1) console.log('Package structure and screenshot manifest are valid.')
