import nock from 'nock'
import {describe, it} from '@jest/globals'
import {FLY_API_GRAPHQL} from '../src/fly/client'
import {setSecrets, unsetSecrets} from '../src/fly/secret'

describe('secret', () => {
  it('sets secret', async () => {
    nock(FLY_API_GRAPHQL)
      .post('/graphql')
      .reply(200, {
        data: {
          setSecrets: {
            release: null
          }
        }
      })
    const data = await setSecrets({
      appId: 'ctwntjgykzxhfncfwrfo',
      secrets: [
        {
          key: 'POSTGRES_PASSWORD',
          value: 'password'
        },
        {
          key: 'JWT_SECRET',
          value: 'super-secret-jwt-token-with-at-least-32-characters-long'
        }
      ]
    })
    console.dir(data, {depth: 5})
  })

  it('unsets secret', async () => {
    nock(FLY_API_GRAPHQL)
      .post('/graphql')
      .reply(200, {
        data: {
          unsetSecrets: {
            release: null
          }
        }
      })
    const data = await unsetSecrets({
      appId: 'ctwntjgykzxhfncfwrfo',
      keys: ['test-key']
    })
    console.dir(data, {depth: 5})
  })
})
