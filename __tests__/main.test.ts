import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_MILLISECONDS'] = '500'
  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }
  try {
    console.log(cp.execFileSync(np, [ip], options).toString())
  } catch (error) {
    // @ts-ignore TS18046: 'error' is of type 'unknown'.
    expect(error.stdout).toStrictEqual(
      Buffer.from('::error::missing required env: FLY_API_TOKEN\n')
    )
  }
})
