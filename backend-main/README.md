# Business Management System — FastAPI + Supabase

This backend is designed for the supplied Business Management System project and the Supabase schema/functions created for it.

## Architecture

FastAPI is the API layer. Supabase Auth owns authentication. Supabase Postgres + RLS owns authorization/data access. Business-critical multi-table operations use Postgres RPC functions.

Auth:
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET  /api/v1/auth/me
- POST /api/v1/auth/logout

The client sends:
Authorization: Bearer <Supabase access token>

The backend verifies the token with Supabase Auth and creates a request-scoped Supabase client whose PostgREST Authorization header is the user's JWT. Therefore RLS remains active for normal data operations.

## Required Supabase database

Run the SQL schema/RLS/functions from the previous project setup first. The backend expects these public tables:

profiles
shops
shop_members
categories
suppliers
products
sales
sale_items
purchases
purchase_items
expenses
employee_salaries
inventory_transactions

And these RPC functions:

create_shop(varchar, varchar, varchar, text)
create_sale(bigint, varchar, numeric, numeric, jsonb)
create_stock_purchase(bigint, bigint, varchar, text, jsonb)
record_salary(bigint, numeric, date)

The included database/backend_support.sql is an idempotent patch containing additional safe policies/functions needed by this API.

## Important Supabase settings

For email/password signup, Supabase Auth's Confirm email setting controls whether signup returns a session. If Confirm email is enabled, signup normally returns a user but no session until the email is verified.

Use the publishable key in SUPABASE_PUBLISHABLE_KEY.

Use SUPABASE_SECRET_KEY only on the FastAPI server. Never put it in frontend code.

## Run

1. Copy .env.example to .env.
2. Fill in Supabase URL, publishable key and secret key.
3. Run the database SQL.
4. Install:
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
5. Start:
   uvicorn app.main:app --reload

Open:
http://127.0.0.1:8000/docs

## Typical flow

1. POST /auth/signup
2. If email confirmation is enabled, verify email in the received email.
3. POST /auth/login
4. Save access_token on the frontend.
5. POST /shops — the authenticated user becomes OWNER through the create_shop RPC.
6. Create categories/products/suppliers.
7. Create a sale with all items in one request. The create_sale RPC reduces stock and records inventory transactions.
8. Create a stock purchase. The create_stock_purchase RPC increases stock and records the purchase expense.
9. Owner can add existing users or create new employee accounts.
10. Owner can record salary; salary is automatically recorded as an expense.

## Why there is no /sales/{sale_id}/items endpoint

A sale must update:
- sales
- sale_items
- products.stock_quantity
- inventory_transactions

as one atomic database operation. This backend therefore creates the entire sale using create_sale RPC instead of inserting sale_items independently.

## API authorization

Owner:
- everything

Admin:
- profile
- billing
- purchase
- product
- dashboard
- cannot manage employees

Employee:
- profile
- billing

This matches the supplied project document.

## Health

GET /health

## Authentication dependency separation

The backend uses two Supabase dependencies:

- `public_supabase`: publishable-key client, no Authorization required. Used by `POST /auth/signup`, `POST /auth/login`, and `POST /auth/refresh`.
- `current_supabase`: requires `Authorization: Bearer <access_token>` and attaches the caller JWT to PostgREST so normal database operations remain subject to Supabase RLS.
- `current_user`: verifies the same access token with Supabase Auth.

Swagger:
1. Call signup or login without Authorize.
2. Copy `session.access_token` from login.
3. Click **Authorize**.
4. Enter `Bearer YOUR_ACCESS_TOKEN`.
5. Call protected endpoints.

If email confirmation is enabled in Supabase, signup can return a user with `session: null`; verify the email, then login.

## Important: Swagger Bearer authentication

The protected API now uses FastAPI `HTTPBearer`, not a raw `Authorization` header parameter. This is important because FastAPI can then publish a real HTTP Bearer security scheme in OpenAPI/Swagger.

### Public authentication endpoints

These endpoints intentionally do **not** require Authorization:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Protected endpoints

These require the Supabase access token:

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- profile endpoints
- shops and members
- categories/products/suppliers
- sales
- purchases
- expenses
- salaries
- inventory
- dashboard

### Swagger steps

1. Call `POST /api/v1/auth/login` without Authorization.
2. Copy `session.access_token` from the response.
3. Click the **Authorize** button at the top of Swagger.
4. Paste **only the JWT**, without typing `Bearer ` yourself.
5. Click Authorize.
6. Call `GET /api/v1/auth/me`.

Swagger will generate this header automatically:

`Authorization: Bearer <your-access-token>`

If you manually use curl/Postman instead, send the full header:

`Authorization: Bearer <your-access-token>`

### RLS behavior

For protected database operations, FastAPI creates a request-scoped Supabase client using the publishable key and attaches the user's access token to PostgREST. Supabase then evaluates database policies using the authenticated JWT. Supabase documents JWTs as the mechanism used with RLS to authorize database access.

### Secret key

`SUPABASE_SECRET_KEY` is only needed for the owner feature that creates a brand-new employee Auth account through `auth.admin.create_user()`. Supabase documents Auth Admin methods as server-only and requiring a secret key. Never put that key in a frontend application.
