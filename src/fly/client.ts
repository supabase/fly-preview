import crossFetch from 'cross-fetch'

export const FLY_API_GRAPHQL = 'https://api.fly.io'

interface GraphQLRequest<T> {
  query: string
  variables?: Record<string, T>
}

interface GraphQLResponse<T> {
  data: T
  errors?: {
    message: string
    locations: {
      line: number
      column: number
    }[]
  }[]
}

export async function gqlPostOrThrow<U, V>(
  payload: GraphQLRequest<U>
): Promise<V> {
  const token = process.env.FLY_API_TOKEN
  const resp = await crossFetch(`${FLY_API_GRAPHQL}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`${resp.status}: ${text}`)
  }
  const {data, errors}: GraphQLResponse<V> = JSON.parse(text)
  if (errors) {
    throw new Error(JSON.stringify(errors))
  }
  return data
}
