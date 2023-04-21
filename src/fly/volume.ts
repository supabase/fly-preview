import {gqlPostOrThrow} from './client'

export interface CreateVolumeInput {
  appId: string
  name: string
  region: string
  sizeGb: number
  encrypted?: boolean
  requireUniqueZone?: boolean
  snapshotId?: string
}

export interface CreateVolumeOutput {
  createVolume: {
    app: {
      name: string
    }
    volume: {
      id: string
      name: string
      app: {
        name: string
      }
      region: string
      sizeGb: number
      encrypted: boolean
      createdAt: string
      host: {
        id: string
      }
    }
  }
}

const createVolumeQuery = `mutation($input: CreateVolumeInput!) {
  createVolume(input: $input) {
    app {
      name
    }
    volume {
      id
      name
      app{
        name
      }
      region
      sizeGb
      encrypted
      createdAt
      host {
        id
      }
    }
  }
}`

// Ref: https://github.com/superfly/flyctl/blob/master/api/resource_volumes.go#L52
export const createVolume = async (
  input: CreateVolumeInput
): Promise<CreateVolumeOutput> =>
  await gqlPostOrThrow({
    query: createVolumeQuery,
    variables: {input}
  })

export interface DeleteVolumeInput {
  volumeId: string
}

export interface DeleteVolumeOutput {
  deleteVolume: {
    app: {
      name: string
    }
  }
}

const deleteVolumeQuery = `mutation($input: DeleteVolumeInput!) {
  deleteVolume(input: $input) {
    app {
      name
    }
  }
}`

export const deleteVolume = async (
  input: DeleteVolumeInput
): Promise<DeleteVolumeOutput> =>
  await gqlPostOrThrow({
    query: deleteVolumeQuery,
    variables: {input}
  })

// Ref: https://github.com/superfly/flyctl/blob/master/api/resource_volumes.go#L155
export interface ForkVolumeInput {
  appId: string
  sourceVolId: string
  name?: string
  machinesOnly?: boolean
  lockId?: string
}

export interface ForkVolumeOutput {
  forkVolume: {
    app: {
      name: string
    }
    volume: {
      id: string
      name: string
      app: {
        name: string
      }
      region: string
      sizeGb: number
      encrypted: boolean
      createdAt: string
      host: {
        id: string
      }
    }
  }
}

const forkVolumeQuery = `mutation($input: ForkVolumeInput!) {
  forkVolume(input: $input) {
    app {
      name
    }
    volume {
      id
      name
      app{
        name
      }
      region
      sizeGb
      encrypted
      createdAt
      host {
        id
      }
    }
  }
}`

export const forkVolume = async (
  input: ForkVolumeInput
): Promise<ForkVolumeOutput> =>
  await gqlPostOrThrow({
    query: forkVolumeQuery,
    variables: {input}
  })
