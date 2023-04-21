import {gqlPostOrThrow} from './client'

interface OrganizationResponse {
  id: string
  slug: string
  name: string
  type: 'PERSONAL' | 'SHARED'
  viewerRole: 'admin' | 'member'
}

interface GetOrganizationOutput {
  organization: OrganizationResponse
}

const getOrganizationQuery = `query($slug: String!) {
  organization(slug: $slug) {
    id
    slug
    name
    type
    viewerRole
  }
}`

export const getOrganization = async (
  slug: string
): Promise<GetOrganizationOutput> =>
  await gqlPostOrThrow({
    query: getOrganizationQuery,
    variables: {slug}
  })
