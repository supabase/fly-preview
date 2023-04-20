import {gqlPostOrThrow} from './client'

export interface SetSecretsInput {
  appId: string
  secrets: {key: string; value: string}[]
  replaceAll?: boolean
}

export interface SetSecretsOutput {
  setSecrets: {
    release: {
      id: string
      version: string
      reason: string
      description: string
      user: {
        id: string
        email: string
        name: string
      }
      evaluationId: string
      createdAt: string
    } | null
  }
}

const setSecretsQuery = `mutation($input: SetSecretsInput!) {
  setSecrets(input: $input) {
    release {
      id
      version
      reason
      description
      user {
        id
        email
        name
      }
      evaluationId
      createdAt
    }
  }
}`

// Ref: https://github.com/superfly/flyctl/blob/master/api/resource_secrets.go#L5
export const setSecrets = async (
  input: SetSecretsInput
): Promise<SetSecretsOutput> =>
  await gqlPostOrThrow({
    query: setSecretsQuery,
    variables: {input}
  })

export interface UnsetSecretsInput {
  appId: string
  keys: string[]
}

export interface UnsetSecretsOutput {
  unsetSecrets: {
    release: {
      id: string
      version: string
      reason: string
      description: string
      user: {
        id: string
        email: string
        name: string
      }
      evaluationId: string
      createdAt: string
    } | null
  }
}

const unsetSecretsQuery = `mutation($input: UnsetSecretsInput!) {
  unsetSecrets(input: $input) {
    release {
      id
      version
      reason
      description
      user {
        id
        email
        name
      }
      evaluationId
      createdAt
    }
  }
}`

export const unsetSecrets = async (
  input: UnsetSecretsInput
): Promise<UnsetSecretsOutput> =>
  await gqlPostOrThrow({
    query: unsetSecretsQuery,
    variables: {input}
  })
