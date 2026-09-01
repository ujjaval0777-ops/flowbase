-- ============================================================
-- BUSINESS MANAGEMENT API - SUPABASE BACKEND SUPPORT PATCH
-- ============================================================
-- Run after the main project schema.
-- This patch is intentionally compatible with the schema created earlier.
--
-- The backend uses:
--   - Supabase Auth for users/passwords
--   - RLS for normal table operations
--   - RPC functions for atomic business operations
--
-- IMPORTANT:
-- Do not put SUPABASE_SECRET_KEY in a frontend application.
-- ============================================================

-- Data API grants. RLS still controls what authenticated users can do.
grant usage on schema public to authenticated;

grant select, insert, update, delete on
    public.profiles,
    public.shops,
    public.shop_members,
    public.categories,
    public.suppliers,
    public.products,
    public.sales,
    public.sale_items,
    public.purchases,
    public.purchase_items,
    public.expenses,
    public.employee_salaries,
    public.inventory_transactions
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.create_shop(varchar, varchar, varchar, text) to authenticated;
grant execute on function public.create_sale(bigint, varchar, numeric, numeric, jsonb) to authenticated;
grant execute on function public.create_stock_purchase(bigint, bigint, varchar, text, jsonb) to authenticated;
grant execute on function public.record_salary(bigint, numeric, date) to authenticated;

-- ------------------------------------------------------------
-- Profile self-update
-- ------------------------------------------------------------
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- ------------------------------------------------------------
-- Shop member owner policies
-- Initial OWNER is created by create_shop() SECURITY DEFINER.
-- Existing members are managed only by OWNER.
-- ------------------------------------------------------------
drop policy if exists "Members can view shop members" on public.shop_members;
create policy "Members can view shop members"
on public.shop_members for select
using (public.is_shop_member(shop_id));

drop policy if exists "Owners can add shop members" on public.shop_members;
create policy "Owners can add shop members"
on public.shop_members for insert
with check (
    public.has_shop_role(
        shop_id,
        array['OWNER'::public.shop_role]
    )
);

drop policy if exists "Owners can update shop members" on public.shop_members;
create policy "Owners can update shop members"
on public.shop_members for update
using (
    public.has_shop_role(
        shop_id,
        array['OWNER'::public.shop_role]
    )
)
with check (
    public.has_shop_role(
        shop_id,
        array['OWNER'::public.shop_role]
    )
);

drop policy if exists "Owners can remove shop members" on public.shop_members;
create policy "Owners can remove shop members"
on public.shop_members for delete
using (
    public.has_shop_role(
        shop_id,
        array['OWNER'::public.shop_role]
    )
);

-- ------------------------------------------------------------
-- Sale read policy. Sale creation is through create_sale().
-- Direct sale INSERT is not required by the backend.
-- ------------------------------------------------------------
drop policy if exists "Members can view sales" on public.sales;
create policy "Members can view sales"
on public.sales for select
using (public.is_shop_member(shop_id));

-- ------------------------------------------------------------
-- Sale items read policy.
-- The API does NOT insert sale_items directly.
-- ------------------------------------------------------------
drop policy if exists "Members can view sale items" on public.sale_items;
create policy "Members can view sale items"
on public.sale_items for select
using (
    exists (
        select 1
        from public.sales s
        where s.id = sale_items.sale_id
          and public.is_shop_member(s.shop_id)
    )
);

-- ------------------------------------------------------------
-- Purchase read policy. Creation is through create_stock_purchase().
-- ------------------------------------------------------------
drop policy if exists "Members can view purchases" on public.purchases;
create policy "Members can view purchases"
on public.purchases for select
using (public.is_shop_member(shop_id));

drop policy if exists "Members can view purchase items" on public.purchase_items;
create policy "Members can view purchase items"
on public.purchase_items for select
using (
    exists (
        select 1
        from public.purchases p
        where p.id = purchase_items.purchase_id
          and public.is_shop_member(p.shop_id)
    )
);

-- ------------------------------------------------------------
-- Expenses
-- GENERAL expenses are inserted directly by Owner/Admin.
-- PURCHASE/SALARY expenses are created by RPCs.
-- ------------------------------------------------------------
drop policy if exists "Members can view expenses" on public.expenses;
create policy "Members can view expenses"
on public.expenses for select
using (public.is_shop_member(shop_id));

drop policy if exists "Owners and admins create expenses" on public.expenses;
create policy "Owners and admins create expenses"
on public.expenses for insert
with check (
    public.has_shop_role(
        shop_id,
        array[
            'OWNER'::public.shop_role,
            'ADMIN'::public.shop_role
        ]
    )
    and expense_type = 'GENERAL'::public.expense_type
);

-- ------------------------------------------------------------
-- Inventory history is read-only to API clients.
-- Writes are made by business RPCs.
-- ------------------------------------------------------------
drop policy if exists "Members can view inventory transactions" on public.inventory_transactions;
create policy "Members can view inventory transactions"
on public.inventory_transactions for select
using (public.is_shop_member(shop_id));

-- ------------------------------------------------------------
-- Salary read policy.
-- Salary creation is through record_salary().
-- ------------------------------------------------------------
drop policy if exists "Members can view salaries" on public.employee_salaries;
create policy "Members can view salaries"
on public.employee_salaries for select
using (
    exists (
        select 1
        from public.shop_members sm
        where sm.id = employee_salaries.shop_member_id
          and public.is_shop_member(sm.shop_id)
    )
);

-- ------------------------------------------------------------
-- Safer create_shop().
-- SECURITY DEFINER is necessary because a new owner cannot pass an
-- existing-owner membership RLS policy before their first membership exists.
-- ------------------------------------------------------------
create or replace function public.create_shop(
    p_name varchar,
    p_phone varchar default null,
    p_email varchar default null,
    p_address text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_shop_id bigint;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.shops(name, phone, email, address)
    values (p_name, p_phone, p_email, p_address)
    returning id into v_shop_id;

    insert into public.shop_members(shop_id, user_id, role)
    values (v_shop_id, auth.uid(), 'OWNER');

    return v_shop_id;
end;
$$;

grant execute on function public.create_shop(varchar, varchar, varchar, text) to authenticated;

-- ------------------------------------------------------------
-- Revoke dangerous direct writes for tables whose consistency is
-- controlled by RPCs.
-- ------------------------------------------------------------
revoke insert, update, delete on public.sale_items from authenticated;
revoke insert, update, delete on public.purchase_items from authenticated;
revoke insert, update, delete on public.inventory_transactions from authenticated;

-- Direct sales/purchases are also created by RPCs.
revoke insert, update, delete on public.sales from authenticated;
revoke insert, update, delete on public.purchases from authenticated;

-- Salary rows are created by RPC.
revoke insert, update, delete on public.employee_salaries from authenticated;

-- ============================================================
-- END PATCH
-- ============================================================
