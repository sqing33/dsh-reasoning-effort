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

const peerDependencies = packageJson.peerDependencies ?? {}
const peerDependenciesMeta = packageJson.peerDependenciesMeta ?? {}
for (const peer of Object.keys(peerDependencies)) {
  if (peerDependenciesMeta[peer]?.optional !== true) {
    fail(`host-provided peer dependency must be optional: ${peer}`)
  }
}
for (const peer of Object.keys(peerDependenciesMeta)) {
  if (!(peer in peerDependencies)) fail(`peerDependenciesMeta contains an undeclared peer: ${peer}`)
}

const hostSource = await readFile(resolve(root, 'src/reasoning-effort.ts'), 'utf8')
if (hostSource.includes('import { settingsNamespace')) {
  fail('host must not import the removed settingsNamespace runtime helper')
}
const clientSource = await readFile(resolve(root, 'src/client/index.tsx'), 'utf8')
if (!clientSource.includes("'remote.session'")) {
  fail('client must inject remote.session before using the shared model directory')
}
const clientModules = packageJson.dsh?.client?.inject ?? []
if (!clientModules.includes('@deepseek-ai/dsh-api-session-controller')) {
  fail('client bundle must load the session controller that provides remote.session')
}

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

const builtHost = await readFile(resolve(root, 'lib/index.js'), 'utf8')
if (builtHost.includes('import { settingsNamespace')) {
  fail('host bundle still imports the removed settingsNamespace runtime helper')
}
const builtClient = await readFile(resolve(root, 'lib/client.js'), 'utf8')
if (!builtClient.includes('remote.session')) {
  fail('client bundle is stale or lacks the remote.session injection')
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
