# Serving the Archive with Supabase

Authenticated file download portal for the David Lovelace Archive using self-hosted Supabase on OpenClaw, with Yunohost handling public-facing nginx/SSL.

## Architecture

```
Browser (Svelte on Netlify / bosci.net)
  │
  ├─ Login → Yunohost nginx (SSL) → openclaw:8000 (Supabase Kong)
  │           Proxy path: /supabase/* → openclaw:8000/*
  │
  ├─ Catalog query → Supabase PostgREST (through Kong)
  │                    Row Level Security filters by user permissions
  │                    DuckDB stays as batch source; Postgres is the live query DB
  │
  └─ File download → Yunohost nginx → openclaw (download handler)
                      Verifies Supabase JWT → checks Postgres RLS → streams from NVMe
```

## Self-hosted Supabase on OpenClaw

### Setup

```bash
cd /home/clausrl

# Clone the docker directory from supabase/supabase
git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase
cd supabase
git sparse-checkout set docker

cd docker
cp -n .env.example .env

# Generate secure keys
bash utils/generate-keys.sh --update-env
bash utils/add-new-auth-keys.sh --update-env

# Configure site URL for CORS
echo 'SITE_URL=https://bosci.net' >> .env
echo 'ADDITIONAL_REDIRECT_URLS=https://bosci.net/**' >> .env

# Start
docker compose pull
docker compose up -d
```

### Services

| Service       | Internal Port | Purpose                        |
| ------------- | ------------- | ------------------------------ |
| Kong          | 8000          | API gateway — main entry point |
| Studio        | 3000          | Admin dashboard                |
| PostgreSQL    | 5432          | Archive catalog + auth         |
| Auth (GoTrue) | via Kong      | Email, OAuth, magic link auth  |
| PostgREST     | via Kong      | Auto-REST API from Postgres    |

### Key credentials

Stored in `/home/clausrl/supabase/docker/.env`:

| Key                  | Purpose                          |
| -------------------- | -------------------------------- |
| `ANON_KEY`           | Public client key (for frontend) |
| `SERVICE_ROLE_KEY`   | Private admin key (bypasses RLS) |
| `JWT_SECRET`         | JWT signing secret               |
| `DASHBOARD_PASSWORD` | Studio login password            |

## Yunohost Routing

Yunohost's nginx handles all public traffic. On the Yunohost server, proxy Supabase API calls:

```nginx
location /supabase/ {
    proxy_pass http://openclaw:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Archive Catalog in PostgreSQL

### Sync from DuckDB

```bash
duckdb /mnt/fe20e9cd-*/david-lovelace-archive-clean/catalog/archive.db -csv \
  "SELECT * FROM files WHERE status = 'copied'" \
  > /tmp/public-files.csv

psql postgresql://postgres:password@localhost:5432/postgres \
  -c "\COPY public.files FROM '/tmp/public-files.csv' CSV HEADER"
```

### Row Level Security

```sql
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read public files"
  ON files FOR SELECT
  USING (status = 'copied');
```

### Access logging

```sql
CREATE TABLE download_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    file_id INTEGER REFERENCES files(id),
    downloaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## File Download Handler

Files stay on the NVMe — a lightweight handler streams them after JWT verification.
See `scripts/dla-server.js` in this skill for the production version (installed as systemd on openclaw).

### Minimal Node.js handler

```javascript
// download-server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

const supabase = createClient('http://localhost:8000', process.env.SUPABASE_SERVICE_KEY);

app.get('/download/*', async (req, res) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token);
	if (error || !user) return res.status(401).send('Unauthorized');
	const filePath = '/mnt/fe20e9cd-.../david-lovelace-archive-clean/' + req.params[0];
	res.sendFile(filePath);
});

app.listen(3001);
```

## Svelte Frontend Integration

```svelte
<script>
	import { createClient } from '@supabase/supabase-js';
	const supabase = createClient(
		'https://bosci.net/supabase',
		import.meta.env.VITE_SUPABASE_ANON_KEY
	);
	let user = $state(null);
	let files = $state([]);

	async function login() {
		await supabase.auth.signInWithOAuth({ provider: 'google' });
	}

	async function loadFiles() {
		const { data } = await supabase
			.from('files')
			.select('original_filename, destination_path, original_size')
			.limit(50);
		files = data;
	}
</script>
```
