'use client';

import { useMemo, useState } from 'react';

export type TransactionStage = 'idle' | 'preparing' | 'submitted' | 'awaiting' | 'confirmed' | 'failed';

export interface TransactionLifecycleState {
  stage: TransactionStage;
  title: string;
  description: string;
  transactionId?: string;
}

const idleState: TransactionLifecycleState = {
  stage: 'idle',
  title: '',
  description: '',
};

export function useTransactionLifecycle() {
  const [state, setState] = useState<TransactionLifecycleState>(idleState);

  const actions = useMemo(
    () => ({
      reset() {
        setState(idleState);
      },
      setPreparing(title: string, description: string) {
        setState({ stage: 'preparing', title, description });
      },
      setSubmitted(title: string, description: string, transactionId?: string) {
        setState({ stage: 'submitted', title, description, transactionId });
      },
      setAwaiting(title: string, description: string, transactionId?: string) {
        setState({ stage: 'awaiting', title, description, transactionId });
      },
      setConfirmed(title: string, description: string, transactionId?: string) {
        setState({ stage: 'confirmed', title, description, transactionId });
      },
      setFailed(title: string, description: string, transactionId?: string) {
        setState({ stage: 'failed', title, description, transactionId });
      },
    }),
    []
  );

  return { state, ...actions };
}
