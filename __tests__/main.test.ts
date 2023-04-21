import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  try {
    const stdout = cp.execFileSync(np, [ip], {env: process.env})
    console.log(stdout.toString())
  } catch (error) {
    // @ts-ignore TS18046: 'error' is of type 'unknown'.
    expect(error.stdout.toString()).toStrictEqual(
      '::error::missing required env: FLY_API_TOKEN\n'
    )
  }
})
