# @cashmgr/db

Database schema definitions, migrations, and initialization helpers.

## Contents

- **schema/** - SQLite table definitions
- **migrations/** - Database migration system (placeholder)
- **init/** - Database initialization helpers

## Schema

The database includes the following tables:

- `accounts` - User accounts (cash, bank, credit card, etc.)
- `categories` - Income and expense categories
- `transactions` - Financial transactions

All tables include proper indexes for query optimization.

## Usage

```typescript
import { ALL_SCHEMA_STATEMENTS, initializeDatabase } from '@cashmgr/db';

// Initialize database with schema
await initializeDatabase(databaseAdapter);
```

## Development: Sample Data Seeding

The package includes a seeding system to populate the database with realistic sample data for development and testing. Seeding is available across all platforms.

### Sample Data Created

All seeding methods create the same data:

- **4 Accounts**: Primary Checking, Savings Account, Credit Card, Cash Wallet
- **15 Categories**: 4 income categories (Salary, Freelance, Investments, Gifts) and 11 expense categories (Groceries, Dining Out, Transportation, Utilities, Rent, Healthcare, Entertainment, Shopping, Education, Insurance, Subscriptions)
- **~93 Transactions**: 90 days of realistic transaction data including monthly salary, rent, groceries, dining, utilities, and occasional freelance income

### CLI Seeding (Development Environment & Desktop)

For Node.js-based development databases and the Electron desktop app:

```bash
# Seed with sample data (development only)
pnpm --filter @cashmgr/db seed

# Remove all seed data
pnpm --filter @cashmgr/db seed:clear
```

### Mobile App Seeding (React Native/Expo)

For the mobile app, use the in-app seeding functions:

```typescript
import { seedMobileDatabase, clearMobileSeedData, hasMobileData } from '@cashmgr/mobile/src/database/mobile-seed';

// Check if database has data
const hasData = await hasMobileData();

// Seed the database
await seedMobileDatabase();

// Clear seed data
await clearMobileSeedData();
```

Tip: Add a "Load Sample Data" button in your Settings screen that calls `seedMobileDatabase()`.

### Web App Seeding (Browser)

For the web app, use the in-app seeding functions:

```typescript
import { seedWebDatabase, clearWebSeedData, hasWebData } from '@cashmgr/web/src/database/web-seed';

// Check if database has data
const hasData = await hasWebData();

// Seed the database
await seedWebDatabase();

// Clear seed data
await clearWebSeedData();
```

### Safety Features

- **Production Protection**: Automatically prevents running in production environments (`NODE_ENV === 'production'`)
- **Duplicate Detection**: Warns if database already contains data before seeding
- **Realistic Data**: Transaction amounts, dates, and patterns mimic real-world usage

### Programmatic Usage

```typescript
import { seedDatabase, clearSeedData, SEED_ACCOUNTS, SEED_CATEGORIES } from '@cashmgr/db';

// Seed the database
await seedDatabase(db);

// Clear all seed data
await clearSeedData(db);

// Access seed constants for testing
console.log(SEED_ACCOUNTS); // Array of sample accounts
console.log(SEED_CATEGORIES); // Array of sample categories
```

## Building

```bash
pnpm build
```

Output in `dist/` directory.
