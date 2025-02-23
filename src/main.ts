import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

function createTimeoutPromise(timeoutSeconds: number): Promise<'timeout'> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('timeout'), timeoutSeconds * 1000)
  })
}

function promisifyWatch(
  debugSignalDir: string,
  debugSignalFile: string,
  debugSignalPath: string
): Promise<'next'> {
  return new Promise((resolve) => {
    const watcher = fs.watch(debugSignalDir, (eventType, filename) => {
      if (filename === debugSignalFile) {
        if (fs.existsSync(debugSignalPath)) {
          watcher.close()
          resolve('next')
        }
      }
    })
  })
}

export async function run(): Promise<void> {
  try {
    // Check for DEBUGGABLE_RUNNER environment variable
    if (!process.env.DEBUGGABLE_RUNNER) {
      throw new Error(
        'This action requires DEBUGGABLE_RUNNER environment variable to be set'
      )
    }

    // Get inputs
    const timeout = parseInt(core.getInput('timeout') || '0')
    const customSignalPath = core.getInput('signal-path')
    const debugSignalPath =
      customSignalPath || path.join(os.tmpdir(), 'debug_signal')
    const debugSignalDir = path.dirname(debugSignalPath)
    const debugSignalFile = path.basename(debugSignalPath)

    // Print instructions
    core.info(
      `To continue, run "gha-debug-continue [--fail] [--env KEY=VAL ...]" on this runner.`
    )
    core.info(`Debug signal file path: ${debugSignalPath}`)

    let completionReason = 'next' // Default reason

    // Create promises for both timeout and file watch
    const promises: Promise<'timeout' | 'next'>[] = [
      promisifyWatch(debugSignalDir, debugSignalFile, debugSignalPath)
    ]

    if (timeout > 0) {
      promises.push(createTimeoutPromise(timeout))
    }

    // Wait for either timeout or signal
    const result = await Promise.race(promises)
    completionReason = result

    // Read and process debug signal file if it exists
    if (result === 'next' && fs.existsSync(debugSignalPath)) {
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

      // Remove the signal file
      fs.unlinkSync(debugSignalPath)
    }

    // Set the output reason
    core.setOutput('reason', completionReason)
  } catch (error) {
    if (error instanceof Error) {
      core.setOutput('reason', 'failed')
      core.setFailed(error.message)
    }
  }
}

// Only run if this is the main module (not imported)
if (require.main === module) {
  run()
}
