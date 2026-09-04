# Eattie — Role & Permission Matrix

## Roles

| Role | Description | Count |
|------|-------------|-------|
| `owner` | Full access — admin, accounting, all operations | 1 |
| `cashier` | POS, sales, orders, payments | 2 |
| `baker` | Production, inventory management | 1 |

---

## Permission Matrix

### Legend
- ✅ = Allowed
- ❌ = Denied
- 🔑 = Via RPC with role check
- 📖 = Read-only via RLS

---

### Orders & Sales

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| Create order (store online) | ✅ | ✅ | ❌ |
| View orders | ✅ | ✅ | ❌ |
| Confirm payment (NEW → PAID) | ✅ | ✅ | ❌ |
| Cancel order | ✅ | ✅ | ❌ |
| Start production | ✅ | ❌ | ❌ |
| Mark ready for pickup | ✅ | ❌ | ❌ |
| Deliver order | ✅ | ❌ | ❌ |
| Complete order | ✅ | ❌ | ❌ |
| Mark as paid | ✅ | ✅ | ❌ |
| Void sale (cancel POS) | ✅ | ✅ | ❌ |
| Create sale (POS) | ✅ | ✅ | ❌ |
| View sales | ✅ | ✅ | ❌ |
| View revenue reports | ✅ | ❌ | ❌ |

### Production

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| Create production batch | ✅ | ❌ | ✅ |
| View batches | ✅ | ❌ | ✅ |
| Start production (planned → in_progress) | ✅ | ❌ | ✅ |
| Complete production | ✅ | ❌ | ✅ |
| Cancel batch | ✅ | ❌ | ✅ |
| Delete batch | ✅ | ❌ | ❌ |
| View recipes | ✅ | ❌ | 🔑 |

### Inventory

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View ingredients | ✅ | ❌ | ✅ |
| Create/edit ingredients | ✅ | ❌ | ❌ |
| View stock movements | ✅ | ❌ | ✅ |
| Create stock opname | ✅ | ❌ | ✅ |
| Complete stock opname | ✅ | ❌ | ❌ |
| View purchases | ✅ | ❌ | ✅ |
| Create purchase | ✅ | ❌ | ❌ |
| Receive purchase (process_purchase) | ✅ | ❌ | ❌ |
| View suppliers | ✅ | ❌ | ✅ |
| Create/edit suppliers | ✅ | ❌ | ❌ |

### Accounting

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View chart of accounts | ✅ | ❌ | ❌ |
| View journal entries | ✅ | ❌ | ❌ |
| Create manual journal entry | ✅ | ❌ | ❌ |
| View trial balance | ✅ | ❌ | ❌ |
| View fiscal periods | ✅ | ❌ | ❌ |
| Close fiscal period | ✅ | ❌ | ❌ |
| View AR/AP | ✅ | ❌ | ❌ |
| Record payment | ✅ | ❌ | ❌ |
| View accounting reports | ✅ | ❌ | ❌ |

### Expenses

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View expenses | ✅ | ❌ | ❌ |
| Create expense | ✅ | ✅ | ✅ |
| Approve expense | ✅ | ❌ | ❌ |
| Reject expense | ✅ | ❌ | ❌ |
| Edit expense | ✅ | ❌ | ❌ |

### Custom Cakes

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View requests | ✅ | ❌ | ❌ |
| Update status & price | ✅ | ❌ | ❌ |
| Submit request (customer) | ✅ | ✅ | ✅ |

### Products & Recipes

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View products | ✅ | ✅ | ✅ |
| Create/edit products | ✅ | ❌ | ❌ |
| View recipes | ✅ | ❌ | 🔑 |
| Create/edit recipes | ✅ | ❌ | ❌ |
| View product variants | ✅ | ✅ | ✅ |
| Manage addons | ✅ | ❌ | ❌ |

### Users & Settings

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View profiles | ✅ | ❌ | ❌ |
| Create/edit users | ✅ | ❌ | ❌ |
| Manage roles | ✅ | ❌ | ❌ |
| View settings | ✅ | ✅ | ✅ |
| Edit settings | ✅ | ❌ | ❌ |
| Manage modules | ✅ | ❌ | ❌ |

### Reports

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View sales reports | ✅ | ❌ | ❌ |
| View production reports | ✅ | ❌ | ❌ |
| View financial reports | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

### Reviews

| Action | Owner | Cashier | Baker |
|--------|:-----:|:-------:|:-----:|
| View reviews | ✅ | ❌ | ❌ |
| Toggle featured | ✅ | ❌ | ❌ |
| Submit review (customer) | ✅ | ✅ | ✅ |

---

## RPC Security (SECURITY DEFINER)

All RPCs below use `assert_role()` for server-side validation via `auth.uid()` from JWT.

### Owner Only
| RPC | Description |
|-----|-------------|
| `rpc_start_production` | Start order production |
| `rpc_ready_for_pickup` | Mark order ready |
| `rpc_deliver_order` | Mark order delivered |
| `rpc_complete_order` | Complete order |
| `process_purchase` | Receive stock purchase |
| `process_stock_opname` | Complete stock opname |
| `cancel_auto_order` | Auto-cancel expired orders |
| `update_custom_cake_request_rpc` | Update custom cake status |

### Owner or Cashier
| RPC | Description |
|-----|-------------|
| `rpc_confirm_order` | Confirm payment & create sale |
| `rpc_cancel_order` | Cancel order |
| `rpc_mark_paid` | Mark order as paid |
| `void_sale` | Void POS sale |
| `process_sale` | Process POS sale |

### Owner or Baker
| RPC | Description |
|-----|-------------|
| `complete_production_batch` | Complete production batch |
| `update_production_batch_status` | Update batch status |

### Authenticated (any role)
| RPC | Description |
|-----|-------------|
| `get_order_actions` | Get valid order actions |
| `get_custom_cake_actions` | Get valid custom cake actions |
| `get_recipe_id_for_product` | Lookup recipe for product |
| `has_module_access` | Check module permission |
| `get_user_role` | Get current user role |
| `next_doc_number` | Generate document number |
| `generate_cc_request_number` | Generate custom cake number |

### Internal (trigger/system)
| RPC | Description |
|-----|-------------|
| `assert_role` | Role validation helper |
| `handle_audit_log` | Audit log trigger |
| `handle_new_user` | New user trigger |
| `log_order_status_change` | Order status log trigger |
| `trg_sync_customer_from_sale` | Sync customer from sale |
| `trg_sync_customer_from_order` | Sync customer from order |
| `fn_calculate_recipe_cost` | Calculate recipe standard cost |
| `fn_check_fiscal_period` | Fiscal period guard |
| `fn_update_product_cost_from_batch` | Auto-update cost_price |
| `fn_journalize_*` | Journal triggers (sale, expense, payment, purchase, production, ar_creation, reversal) |
| `decrement_variant_stock` | Decrement variant stock |

---

## RLS Policies

### Tables with RLS Enabled
All 50+ tables in `public` schema have `ENABLE RLS`.

### Common Patterns

**Owner-only tables:**
- `chart_of_accounts`, `journal_entries`, `journal_lines` — `get_user_role() = 'owner'`
- `fiscal_periods`, `audit_logs` — `get_user_role() = 'owner'`

**Authenticated access:**
- `products`, `product_variants`, `categories` — `authenticated` role
- `production_batches` — `authenticated` role

**Role-based:**
- `module_permissions` — `has_module_access(p_module, p_action)`

---

## Status Transition Diagram

### Orders
```
NEW → PAID → IN_PRODUCTION → READY_FOR_PICKUP → DELIVERED → COMPLETED
  ↓       ↓
CANCELLED (from NEW or PAID only)
```

### Production Batches
```
planned → in_progress → completed
   ↓          ↓
cancelled  cancelled
```

### Custom Cakes
```
pending → quoted → confirmed → in_production → ready → delivered
   ↓         ↓          ↓            ↓
cancelled  cancelled  cancelled    cancelled
```

### Sales
```
pending → completed
   ↓
cancelled / refunded
```

---

## Environment Variables

| Variable | Required For | Description |
|----------|--------------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications | VAPID public key |
| `VAPID_PRIVATE_KEY` | Push notifications | VAPID private key |
| `VAPID_SUBJECT` | Push notifications | VAPID subject (email) |

---

## Security Notes

1. **All SECURITY DEFINER RPCs** now use `assert_role()` — bypassing app layer (direct REST call) still requires authenticated JWT with correct role.

2. **RLS** is enabled on all tables — even if RPC is bypassed, table-level policies block unauthorized access.

3. **auth.uid()** is read from JWT token — cannot be spoofed by client.

4. **Cron jobs** (`cancel_auto_order`) run as SECURITY DEFINER without user context — acceptable for automated cleanup tasks.
