import nock from 'nock'
import {describe, it} from '@jest/globals'
import {FLY_API_GRAPHQL} from '../src/fly/client'
import {createApp, deleteApp} from '../src/fly/app'

describe('app', () => {
  const organizationId = 'personal'

  it('creates app', async () => {
    nock(FLY_API_GRAPHQL)
      .post('/graphql')
      .reply(200, {
        data: {
          createApp: {
            app: {
              id: 'ctwntjgykzxhfncfwrfo',
              name: 'ctwntjgykzxhfncfwrfo',
              organization: {slug: 'supabase-dev'},
              config: {
                definition: {
                  kill_timeout: 5,
                  kill_signal: 'SIGINT',
                  processes: [],
                  experimental: {auto_rollback: true},
                  services: [
                    {
                      processes: ['app'],
                      protocol: 'tcp',
                      internal_port: 8080,
                      concurrency: {
                        soft_limit: 20,
                        hard_limit: 25,
                        type: 'connections'
                      },
                      ports: [
                        {port: 80, handlers: ['http'], force_https: true},
                        {port: 443, handlers: ['tls', 'http']}
                      ],
                      tcp_checks: [
                        {
                          interval: '15s',
                          timeout: '2s',
                          grace_period: '1s',
                          restart_limit: 0
                        }
                      ],
                      http_checks: [],
                      script_checks: []
                    }
                  ],
                  env: {}
                }
              },
              regions: [{name: 'Hong Kong, Hong Kong', code: 'hkg'}]
            }
          }
        }
      })
    const data = await createApp({
      name: 'ctwntjgykzxhfncfwrfo',
      organizationId
    })
    console.dir(data, {depth: 10})
  })

  it('deletes app', async () => {
    nock(FLY_API_GRAPHQL)
      .post('/graphql')
      .reply(200, {
        data: {
          deleteApp: {
            organization: {
              id: organizationId
            }
          }
        }
      })
    const data = await deleteApp('ctwntjgykzxhfncfwrfo')
    console.dir(data, {depth: 10})
  })
})
