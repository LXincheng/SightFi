import { useEffect, useMemo, useState } from 'react';
import type { MarketQuote } from '@sightfi/shared';
import { createQuoteStream } from '../services/sightfi-api';

export interface LiveQuotesState {
  quotes: MarketQuote[];
  streamConnected: boolean;
  streamError: string | null;
}

export function useLiveQuotes(initialQuotes: MarketQuote[]): LiveQuotesState {
  const [quotes, setQuotes] = useState<MarketQuote[]>(initialQuotes);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const symbols = useMemo(
    () => initialQuotes.map((item) => item.symbol),
    [initialQuotes],
  );

  useEffect(() => {
    setQuotes(initialQuotes);
  }, [initialQuotes]);

  useEffect(() => {
    if (symbols.length === 0) {
      return undefined;
    }

    const stream = createQuoteStream(
      symbols,
      (nextQuotes) => {
        setQuotes(nextQuotes);
        setStreamConnected(true);
        setStreamError(null);
      },
      (message) => {
        setStreamConnected(false);
        setStreamError(message);
      },
    );

    stream.onopen = () => {
      setStreamConnected(true);
      setStreamError(null);
    };

    return () => {
      stream.close();
    };
  }, [symbols]);

  return {
    quotes,
    streamConnected,
    streamError,
  };
}
