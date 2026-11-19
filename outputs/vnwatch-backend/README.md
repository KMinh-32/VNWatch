# VNWatch Backend

Backend portfolio for a single watch store. **Current delivery: catalog, authentication/users, COD orders, 10 real reference products and a read-only customer assistant gateway.**
Built with TypeScript 5.9, NestJS 12, PostgreSQL 17 and Prisma ORM 7. Exact dependencies are recorded in `package-lock.json`. Use Node.js 24 LTS (24.15 or newer in the 24.x line).

## Run locally

Customer assistant: [FastAPI/OpenAI setup](../vnwatch-agent/README.vi.md). The public `POST /api/v1/assistant/chat` takes only a bounded question/history/dataset, reads current public catalog data and calls the authenticated internal FastAPI service. Without an OpenAI key the agent runs in labeled catalog mode. The launcher starts the configured agent on port 8000. Account records, order records and login tokens are not provided to the model; enabling OpenAI sends the question and recent chat history to interpret the request.

Prerequisites: Node.js, npm, Docker Desktop with a running Linux engine.

```powershell
Copy-Item .env.example .env
# Edit .env: replace the password placeholder in all three places.
docker compose --profile test up -d --wait
npm ci
npm run db:migrate
npm run db:seed
npm start
```

`db:seed` builds the application first. Open <http://localhost:3000/docs> for Swagger or <http://localhost:3000/api/v1/products> for the public catalog.

The authentication demo uses opaque bearer sessions stored as SHA-256 digests. Register a customer through Swagger, log in, copy `sessionToken`, click `Authorize`, and enter `Bearer <sessionToken>`. Password reset is a local development adapter: it writes a one-time token to `work/mail-outbox`, and does not send an email. The first local admin can be created once with `npm run db:bootstrap-admin` after setting `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_ADMIN_NAME` in the current PowerShell session.

Windows without Docker: use an existing PostgreSQL 17 installation with the bootstrap helper before creating `.env`. See [Vietnamese setup instructions](docs/RUNBOOK.vi.md). The helper creates an isolated cluster and does not connect to an existing server.

## Verify

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run openapi:export
```

Tests require `TEST_DATABASE_URL` pointing to a loopback database whose name ends in `_test`. They create a unique schema, apply the real migrations, exercise HTTP and database constraints, and drop only that schema afterward. They do not substitute SQLite or mock PostgreSQL. A separate unit test covers DB outage behavior in readiness.

## Implemented

- Public product list/detail, pagination, case-insensitive name/brand search, category and SKU price filtering.
- Product/SKU separation, integer VND prices, watch specifications and per-SKU stock.
- Visibility rules: only ACTIVE products with ACTIVE SKUs; sold-out SKUs remain visible.
- PostgreSQL migration with unique constraints, foreign key and CHECK constraints.
- Vietnamese error messages, request IDs, structured HTTP logs, liveness and database readiness.
- OpenAPI, HTTP request examples, development seed, integration tests and CI workflow.
- Registration, login, 8-hour sessions, logout/session revocation, password change/reset, five-failure temporary lock, owner/admin user access, last-admin protection, audit events and database-backed auth rate limits.

COD quotes/orders, idempotent retries, stock locks, cancellation/restoration and ADMIN-only processing are implemented. Quotes use database prices and a fixed 30,000 VND demo shipping fee. The React frontend provides cart, checkout and order history.

Inventory administration, online payment/refunds, promotions, warranty issuance, AI, image search and measured performance are not included yet. Product `warrantyMonths` is catalog metadata, not an issued warranty.

## Demo data

Three fictional products and five SKUs remain labeled DEMO; two products and three SKUs are visible. Ten additional real REFERENCE products each have one SKU, photos, specifications and attributed VND price snapshots. Reference products start with zero VNWatch stock and an unconfigured warranty, so they cannot be ordered yet. Re-running seed preserves existing records, stock, prices and policies; it is not a price updater.

See [product sources and import instructions](docs/PRODUCT-SOURCES.vi.md). `/api/v1/products?dataKind=REFERENCE` lists real products; `dataKind=DEMO` selects test fixtures. Omitting the filter includes both. The website defaults to real products and offers a separate demo dataset. Exact brand filtering uses `brand=Casio`. Non-round dimensions are separate from diameter; unknown store warranty is null.

## Design and learning

- [Architecture, ERD and decisions](docs/DESIGN.vi.md)
- [Walkthrough and interview exercises](docs/LEARNING.vi.md)
- [Scope and next steps](docs/STATUS.vi.md)
- [Verification evidence and limitations](docs/VERIFICATION.vi.md)
- [HTTP request collection](requests/catalog.http)
- [Exported OpenAPI](docs/openapi.json)

The project uses a modular monolith. New modules will be added as complete slices. Money is integer VND; the first catalog slice limits a unit price to 2,147,483,647 VND. Timestamp columns use `timestamptz`; the API emits UTC ISO 8601. Search currently uses PostgreSQL ILIKE over a small catalog; no specialized search engine or cache is deployed.

## Team ownership

This initial implementation was produced with coding-assistant help. Record reviewed commits, fixes, tests and decisions that you personally understand in [the contribution log](docs/CONTRIBUTIONS.md). Do not claim unreviewed generated work or unmeasured results as personal achievements.
