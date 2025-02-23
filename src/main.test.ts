import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as core from '@actions/core'

// Mock the @actions/core module
jest.mock('@actions/core')

const testSignalPath = path.join(os.tmpdir(), 'test_signal')

describe('debug action', () => {
  const mockCore = jest.mocked(core)
  beforeEach(() => {
    process.env.DEBUGGABLE_RUNNER = 'true'
    process.env.NODE_ENV = 'test'
    if (fs.existsSync(testSignalPath)) {
      fs.unlinkSync(testSignalPath)
    }
    jest.resetAllMocks()
  })

  afterEach(() => {
    if (fs.existsSync(testSignalPath)) {
      fs.unlinkSync(testSignalPath)
    }
  })

  it('should handle simulated signal', async () => {
    const getInputMock = jest.spyOn(core, 'getInput')
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'signal-path':
          return testSignalPath
        case 'simulate':
          return 'env=TEST=value'
        case 'simulate-after':
          return '100'
        default:
          return ''
      }
    })

    const { run } = await import('./main')
    await run()

    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'next')
    expect(mockCore.exportVariable).toHaveBeenCalledWith('TEST', 'value')
  })

  it('should handle simulated failure', async () => {
    const getInputMock = jest.spyOn(core, 'getInput')
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'signal-path':
          return testSignalPath
        case 'simulate':
          return 'fail'
        case 'simulate-after':
          return '50'
        default:
          return ''
      }
    })

    const { run } = await import('./main')
    await run()

    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'failed')
    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'Debug signal requested workflow failure'
    )
  })

  it('should handle timeout with simulation after timeout', async () => {
    const getInputMock = jest.spyOn(core, 'getInput')
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'signal-path':
          return testSignalPath
        case 'timeout':
          return '1'
        case 'simulate':
          return 'env=TEST=value'
        case 'simulate-after':
          return '2000'
        default:
          return ''
      }
    })

    const { run } = await import('./main')
    await run()

    expect(mockCore.setOutput).toHaveBeenCalledWith('reason', 'timeout')
  })
})
