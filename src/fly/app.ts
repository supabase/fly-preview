import {gqlPostOrThrow} from './client'

export interface CreateAppInput {
  organizationId: string
  name?: string
  preferredRegion?: string
  network?: string
}

export interface CreateAppOutput {
  createApp: {
    app: {
      id: string
      name: string
      organization: {
        slug: string
      }
      config: {
        definition: {
          kill_timeout: number
          kill_signal: string
          processes: any[]
          experimental: {
            auto_rollback: boolean
          }
          services: any[]
          env: Record<string, string>
        }
      }
      regions: {
        name: string
        code: string
      }[]
    }
  }
}

const createAppQuery = `mutation($input: CreateAppInput!) {
  createApp(input: $input) {
    app {
      id
      name
      organization {
        slug
      }
      config {
        definition
      }
      regions {
        name
        code
      }
    }
  }
}`

// Ref: https://github.com/superfly/flyctl/blob/master/api/resource_apps.go#L329
export const createApp = async (
  input: CreateAppInput
): Promise<CreateAppOutput> =>
  await gqlPostOrThrow({
    query: createAppQuery,
    variables: {input}
  })

export type DeleteAppInput = string

export interface DeleteAppOutput {
  deleteApp: {
    organization: {
      id: string
    }
  }
}

const deleteAppQuery = `mutation($appId: ID!) {
  deleteApp(appId: $appId) {
    organization {
      id
    }
  }
}`

export const deleteApp = async (
  appId: DeleteAppInput
): Promise<DeleteAppOutput> =>
  await gqlPostOrThrow({
    query: deleteAppQuery,
    variables: {appId}
  })
