# Supabase setup

## 1. Create the project

- Create a Supabase project.
- Enable `Email` auth with magic links.
- Copy the project URL and anon key into `config.js`.

## 2. Apply the database schema

- Run the SQL from `supabase/migrations/20260409_server_authoritative.sql`.

## 3. Deploy Edge Functions

Deploy these functions:

- `bootstrap_player`
- `import_local_save`
- `sync_profile_snapshot`
- `upgrade_stat`
- `equip_item`
- `equip_ash`
- `update_preparation`
- `apply_offline_progress`
- `refund_runes`
- `reset_profile`

Each function needs these Supabase secrets:

- `APP_SUPABASE_URL`
- `APP_SUPABASE_ANON_KEY`
- `APP_SUPABASE_SERVICE_ROLE_KEY`

Suggested CLI flow:

```bash
supabase login
supabase link --project-ref cundgkudxndpjuphvyto
supabase secrets set --env-file supabase/.env
supabase db push
supabase functions deploy bootstrap_player
supabase functions deploy import_local_save
supabase functions deploy sync_profile_snapshot
supabase functions deploy upgrade_stat
supabase functions deploy equip_item
supabase functions deploy equip_ash
supabase functions deploy update_preparation
supabase functions deploy apply_offline_progress
supabase functions deploy refund_runes
supabase functions deploy reset_profile
```

Create `supabase/.env` locally from `supabase/.env.example` and keep the real service role key out of git.

## 4. Host the game

- Serve the repository as a static site.
- Keep `config.js` out of source control if you prefer per-environment values.
- The app will block progression until Supabase is configured and the player is authenticated.
