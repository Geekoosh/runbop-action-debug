import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

function createTimeoutPromise(timeoutSeconds: number): Promise<'timeout'> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('timeout'), timeoutSeconds * 1000)
  })
}

function simulateSignal(
  debugSignalPath: string,
  content: string,
  delayMs: number
): void {
  setTimeout(() => {
    fs.writeFileSync(debugSignalPath, content, 'utf8')
  }, delayMs)
}

export async function run(): Promise<void> {
  let watcher: fs.FSWatcher | undefined
  try {
    if (!process.env.DEBUGGABLE_RUNNER) {
      throw new Error(
        'This action requires DEBUGGABLE_RUNNER environment variable to be set'
      )
    }

    const timeout = parseInt(core.getInput('timeout') || '0')
    const customSignalPath = core.getInput('signal-path')
    const debugSignalPath =
      customSignalPath || path.join(os.tmpdir(), 'debug_signal')
    const debugSignalDir = path.dirname(debugSignalPath)
    const debugSignalFile = path.basename(debugSignalPath)

    // Test-only parameters
    const simulateContent = core.getInput('simulate')
    const simulateAfter = parseInt(core.getInput('simulate-after') || '0')

    if (simulateContent && process.env.NODE_ENV === 'test') {
      simulateSignal(debugSignalPath, simulateContent, simulateAfter)
    }

    core.info(
      `To continue, run "gha-debug-continue [--fail] [--env KEY=VAL ...]" on this runner.`
    )
    core.info(`Debug signal file path: ${debugSignalPath}`)

    let completionReason = 'next'

    let resolve
    const watchPromise = new Promise<'next'>((resolveFn) => {
      resolve = resolveFn
    })

    watcher = fs.watch(debugSignalDir, (eventType, filename) => {
      if (filename === debugSignalFile) {
        if (fs.existsSync(debugSignalPath)) {
          resolve!('next')
        }
      }
    })
    watcher.unref()
    const promises: Promise<'timeout' | 'next'>[] = [watchPromise]

    if (timeout > 0) {
      promises.push(createTimeoutPromise(timeout))
    }

    await Promise.race(promises)

    if (fs.existsSync(debugSignalPath)) {
      const content = fs.readFileSync(debugSignalPath, 'utf8')
      const lines = content.split('\n')

      for (const line of lines) {
        if (line.trim() === 'fail') {
          completionReason = 'failed'
          throw new Error('Debug signal requested workflow failure')
        }
        if (line.startsWith('env=')) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [_, key, value] = line.split('=', 3)
          if (key && value) {
            core.exportVariable(key, value)
          }
        }
      }

      fs.unlinkSync(debugSignalPath)
    } else {
      completionReason = 'timeout'
    }

    core.info(`Completion reason: ${completionReason}`)
    core.setOutput('reason', completionReason)
  } catch (error) {
    if (error instanceof Error) {
      core.setOutput('reason', 'failed')
      core.setFailed(error.message)
    }
  } finally {
    core.info('Unregistering debug signal watcher')
    if (watcher) {
      watcher.close()
    }
  }
}
