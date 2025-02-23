import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

async function run(): Promise<void> {
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

    let timeoutHandle: NodeJS.Timeout | undefined
    let completionReason = 'next' // Default reason

    try {
      await new Promise<void>((resolve, reject) => {
        // Set timeout if specified
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            completionReason = 'timeout'
            resolve()
          }, timeout * 1000)
        }

        // Watch for debug signal file
        const watcher = fs.watch(debugSignalDir, (eventType, filename) => {
          if (filename === debugSignalFile && eventType === 'rename') {
            if (fs.existsSync(debugSignalPath)) {
              watcher.close()
              if (timeoutHandle) clearTimeout(timeoutHandle)
              resolve()
            }
          }
        })
      })

      // Read and process debug signal file if it exists
      if (fs.existsSync(debugSignalPath)) {
        const content = fs.readFileSync(debugSignalPath, 'utf8')
        const lines = content.split('\n')

        for (const line of lines) {
          if (line.trim() === 'fail') {
            completionReason = 'failed'
            throw new Error('Debug signal requested workflow failure')
          }
          if (line.startsWith('env=')) {
            const [_, envStr] = line.split('=', 2)
            const [key, value] = envStr.split('=', 2)
            if (key && value) {
              core.exportVariable(key, value)
            }
          }
        }

        // Remove the signal file
        fs.unlinkSync(debugSignalPath)
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
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

run()
