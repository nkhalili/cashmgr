import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';
import { AppError, ErrorHandler } from '@cashmgr/core';
import { useDatabase } from '../services/services-context';
import { seedWebDatabase, clearWebSeedData, hasWebData } from '../database/web-seed';

export function SettingsDevelopment() {
  const theme = useTheme();
  const db = useDatabase();

  const [isSeeding, setIsSeeding] = React.useState(false);
  const [hasData, setHasData] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkHasData = React.useCallback(async () => {
    try {
      const result = await hasWebData(db);
      setHasData(result);
    } catch (err) {
      ErrorHandler.handle(err, 'SettingsDevelopment.checkHasData');
    }
  }, [db]);

  React.useEffect(() => {
    void checkHasData();
  }, [checkHasData]);

  const handleLoadSampleData = React.useCallback(async () => {
    const confirmed = window.confirm(
      'This will add 4 accounts, 15 categories, and ~93 transactions to your database. Continue?'
    );
    if (!confirmed) return;
    setIsSeeding(true);
    setError(null);
    try {
      await seedWebDatabase(db);
      await checkHasData();
      window.alert('Sample data loaded successfully!');
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load sample data';
      setError(errorMessage);
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setIsSeeding(false);
    }
  }, [db, checkHasData]);

  const handleClearSampleData = React.useCallback(async () => {
    const confirmed = window.confirm(
      'This will delete ALL accounts, categories, and transactions from your database. This action cannot be undone!'
    );
    if (!confirmed) return;
    setIsSeeding(true);
    setError(null);
    try {
      await clearWebSeedData(db);
      await checkHasData();
      window.alert('All data cleared successfully!');
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to clear data';
      setError(errorMessage);
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setIsSeeding(false);
    }
  }, [db, checkHasData]);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Link
          to="/settings"
          className="settings-breadcrumb-link"
          style={{ color: theme.colors.primary, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}
        >
          Settings
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
        <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
          Development
        </h2>
      </div>

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Card
        title="Development"
        subtitle="Sample data for testing and development"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <Button type="button" variant="primary" onClick={handleLoadSampleData} disabled={isSeeding}>
              {isSeeding ? 'Loading...' : 'Load Sample Data'}
            </Button>
            {hasData && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearSampleData}
                disabled={isSeeding}
                style={{ backgroundColor: '#fee', borderColor: '#fcc', color: '#c00' }}
              >
                {isSeeding ? 'Clearing...' : 'Clear All Data'}
              </Button>
            )}
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          {hasData
            ? 'Load sample data to test features with realistic accounts, categories, and transactions. Sample data includes 4 accounts, 15 categories, and ~93 transactions over 90 days.'
            : 'Your database is empty. Load sample data to get started quickly with 4 accounts, 15 categories, and ~93 transactions.'}
        </p>
      </Card>
    </div>
  );
}
