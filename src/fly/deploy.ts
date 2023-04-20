import {createApp} from './app'
import {ConnectionHandler, CreateMachineRequest, createMachine} from './machine'
import {AddressType, allocateIpAddress} from './network'
import {setSecrets} from './secret'
import {createVolume} from './volume'

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

export async function deployInfrastructure(config: FlyConfig): Promise<any> {
  const orgId = process.env.FLY_ORGANIZATION_ID || 'personal'
  const API_URL = process.env.SUPABASE_API_URL || 'https://api.supabase.com'

  const {name, region, volume_size_gb, size, image, secrets, env, db_only} =
    config

  await createApp({
    name,
    organizationId: orgId,
    network: `${name}-network`
  })

  const [{createVolume: pgdata}, ip] = await Promise.all([
    createVolume({
      appId: name,
      name: `${name.replace(/-/g, '_')}_pgdata`,
      sizeGb: volume_size_gb,
      region
    }),
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

  return {machine, ip, volume: pgdata}
}
