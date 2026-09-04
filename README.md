# Eattie — Bakery Management System

> Sistem manajemen toko roti lengkap dengan Next.js + Supabase.

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd eattie
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key

Optional:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — For push notifications (generate with `npm run generate-vapid`)
- `NEXT_PUBLIC_STORE_WHATSAPP` — WhatsApp number for order notifications
- `VAPID_SUBJECT` — VAPID subject email (default: `mailto:admin@yourdomain.com`)

### 3. Setup Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the full setup script: `supabase/migrations/000000_full_setup.sql`
4. This creates all tables, RLS policies, RPC functions, and seeds

### 4. Generate VAPID Keys (Optional — for push notifications)

```bash
npm run generate-vapid
# Copy the keys to .env.local
```

### 5. Create First User

1. Run `npm run dev` and open http://localhost:3000
2. Sign up via the app
3. In Supabase SQL Editor, promote yourself to owner:

```sql
UPDATE profiles SET role = 'owner' WHERE id = 'your-user-id';
```

### 6. Customize Branding

1. Login as owner
2. Go to Settings → Store
3. Change company name, logo, colors, tagline
4. All changes apply instantly — no code edits needed

### 7. Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **UI**: Tailwind CSS + Lucide Icons
- **State**: React Context + Server Actions
- **Print**: react-to-print
- **Push**: web-push

## Project Structure

```
├── app/
│   ├── (auth)/              # Login, sign-up
│   ├── dashboard/           # Dashboard + all modules
│   ├── pos/                 # POS full-screen
│   ├── store/               # Customer storefront
│   └── api/                 # API routes (push)
├── components/
│   ├── layout/              # Sidebar, Header
│   ├── forms/               # Form components
│   ├── ui/                  # Shared UI components
│   ├── pos/                 # POS components
│   ├── store/               # Storefront components
│   ├── shared/              # Shared components
│   ├── accounting/          # Accounting components
│   ├── audit/               # Audit trail
│   └── charts/              # Chart components
├── contexts/                # React Context providers
├── actions/                 # Server Actions
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── push/                # Push notification
│   └── utils.ts             # Helper functions
├── types/                   # TypeScript types
├── config/                  # Theme & branding config
├── styles/                  # Global CSS
├── hooks/                   # Custom hooks
├── public/
│   └── branding/            # Logo files
└── supabase/
    ├── migrations/          # Database migrations
    └── seeds/               # Seed data
```

## Features

### Dashboard & Reports
- Revenue dashboard with charts
- Trial balance & journal entries
- Sales, production, financial reports
- Audit trail for all data changes

### Inventory
- Ingredient management with stock tracking
- Purchase orders with auto-receive
- Stock opname with variance journal
- Supplier management

### Products & Recipes
- Product catalog with variants & addons
- Recipe management with cost calculation
- Production batch tracking

### Sales & POS
- Full POS interface with cart
- Multiple payment methods (cash, card, transfer, QRIS)
- Receipt printing
- Sales history & analytics

### Store Online
- Customer-facing storefront
- Product catalog with filters
- Cart & checkout
- Payment proof upload
- WhatsApp order notification

### Custom Cake
- Request submission from storefront
- Status tracking (pending → quoted → confirmed → in production → ready → delivered)
- Price quoting
- WhatsApp quick reply

### User Management
- Three roles: Owner, Cashier, Baker
- Role-based access control (RLS)
- Module-level permissions

### Accounting
- Double-entry journal
- Chart of accounts
- Accounts Receivable / Payable
- Fiscal period closing
- Automatic journal triggers

## Role Permissions

| Feature | Owner | Cashier | Baker |
|---------|:-----:|:-------:|:-----:|
| Dashboard | ✅ Full | ✅ Sales | ✅ Production |
| Inventory | ✅ | ❌ | ✅ Read |
| Products | ✅ | ✅ Read | ✅ Read |
| Recipes | ✅ | ❌ | ✅ Read |
| Production | ✅ | ❌ | ✅ Full |
| POS/Sales | ✅ | ✅ | ❌ |
| Accounting | ✅ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

## License

See [LICENSE](./LICENSE)
