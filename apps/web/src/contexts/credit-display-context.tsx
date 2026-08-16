import React from 'react';

const SHOW_CREDIT_BALANCES_STORAGE_KEY = 'cashmgr-show-credit-balances';

interface CreditDisplayContextValue {
  show: boolean;
  setShow: (show: boolean) => void;
}

const CreditDisplayContext = React.createContext<CreditDisplayContextValue | null>(null);

function loadShow(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_CREDIT_BALANCES_STORAGE_KEY);
    if (stored === 'true' || stored === 'false') {
      return stored === 'true';
    }
  } catch {
    // localStorage unavailable
  }
  return true;
}

export function CreditDisplayProvider({ children }: { children: React.ReactNode }) {
  const [show, setShowState] = React.useState<boolean>(loadShow);

  const setShow = React.useCallback((value: boolean) => {
    setShowState(value);
    try {
      localStorage.setItem(SHOW_CREDIT_BALANCES_STORAGE_KEY, String(value));
    } catch {
      // localStorage unavailable
    }
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
