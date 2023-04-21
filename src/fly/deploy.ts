import {createApp} from './app'
import {
  ConnectionHandler,
  CreateMachineRequest,
  MachineResponse,
  createMachine,
  listMachine
} from './machine'
import {
  AddressType,
  AllocateIPAddressOutput,
  allocateIpAddress
} from './network'
import {getOrganization} from './organization'
import {setSecrets} from './secret'
import {VolumeResponse, createVolume, forkVolume} from './volume'

export interface CommonConfig {
  name: string
  region: string
  size: string
  image: string
  user_data?: string
}

export interface FlyConfig extends CommonConfig {
  project_ref: string
  volume_size_gb: number
  db_only: boolean
  secrets: FlyConfigSecrets
  env: Record<string, string>
}

export interface FlyConfigSecrets {
  postgres_password: string
  supabase_admin_password?: string
  supabase_auth_admin_password?: string
  supabase_storage_admin_password?: string
  supabase_replication_admin_password?: string
  supabase_read_only_user_password?: string
  jwt_secret: string
  pgsodium_root_key?: string
  authenticator_password?: string
  pgbouncer_password?: string
  admin_api_key: string
  anon_key: string
  service_key: string
  init_payload_presigned_url?: string
  reporting_token?: string
}

const resolveVolume = async (appId: string): Promise<string> => {
  const machines = await listMachine(appId)
  const mount = machines.flatMap(m => m.config.mounts)[0]
  if (!mount) {
    throw new Error(`Failed to resolve volume for app: ${appId}`)
  }
  return mount.volume
}

const makeVolume = async (
  name: string,
  region: string,
  volume_size_gb: number,
  projectRef?: string
): Promise<{volume: VolumeResponse}> => {
  const volumeName = `${name.replace(/-/g, '_')}_pgdata`
  if (projectRef) {
    const source = await resolveVolume(projectRef)
    const output = await forkVolume({
      appId: name,
      sourceVolId: source,
      name: volumeName,
      machinesOnly: true
    })
    return output.forkVolume
  }
  const output = await createVolume({
    appId: name,
    name: volumeName,
    sizeGb: volume_size_gb,
    region
  })
  return output.createVolume
}

const resolveOrgId = async (): Promise<string> => {
  const orgId = process.env.FLY_ORGANIZATION_ID
  if (orgId) {
    return orgId
  }
  const slug = process.env.FLY_ORGANIZATION_SLUG || 'personal'
  const output = await getOrganization(slug)
  return output.organization.id
}

export async function deployInfrastructure({
  name,
  region,
  volume_size_gb,
  size,
  image,
  secrets,
  env,
  db_only
}: FlyConfig): Promise<{
  machine: MachineResponse
  ip: AllocateIPAddressOutput
  volume: VolumeResponse
}> {
  const orgId = await resolveOrgId()
  await createApp({
    name,
    organizationId: orgId,
    network: `${name}-network`
  })

  const [pgdata, ip] = await Promise.all([
    makeVolume(name, region, volume_size_gb, process.env.PROJECT_REF),
    allocateIpAddress({
      appId: name,
      type: AddressType.v4
    }),
    allocateIpAddress({
      appId: name,
      type: AddressType.v6
    }),
    setSecrets({
      appId: name,
      secrets: Object.entries(secrets)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          key: key.toUpperCase(),
          value
        }))
    })
  ])

  const API_URL = process.env.SUPABASE_API_URL || 'https://api.supabase.com'
  const req: CreateMachineRequest = {
    name,
    region,
    config: {
      image,
      size,
      env: {
        ...env,
        PGDATA: '/mnt/postgresql/data',
        SUPABASE_URL: `${API_URL}/system`,
        INIT_PAYLOAD_PATH: '/mnt/postgresql/payload.tar.gz'
      },
      services: [
        {
          ports: [
            {
              port: 5432
            }
          ],
          protocol: 'tcp',
          internal_port: 5432
        },
        {
          ports: [
            {
              port: 8085,
              handlers: [ConnectionHandler.HTTP]
            }
          ],
          protocol: 'tcp',
          internal_port: 8085
        }
      ],
      mounts: [
        {
          volume: pgdata.volume.id,
          path: '/mnt/postgresql'
        }
      ],
      checks: {
        adminapi: {
          type: 'tcp',
          port: 8085,
          interval: '15s',
          timeout: '10s'
        },
        postgres: {
          type: 'tcp',
          port: 5432,
          interval: '15s',
          timeout: '10s'
        }
      }
    }
  }
  if (db_only) {
    req.config.size = 'shared-cpu-2x'
    req.config.env = {...req.config.env, POSTGRES_ONLY: 'true'}
  } else {
    req.config.services = [
      ...req.config.services,
      {
        ports: [
          {
            port: 80,
            handlers: [ConnectionHandler.HTTP]
          }
        ],
        protocol: 'tcp',
        internal_port: 8000
      },
      {
        ports: [
          {
            port: 443
          }
        ],
        protocol: 'tcp',
        internal_port: 8443
      },
      {
        ports: [
          {
            port: 6543
          }
        ],
        protocol: 'tcp',
        internal_port: 6543
      }
    ]
  }

  const machine = await createMachine(req)

  return {machine, ip, volume: pgdata.volume}
}
