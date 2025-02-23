import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock the @actions/core module
jest.mock('@actions/core')

describe('Debug Action', () => {
  const mockCore = jest.mocked(core)
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv }
    process.env.DEBUGGABLE_RUNNER = 'true'
  })

  afterEach(() => {
    process.env = originalEnv
    jest.useRealTimers()
  })

  it('throws error when DEBUGGABLE_RUNNER is not set', async () => {
    // Remove the DEBUGGABLE_RUNNER env var
    delete process.env.DEBUGGABLE_RUNNER

    // Import the run function
    const { run } = await import('./main')

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'This action requires DEBUGGABLE_RUNNER environment variable to be set'
    )
  })

  it('handles timeout correctly', async () => {
    jest.useFakeTimers()

    // Mock inputs
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'timeout':
          return '5'
        case 'signal-path':
          return '/tmp/test_signal'
        default:
          return ''
      }
    })

    // Import the run function
    const { run } = await import('./main')

    // Start the action
    const runPromise = run()

    // Fast-forward time
    jest.advanceTimersByTime(5000)

    // Wait for the promise to resolve
    await runPromise

    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'timeout')
  })

  it('handles debug signal file with fail command', async () => {
    // Create temporary signal file path
    const signalPath = path.join(os.tmpdir(), 'test_signal')

    // Mock inputs
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'signal-path':
          return signalPath
        default:
          return ''
      }
    })

    // Import the run function
    const { run } = await import('./main')

    // Start the action
    const runPromise = run()

    // Create signal file with fail command
    fs.writeFileSync(signalPath, 'fail\n', 'utf8')

    // Wait for the promise to resolve
    await runPromise

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'Debug signal requested workflow failure'
    )
    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'failed')

    // Cleanup
    if (fs.existsSync(signalPath)) {
      fs.unlinkSync(signalPath)
    }
  })

  it('handles debug signal file with env variables', async () => {
    // Create temporary signal file path
    const signalPath = path.join(os.tmpdir(), 'test_signal')

    // Mock inputs
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'signal-path':
          return signalPath
        default:
          return ''
      }
    })

    // Import the run function
    const { run } = await import('./main')

    // Start the action
    const runPromise = run()

    // Create signal file with env command
    fs.writeFileSync(signalPath, 'env=TEST_KEY=test_value\n', 'utf8')

    // Wait for the promise to resolve
    await runPromise

    expect(mockCore.exportVariable).toHaveBeenCalledWith(
      'TEST_KEY',
      'test_value'
    )
    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'next')

    // Cleanup
    if (fs.existsSync(signalPath)) {
      fs.unlinkSync(signalPath)
    }
  })
})
