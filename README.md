# :gear: Supabase Preview Deploy Action

![](https://github.com/sweatybridge/fly-preview/workflows/build-test/badge.svg)
![](https://github.com/sweatybridge/fly-preview/workflows/CodeQL/badge.svg)

## About

This action deploys a Supabase Preview branch on Fly infrastructure.

> :warning: **Experimental**: This action is a WIP and may be deprecated in the future. Use at your own risk.

## Usage

Setup this action and `supabase` CLI

```yaml
steps:
  - uses: supabase/setup-cli@v1
    with:
      version: latest
  - run: supabase gen keys --project-ref <ref> --experimental >> "$GITHUB_ENV"
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  - uses: supabase/fly-preview@main
```

Connect locally to your preview branch

```bash
supabase link --project-ref <ref>
supabase start --preview
```

## Inputs

The actions supports the following environment variable as inputs:

| Name                             | Type   | Description                         | Default     | Required |
| -------------------------------- | ------ | ----------------------------------- | ----------- | -------- |
| `FLY_API_TOKEN`                  | String | API token to your Fly account       |             | true     |
| `NEXT_PUBLIC_SUPABASE_URL`       | String | Fly app hostname, ie. `*.fly.dev`   |             | true     |
| `FLY_ORGANIZATION_SLUG`          | String | Fly organization slug to deploy to  | `personal`  | false    |
| `SUPABASE_DB_PASSWORD`           | String | Postgres role password              | `postgres`  | false    |
| `SUPABASE_AUTH_JWT_SECRET`       | String | JWT secret for GoTrue service       |             | false    |
| `SUPABASE_AUTH_ANON_KEY`         | String | Signed JWT token for `anon` role    |             | false    |
| `SUPABASE_AUTH_SERVICE_ROLE_KEY` | String | Signed JWT token for `service_role` |             | false    |
| `DB_ONLY`                        | String | Deploy Postgres only or whole stack | `true`      | false    |
