# Runbop Debug Action

[![Continuous Integration](https://github.com/Geekoosh/runbop-debug/actions/workflows/ci.yml/badge.svg)](https://github.com/Geekoosh/runbop-debug/actions/workflows/ci.yml)

A GitHub Action that allows pausing workflows for debugging on self-hosted runners. If you're using [Runbop](https://runbop.com) self-hosted runners service, this action is automatically configured and ready to use - just add it to your workflow to enable interactive debugging sessions.

## Usage

```yaml
- uses: runbop/runbop-debug@v1
  with:
    # Optional: timeout in seconds (default: 0 - wait indefinitely)
    timeout: 300
```

## Requirements

- Self-hosted runner with `DEBUGGABLE_RUNNER` environment variable set to any value
  - ✨ This is automatically configured on all [Runbop](https://runbop.com) runners
- Access to the runner's filesystem to create the debug signal file
  - ✨ Already set up and secured on Runbop runners

## How It Works

When this action is triggered, it pauses the workflow execution and waits for a debug signal. On Runbop runners, you can control the debug session using the pre-installed `runbop-debug-continue` command:

- Resume workflow: `runbop-debug-continue`
- Resume with environment variables: `runbop-debug-continue --env KEY=VALUE`
- Fail the workflow: `runbop-debug-continue --fail`

This makes it easy to investigate issues, test changes, or explore the runner environment during workflow execution.

## License

MIT
