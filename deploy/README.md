# Production deployment

The example production stack binds Velatis Charts to host loopback on port 4321
and expects an HTTPS reverse proxy in front.

```bash
docker compose -f deploy/docker-compose.production.yml up -d --build --wait
```

Before exposing it:

1. Pin an immutable Velatis Charts release artifact.
2. Set `VELATIS_CHARTS_SOURCE_URL` to the exact public tag/source.
3. Restrict `VELATIS_CHARTS_ALLOWED_ORIGINS`.
4. Configure access/error logs to omit request bodies and query strings.
5. Apply TLS and the security headers in `Caddyfile.example`.
6. Verify `/api/v1/health` and a real `positions` operation.
7. Complete `docs/qa/release-checklist.md`.

`docker-compose.production.yml` is an example, not a managed hosting service.
Operators own patching, monitoring, capacity, log retention, source
availability, backups of their configuration, and incident response.
