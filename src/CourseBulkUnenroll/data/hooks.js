import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';

import { getBulkUnenrollBatchStatus, listBulkUnenrollBatches } from './api';
import {
  BATCH_LIST_POLL_INTERVAL_MS, POLL_INTERVAL_MS, TERMINAL_BATCH_STATES,
} from '../constants';

/**
 * The polling machinery both hooks share: fetch now, then again every `interval`
 * until `isDone(data)` or an error, which polling will not fix.
 *
 * Every request takes a ticket; only the newest may write to state. Overlapping
 * requests are routine here — a poll tick, a filter change and a page change can
 * all be in flight at once — and nothing guarantees replies come back in order,
 * so without the ticket a slow reply for the previous query can land last and
 * replace the results actually asked for.
 *
 * `resetKey` names what the state describes (the batch id). Changing it clears
 * everything *during render* — the old resource must not survive even one painted
 * frame under the new key — and retires the outstanding ticket then and there:
 * the new fetch starts from a passive effect (after paint) while a promise settles
 * on the microtask queue, leaving a gap the old reply could otherwise win.
 */
function usePolledResource({
  enabled = true, resetKey, fetch, interval, isDone,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestSeq = useRef(0);
  // Unmount is itself an invalidation: `cancelled` below only stops the next tick
  // being scheduled, so an already-open request would still resolve and write.
  useEffect(() => () => { requestSeq.current += 1; }, []);

  const [shownKey, setShownKey] = useState(resetKey);
  if (resetKey !== shownKey) {
    setShownKey(resetKey);
    setData(null);
    setError(null);
    requestSeq.current += 1;
  }

  const fetchOnce = useCallback(async () => {
    if (!enabled) { return null; }
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setIsLoading(true);
    const result = await fetch();
    // Superseded — the newer request owns the display and will clear isLoading.
    // Still returned so the poll loop can schedule off it as before.
    if (seq !== requestSeq.current) { return result; }
    setIsLoading(false);
    if (result?.isApiError) {
      setError(result);
      return null;
    }
    setError(null);
    setData(result);
    return result;
  }, [enabled, fetch]);

  useEffect(() => {
    if (!enabled) { return undefined; }

    let cancelled = false;
    let timer = null;

    const tick = async () => {
      const result = await fetchOnce();
      if (cancelled) { return; }
      if (!result || isDone(result)) { return; }
      timer = setTimeout(tick, interval);
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) { clearTimeout(timer); }
    };
    // `interval`/`isDone` are fixed per call site; only a new fetch restarts the loop.
  }, [enabled, fetchOnce]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data, error, isLoading, refresh: fetchOnce,
  };
}

// Refetch when the filter or page changes, without restarting the poll timer.
function useRefetchOnChange(refresh, deps) {
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refresh();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Poll the batch list so the landing page shows what is currently in flight.
 *
 * `state` (the comma-separated API filter) and `page` are primitives, not an
 * options object: an object literal is a new value every render and would
 * restart the poll timer continuously. `batches` is null until the first
 * response, which is how the caller tells "not loaded yet" from "empty".
 */
export function usePolledBatchList(state, page = 1) {
  const intl = useIntl();

  // In a ref so the poll callback reads the current query without the timer
  // being recreated whenever it changes.
  const queryRef = useRef({ state, page });
  queryRef.current = { state, page };

  const fetch = useCallback(() => listBulkUnenrollBatches(queryRef.current, intl), [intl]);
  const {
    data, error, isLoading, refresh,
  } = usePolledResource({
    fetch,
    // Slower than a single batch: background awareness, not progress being watched.
    interval: BATCH_LIST_POLL_INTERVAL_MS,
    // No terminal state to stop on — a colleague can start a run at any moment.
    isDone: () => false,
  });

  useRefetchOnChange(refresh, [state, page]);

  return {
    batches: data ? data.results ?? [] : null,
    count: data?.count ?? 0,
    error,
    isLoading,
    refresh,
  };
}

/**
 * Poll a batch's status until it reaches a terminal state.
 *
 * A batch can run for hours, so polling has to stop on its own: once it is
 * succeeded/partial/failed/cancelled nothing will change again, and a tab left
 * open overnight must not keep hitting the API. `refresh` re-fetches immediately
 * (used after cancel/retry, which change state right away).
 */
export default function usePolledBatchStatus(batchId, { state, page = 1 } = {}) {
  const intl = useIntl();

  const queryRef = useRef({ state, page });
  queryRef.current = { state, page };

  const fetch = useCallback(
    () => getBulkUnenrollBatchStatus(batchId, queryRef.current, intl),
    [batchId, intl],
  );
  const {
    data, error, isLoading, refresh,
  } = usePolledResource({
    enabled: Boolean(batchId),
    // A batch the operator has left must not linger under the new id: cancel and
    // retry act on the URL's id, not on what is displayed.
    resetKey: batchId,
    fetch,
    interval: POLL_INTERVAL_MS,
    // Stop on a terminal state (and on error, via the shared loop) — a 404 or
    // permission failure will not fix itself, and retrying every 5s just repeats it.
    isDone: (d) => TERMINAL_BATCH_STATES.includes(d.state),
  });

  useRefetchOnChange(refresh, [state, page]);

  return {
    batch: data, error, isLoading, refresh,
  };
}
