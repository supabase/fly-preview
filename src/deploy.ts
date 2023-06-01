import Client from 'fly-admin/dist/client'
import {
  ConnectionHandler,
  CreateMachineRequest,
  MachineResponse
} from 'fly-admin/dist/lib/machine'
import {AddressType, AllocateIPAddressOutput} from 'fly-admin/dist/lib/network'
import {VolumeResponse} from 'fly-admin/dist/lib/volume'

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
  service_role_key: string
  init_payload_presigned_url?: string
  reporting_token?: string
}

const resolveVolume = async (fly: Client, appId: string): Promise<string> => {
  const machines = await fly.Machine.listMachines(appId)
  const mount = machines.flatMap(m => m.config.mounts)[0]
  if (!mount) {
    throw new Error(`Failed to resolve volume for app: ${appId}`)
  }
  return mount.volume
}

const makeVolume = async (
  fly: Client,
  name: string,
  region: string,
  volume_size_gb: number,
  projectRef?: string
): Promise<{volume: VolumeResponse}> => {
  const volumeName = `${name.replace(/-/g, '_')}_pgdata`
  if (projectRef) {
    const source = await resolveVolume(fly, projectRef)
    const output = await fly.Volume.forkVolume({
      appId: name,
      sourceVolId: source,
      name: volumeName,
      machinesOnly: true
    })
    return output.forkVolume
  }
  const output = await fly.Volume.createVolume({
    appId: name,
    name: volumeName,
    sizeGb: volume_size_gb,
    region
  })
  return output.createVolume
}

const resolveOrgId = async (fly: Client): Promise<string> => {
  const orgId = process.env.FLY_ORGANIZATION_ID
  if (orgId) {
    return orgId
  }
  const slug = process.env.FLY_ORGANIZATION_SLUG || 'personal'
  const output = await fly.Organization.getOrganization(slug)
  return output.organization.id
}

export async function deployInfrastructure(
  fly: Client,
  {name, region, volume_size_gb, size, image, secrets, env}: FlyConfig
): Promise<{
  machine: MachineResponse
  ip: AllocateIPAddressOutput
  volume: VolumeResponse
}> {
  const organizationId = await resolveOrgId(fly)
  // Custom network is not supported by fly ssh: `${name}-network`
  await fly.App.createApp({name, organizationId})

  const [pgdata, ip] = await Promise.all([
    makeVolume(fly, name, region, volume_size_gb, process.env.PROJECT_REF),
    fly.Network.allocateIpAddress({
      appId: name,
      type: AddressType.v4
    }),
    fly.Network.allocateIpAddress({
      appId: name,
      type: AddressType.v6
    }),
    fly.Secret.setSecrets({
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
        PGDATA_REAL: '/data/pgdata', // actual dir under mount point, consistent with aws setup
        PGDATA: '/var/lib/postgresql/data', // symlinked to actual dir under mount point
        SUPABASE_URL: `${API_URL}/system`,
        INIT_PAYLOAD_PATH: '/data/payload.tar.gz'
      },
      services: [
        {
          ports: [
            {
              port: 5432
            }
          ],
          protocol: 'tcp',
          internal_port: 5432,
          concurrency: {
            type: 'connections',
            soft_limit: 60,
            hard_limit: 60
          }
        },
        {
          ports: [
            {
              port: 8085
            }
          ],
          protocol: 'tcp',
          internal_port: 8085
        }
      ],
      mounts: [
        {
          volume: pgdata.volume.id,
          path: '/data'
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

  const machine = await fly.Machine.createMachine(req)

  return {machine, ip, volume: pgdata.volume}
}
