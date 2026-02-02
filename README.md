# Takt - Transportation Planning Platform

A modern, multi-tenant SaaS platform for transportation and logistics planning. Built with Next.js 15, Prisma, and PostgreSQL.

## Features

### Multi-Tenancy
- **Organization-based isolation** - Complete data separation between organizations
- **Auto-join by email domain** - Users automatically join their organization based on company email
- **Multi-org support** - Users can belong to multiple organizations
- **Domain management** - Organizations can claim and verify email domains

### Planning & Forecasting
- **Demand forecasting** - Forecast shipment demand by route and time period
- **Supply commitment** - Track supplier capacity commitments
- **Gap analysis** - Identify supply-demand gaps
- **Weekly planning** - Plan across weekly time horizons
- **Multiple truck types** - Support for different resource types (Flatbed, Curtainside, Reefer, etc.)

### Data Management
- **Repository management** - Manage clients, suppliers, cities, and truck types
- **Bulk import** - Import data via CSV, Excel, or Redash queries
- **Drag & drop uploads** - Easy file upload with visual feedback
- **Duplicate detection** - Automatic skipping of existing records
- **Data validation** - Row-by-row error reporting

### Import Features
- **CSV/Excel upload** - Supports .csv, .xlsx, and .xls files
- **Redash integration** - Import directly from Redash query URLs
- **Template download** - Get correctly formatted CSV templates
- **Preview** - Review first 5 rows before importing
- **Flexible column mapping** - Automatic detection of various column names

See [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) for detailed import instructions.

### User Management
- **Role-based access** - ADMIN, DEMAND_PLANNER, SUPPLY_PLANNER roles
- **Organization roles** - OWNER, ADMIN, MEMBER permissions
- **Audit logging** - Track all system actions
- **Session management** - Secure authentication with cookies

### Reporting & Analytics
- **Dashboard** - Real-time overview of planning metrics
- **Gap reports** - Routes with largest supply-demand gaps
- **Performance tracking** - Forecast accuracy and commitment tracking
- **Export capabilities** - Export data for external analysis

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Cookie-based sessions with bcrypt
- **UI**: shadcn/ui components with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Data fetching**: React Query (TanStack Query)
- **File parsing**: PapaParse (CSV) + SheetJS (Excel)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd takt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random string for session encryption
- `NEXT_PUBLIC_APP_URL` - Your application URL

4. Set up the database:
```bash
# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

The application uses generic planning primitives:

- **Organization** - Multi-tenant isolation
- **User** - User accounts with role-based access
- **Party** - Clients and suppliers (with `partyRole` enum)
- **Location** - Cities and addresses (with `locationType` enum)
- **ResourceType** - Truck types and other resources
- **PlanningWeek** - Weekly planning periods
- **DemandForecast** - Forecasted demand by route
- **SupplyCommitment** - Supplier capacity commitments

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API endpoints
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── layout/           # Layout components (header, sidebar)
│   └── repositories/     # Repository management components
├── lib/                  # Utility functions and configurations
│   ├── auth.ts          # Authentication helpers
│   ├── prisma.ts        # Prisma client
│   ├── org-scoped.ts    # Multi-tenancy helpers
│   └── validations/     # Zod schemas
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions

prisma/
├── schema.prisma        # Database schema
├── seed.ts             # Seed data script
└── migrations/         # Database migrations
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get current session

### Repository Management
- `GET/POST /api/clients` - Manage clients
- `GET/POST /api/suppliers` - Manage suppliers
- `GET/POST /api/cities` - Manage cities
- `GET/POST /api/truck-types` - Manage truck types

### Bulk Import
- `POST /api/clients/import` - Import clients from CSV/Excel
- `POST /api/suppliers/import` - Import suppliers from CSV/Excel
- `POST /api/cities/import` - Import cities from CSV/Excel
- `POST /api/truck-types/import` - Import truck types from CSV/Excel
- `POST /api/admin/import-from-redash` - Import from Redash query URL

### Planning
- `GET/POST /api/planning-weeks` - Manage planning weeks
- `GET/POST /api/demand` - Demand forecasts
- `GET/POST /api/supply` - Supply commitments
- `GET /api/dashboard` - Dashboard metrics

### Admin
- `GET /api/admin/users` - List organization users
- `PATCH /api/admin/users/[userId]/role` - Update user role
- `GET /api/admin/audit` - Audit log

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Run database migrations
- `npx prisma db seed` - Seed database with sample data

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/takt"

# Session
SESSION_SECRET="your-secret-key-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: For production
NODE_ENV="production"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
