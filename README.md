# Runbop Debug Action

[![Continuous Integration](https://github.com/runbop/runbop-debug/actions/workflows/ci.yml/badge.svg)](https://github.com/runbop/runbop-debug/actions/workflows/ci.yml)

A GitHub Action that allows pausing workflows for debugging on self-hosted runners. If you're using [Runbop](https://runbop.com) self-hosted runners service, this action is automatically configured and ready to use - just add it to your workflow to enable interactive debugging sessions.

## Usage

```yaml
- uses: runbop/runbop-debug@v1
  with:
    # Optional: timeout in seconds (default: 0 - wait indefinitely)
    timeout: 300
    # Optional: custom path for the debug signal file
    signal-path: '/tmp/my_debug_signal'
```

## Requirements

- Self-hosted runner with `DEBUGGABLE_RUNNER` environment variable set to any value
  - ✨ This is automatically configured on all [Runbop](https://runbop.com) runners
- Access to the runner's filesystem to create the debug signal file
  - ✨ Already set up and secured on Runbop runners

## How It Works

When this action is triggered, it pauses the workflow execution and waits for a debug signal. On Runbop runners, you can initiate a debug session directly from your dashboard, making it easy to investigate issues, test changes, or explore the runner environment.

## License

MIT
