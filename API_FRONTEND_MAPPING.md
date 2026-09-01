# FlowBase — API to Frontend Mapping Specification

This document maps all frontend user interactions, forms, buttons, and display cards to their corresponding FastAPI backend endpoints.

---

## 1. Authentication & Session Management

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `login.html` | Sign In form submission (`#signin-form`) | `/api/v1/auth/login` | `POST` | `{"email": "...", "password": "..."}` | Saves `access_token`, `refresh_token`, and user session to `localStorage`; resolves active shop; redirects to `dashboard.html`. | **Connected** |
| `login.html` | Sign Up form submission (`#signup-form`) | `/api/v1/auth/signup` | `POST` | `{"name": "...", "email": "...", "password": "...", "phone": "..."}` | On auto-login token receipt: saves session, creates default initial shop via `POST /shops`, redirects to `dashboard.html`. If confirmation required: displays success message. | **Connected** |
| `login.html` | Demo Account Buttons (Owner / Cashier) | `/api/v1/auth/login` | `POST` | Prefills demo credentials and submits login | Authenticates demo session with role preset. | **Connected** |
| All Pages | Session Verification (`initAuthGuard`) | `/api/v1/auth/me` | `GET` | Header: `Authorization: Bearer <token>` | Syncs profile name, role badge in top navbar, and user membership list. Redirects to `login.html` if token expired/invalid. | **Connected** |
| All Pages | Global Logout Modal (`#logout-confirm`) | `/api/v1/auth/logout` | `POST` | Header: `Authorization: Bearer <token>` | Clears `localStorage` session keys (`flowbase_*`), shows toast, and redirects to `login.html`. | **Connected** |
| All Pages | User Profile Modal (`#header-user-btn`) | `/api/v1/auth/me` | Local Cache / Live Refetch | Header: `Authorization: Bearer <token>` | Displays user avatar initials, full name, email, role badge (`OWNER`/`ADMIN`/`STAFF`), active store, and sign out button. | **Connected** |
| All Pages | Dark Theme Switcher (`#theme-toggle-btn`) | Client Theme Manager (`applyTheme`) | N/A | Theme: `dark` or `light` | Toggles `data-theme="dark"`, inverts UI palettes seamlessly, and persists state in `localStorage.getItem('flowbase_theme')`. | **Connected** |

---

## 2. Dashboard (`dashboard.html`)

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dashboard.html` | Page Load & Period Filter (`loadDashboardData`) | `/api/v1/dashboard/{shop_id}` | `GET` | Path param: `shop_id` | Populates KPI cards (Revenue, Expenses, Net Profit, Inventory Health %, Total Members), Sales Trends chart, Top Selling Products, and Low Stock Alerts. | **Connected** |
| `dashboard.html` | Recent Bills Table (`loadDashboardData`) | `/api/v1/sales/{shop_id}` | `GET` | Path param: `shop_id` | Populates recent 5 transactions with bill number, customer amount, payment method, and formatted date. | **Connected** |

---

## 3. Products & Category Management (`products.html`)

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `products.html` | Page Initialization (`loadData`) | `/api/v1/shops/{shop_id}/products` | `GET` | Path param: `shop_id` | Populates master product list, table, search/filter indices, and total/active/low-stock KPI metrics. | **Connected** |
| `products.html` | Category Dropdowns & List | `/api/v1/shops/{shop_id}/categories` | `GET` | Path param: `shop_id` | Fills category filter dropdown, product add/edit dropdown, and category manager list with live records. | **Connected** |
| `products.html` | Create Category (`#cat-add-form`) | `/api/v1/shops/{shop_id}/categories` | `POST` | `{"name": "...", "description": "..."}` | Creates new category in PostgreSQL, updates dropdowns, and refreshes category list. | **Connected** |
| `products.html` | Edit Category (`#cat-edit-form`) | `/api/v1/shops/{shop_id}/categories/{id}` | `PATCH` | `{"name": "...", "description": "..."}` | Updates category details in database and re-renders list. | **Connected** |
| `products.html` | Delete Category (`[data-delete-cat]`) | `/api/v1/shops/{shop_id}/categories/{id}` | `DELETE` | Path params | Deletes category row from database and refreshes categories. | **Connected** |
| `products.html` | Add New Product (`initFormSubmit`) | `/api/v1/shops/{shop_id}/products` | `POST` | `{"name": "...", "category_id": 1, "purchase_price": 450, "selling_price": 699, "stock_quantity": 40, "low_stock_threshold": 10, "description": "..."}` | Adds product row via Supabase PostgreSQL, closes modal, displays toast, and refreshes table. | **Connected** |
| `products.html` | Edit Product (`initFormSubmit`) | `/api/v1/shops/{shop_id}/products/{product_id}` | `PATCH` | `{"name": "...", "category_id": 1, "purchase_price": 450, "selling_price": 699, "stock_quantity": 40, "low_stock_threshold": 10, "description": "..."}` | Updates product in database, closes modal, and refreshes UI. | **Connected** |
| `products.html` | Delete Product (`initDeleteModal`) | `/api/v1/shops/{shop_id}/products/{product_id}` | `DELETE` | Path params: `shop_id`, `product_id` | Deletes product from shop catalog, updates table and KPIs. | **Connected** |
| `products.html` | Export CSV | Client-Side Filtered Data | N/A | Export current table view to `.csv` | Generates downloadable CSV with active catalog entries. | **Connected** |

---

## 4. Employees & Payroll (`employees.html`)

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `employees.html` | Load Employees Directory (`loadData`) | `/api/v1/shops/{shop_id}/members` | `GET` | Path param: `shop_id` | Loads shop members, profile avatars, email, phone, role badges, base salaries, joined dates, and KPI summaries. | **Connected** |
| `employees.html` | Create New User Employee (`#emp-create-form`) | `/api/v1/shops/{shop_id}/members/new` | `POST` | `{"name": "...", "email": "...", "password": "...", "phone": "...", "role": "STAFF", "salary": 25000}` | Creates Supabase auth account with metadata and inserts `shop_members` record with role and base salary. | **Connected** |
| `employees.html` | Add Existing User Member (`#emp-existing-form`) | `/api/v1/shops/{shop_id}/members/existing` | `POST` | `{"user_id": "<uuid>", "role": "STAFF", "salary": 30000}` | Adds existing registered user to shop roster. | **Connected** |
| `employees.html` | Edit Member Role & Salary (`#emp-edit-form`) | `/api/v1/shops/{shop_id}/members/{id}` | `PATCH` | `{"role": "ADMIN", "salary": 35000}` | Updates member's shop role and monthly base salary in database. | **Connected** |
| `employees.html` | Remove Member (`#emp-delete-modal`) | `/api/v1/shops/{shop_id}/members/{id}` | `DELETE` | Path params: `shop_id`, `member_id` | Removes employee from shop membership (cannot remove Owner). | **Connected** |
| `employees.html` | Record Salary Payment (`#salary-pay-form`) | `/api/v1/salaries` | `POST` | `{"shop_member_id": 1, "amount": 25000, "salary_month": "2026-08-01"}` | Calls backend `record_salary` RPC to record monthly payroll ledger transaction. | **Connected** |
| `employees.html` | View Payroll History (`#view-salaries-btn`) | `/api/v1/salaries/{shop_id}` | `GET` | Path param: `shop_id` | Displays salary transaction ledger table in modal. | **Connected** |

---

## 5. Purchases & Operating Expenses (`purchases_expenses.html`)

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `purchases_expenses.html` | Load Records & KPIs (`loadData`) | `/api/v1/expenses/{shop_id}` & `/api/v1/purchases/{shop_id}` | `GET` | Path param: `shop_id` | Populates Operating Expenses table, Stock Purchases table, and Outflow KPI summary cards. | **Connected** |
| `purchases_expenses.html` | Record Operating Expense (`#expense-form`) | `/api/v1/expenses` | `POST` | `{"shop_id": 1, "category": "Rent", "amount": 15000, "expense_date": "2026-08-31", "description": "Shop rent"}` | Inserts expense record in database, updates outflow KPIs and expenses table. | **Connected** |
| `purchases_expenses.html` | New Stock Purchase (`#purchase-form`) | `/api/v1/purchases` | `POST` | `{"shop_id": 1, "reference_number": "INV-101", "description": "...", "items": [{"product_id": 1, "quantity": 50, "unit_cost": 250}]}` | Calls backend `create_stock_purchase` RPC which auto-increments product stock quantities and logs inventory transactions. | **Connected** |
| `purchases_expenses.html` | View Purchase Line Items (`openViewPurchaseModal`) | `/api/v1/purchases/{shop_id}` | Local Cache / Live Refetch | Purchase ID | Displays line-item modal with product names, quantities, unit costs, and subtotal. | **Connected** |

---

## 6. Point of Sale & Billing (`billing.html`)

| Frontend Page | Frontend Function / Event | Backend API Endpoint | HTTP Method | Request Payload / Params | Response Handling | Connection Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `billing.html` | Load POS Catalog & History (`loadData`) | `/api/v1/shops/{shop_id}/products` & `/api/v1/sales/{shop_id}` | `GET` | Path param: `shop_id` | Populates POS product selection list, checks live stock, and loads recent completed bills. | **Connected** |
| `billing.html` | Complete Bill / Checkout (`completeBill`) | `/api/v1/sales` | `POST` | `{"shop_id": 1, "bill_number": "FB-000001", "tax": 0.0, "discount": 0.0, "items": [{"product_id": 1, "quantity": 2}]}` | Triggers backend `create_sale` atomic RPC: validates inventory, deducts stock, creates inventory transactions, creates sale and sale_items. | **Connected** |
| `billing.html` | View Bill Modal (`openViewBill`) | `/api/v1/sales/{shop_id}` | Local Cache / Live Refetch | Sale ID / Bill Number | Renders printable formatted invoice receipt modal with line items, tax, discount, and grand total. | **Connected** |
| `billing.html` | Print Thermal Receipt (`printBill`) | Client Print Template | N/A | Sale ID | Formats receipt into `@media print` layout and invokes browser native print dialog. | **Connected** |
