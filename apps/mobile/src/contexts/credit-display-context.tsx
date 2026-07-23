import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '@cashmgr/core';

const SHOW_CREDIT_BALANCES_STORAGE_KEY = 'cashmgr-show-credit-balances';

interface CreditDisplayContextValue {
  show: boolean;
  setShow: (show: boolean) => void;
}

const CreditDisplayContext = React.createContext<CreditDisplayContextValue | null>(null);

export function CreditDisplayProvider({ children }: { children: React.ReactNode }) {
  const [show, setShowState] = React.useState<boolean>(true);

  React.useEffect(() => {
    AsyncStorage.getItem(SHOW_CREDIT_BALANCES_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'true' || stored === 'false') {
          setShowState(stored === 'true');
        }
      })
      .catch(() => {
        // AsyncStorage unavailable, keep default
      });
  }, []);

  const setShow = React.useCallback((value: boolean) => {
    setShowState(value);
    AsyncStorage.setItem(SHOW_CREDIT_BALANCES_STORAGE_KEY, String(value)).catch((err) => {
      getLogger().warn('Failed to save show-credit-balances preference', { error: err });
    });
  }, []);

  const value = React.useMemo(() => ({ show, setShow }), [show, setShow]);

  return <CreditDisplayContext.Provider value={value}>{children}</CreditDisplayContext.Provider>;
}

export function useShowCreditBalances(): CreditDisplayContextValue {
  const ctx = React.useContext(CreditDisplayContext);
  if (!ctx) {
    throw new Error('CreditDisplayProvider is missing from component tree.');
  }
  return ctx;
}
