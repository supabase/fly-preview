import * as core from '@actions/core'
import jwt from 'jsonwebtoken'
import {deleteApp} from './fly/app'
import {deployInfrastructure, FlyConfig} from './fly/deploy'

const generate_jwt = (jwt_secret: string, ref: string) => {
  const options = {expiresIn: '10y'}

  const admin_api_jwt = {iss: 'supabase', ref, role: 'supabase_admin'}
  const admin_api_key = jwt.sign(admin_api_jwt, jwt_secret, options)

  const anon_jwt = {iss: 'supabase', ref, role: 'anon'}
  const anon_key = jwt.sign(anon_jwt, jwt_secret, options)

  const service_jwt = {iss: 'supabase', ref, role: 'service_role'}
  const service_key = jwt.sign(service_jwt, jwt_secret, options)

  return {admin_api_key, anon_key, service_key}
}

async function run(): Promise<void> {
  if (!process.env.FLY_API_TOKEN) {
    return core.setFailed('missing required env: FLY_API_TOKEN')
  }
  const ref = process.env.GITHUB_HEAD_REF || 'default'
  // Cleanup existing deployments
  try {
    await deleteApp(ref)
  } catch (error) {}
  try {
    // Generate jwt tokens
    const jwt_secret =
      process.env.JWT_SECRET ||
      'super-secret-jwt-token-with-at-least-32-characters-long'
    const jwt_tokens = generate_jwt(jwt_secret, ref)
    // Initialise fly config
    const config: FlyConfig = {
      name: ref,
      region: process.env.FLY_MACHINE_REGION || 'sin',
      size: process.env.FLY_MACHINE_SIZE || 'shared-cpu-4x',
      image: 'sweatybridge/postgres:dev',
      db_only: process.env.DB_ONLY === 'true',
      project_ref: ref,
      volume_size_gb: 1,
      secrets: {
        postgres_password: process.env.POSTGRES_PASSWORD || 'postgres',
        jwt_secret,
        ...jwt_tokens
      },
      env: {
        PROJECT_REF: ref
      }
    }
    // Deploy fly project
    try {
      await deployInfrastructure(config)
    } catch (error) {
      await deleteApp(ref)
      throw error
    }
    // Dumps action output
    core.setOutput('anon_key', config.secrets.anon_key)
    core.setOutput('service_key', config.secrets.service_key)
    core.setOutput('hostname', `${config.name}.fly.dev`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
