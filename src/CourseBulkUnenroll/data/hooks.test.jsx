/**
 * Out-of-order response handling for the two polling hooks.
 *
 * These hooks fire overlapping requests by design — a poll tick, a filter change
 * and a page change can all be in flight at once — and replies need not arrive in
 * order. Every test resolves its deferred promises *in reverse*, the case ordinary
 * mocking never produces since `mockResolvedValue` settles in call order. Driven
 * through a probe component because @testing-library/react v12 has no `renderHook`.
 */
import '@testing-library/jest-dom';
import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import PropTypes from 'prop-types';

import usePolledBatchStatus, { usePolledBatchList } from './hooks';
import * as api from './api';

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  getBulkUnenrollBatchStatus: jest.fn(),
  listBulkUnenrollBatches: jest.fn(),
}));

const BATCH_A = 'aaaaaaaa-0000-0000-0000-000000000000';
const BATCH_B = 'bbbbbbbb-0000-0000-0000-000000000000';

/** A promise whose settlement this test controls. */
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

const batchResponse = (batchId) => ({
  batch_id: batchId,
  state: 'running',
  reason: 'cleanup',
  total_courses: 1,
  totals: {
    active: 1, unenrolled: 0, already_inactive: 0, failed: 0, courses_finished: 0,
  },
  courses: { count: 0, results: [] },
});

function StatusProbe({ batchId }) {
  const { batch, error } = usePolledBatchStatus(batchId);
  return (
    <>
      <span data-testid="batch">{batch ? batch.batch_id : 'none'}</span>
      <span data-testid="error">{error ? 'error' : 'none'}</span>
    </>
  );
}

function ListProbe({ page }) {
  const { batches } = usePolledBatchList(undefined, page);
  return (
    <span data-testid="batches">
      {batches ? batches.map((b) => b.batch_id).join(',') : 'none'}
    </span>
  );
}

StatusProbe.propTypes = { batchId: PropTypes.string };
StatusProbe.defaultProps = { batchId: undefined };
ListProbe.propTypes = { page: PropTypes.number.isRequired };

// One stable object: a fresh literal gives IntlProvider a new context value,
// `useIntl()` a new identity, and the poll effect a reason to refetch.
const MESSAGES = {};
const wrap = (ui) => <IntlProvider locale="en" messages={MESSAGES}>{ui}</IntlProvider>;

const renderProbe = (ui) => render(wrap(ui));

const shownBatch = () => screen.getByTestId('batch').textContent;

beforeEach(() => jest.clearAllMocks());

describe('usePolledBatchStatus — stale responses', () => {
  it('ignores a reply for the batch the operator has navigated away from', async () => {
    const first = deferred();
    const second = deferred();
    api.getBulkUnenrollBatchStatus
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = renderProbe(<StatusProbe batchId={BATCH_A} />);
    rerender(wrap(<StatusProbe batchId={BATCH_B} />));

    // B answers first, then A — the reverse of send order, i.e. a slow first request.
    await act(async () => { second.resolve(batchResponse(BATCH_B)); });
    expect(shownBatch()).toBe(BATCH_B);

    await act(async () => { first.resolve(batchResponse(BATCH_A)); });
    expect(shownBatch()).toBe(BATCH_B); // the late reply must not win
  });

  it('clears the previous batch the moment the id changes', async () => {
    const first = deferred();
    const second = deferred();
    api.getBulkUnenrollBatchStatus
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = renderProbe(<StatusProbe batchId={BATCH_A} />);
    await act(async () => { first.resolve(batchResponse(BATCH_A)); });
    expect(shownBatch()).toBe(BATCH_A);

    await act(async () => {
      rerender(wrap(<StatusProbe batchId={BATCH_B} />));
    });

    // B has not answered. A must not sit under B's id for even one frame: cancel
    // and retry act on the URL's id, not on what is displayed.
    expect(shownBatch()).toBe('none');
  });

  it('retires an in-flight request the moment the operator navigates away', async () => {
    const first = deferred();
    api.getBulkUnenrollBatchStatus.mockReturnValueOnce(first.promise);

    const { rerender } = renderProbe(<StatusProbe batchId={BATCH_A} />);

    // With no id the hook starts no request, so nothing after this bumps the
    // sequence: if leaving did not itself invalidate, A's reply would still hold the
    // ticket and put A back. This is the observable version of the A -> B window,
    // where `rerender` flushes effects inside `act` and closes the gap too fast.
    await act(async () => { rerender(wrap(<StatusProbe batchId={undefined} />)); });
    expect(shownBatch()).toBe('none');

    await act(async () => { first.resolve(batchResponse(BATCH_A)); });
    expect(shownBatch()).toBe('none');
    expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1); // no successor ran
  });
});

describe('usePolledBatchList — stale responses', () => {
  it('ignores a reply for a page the operator has already moved off', async () => {
    const pageOne = deferred();
    const pageTwo = deferred();
    api.listBulkUnenrollBatches
      .mockReturnValueOnce(pageOne.promise)
      .mockReturnValueOnce(pageTwo.promise);

    const { rerender } = renderProbe(<ListProbe page={1} />);
    await act(async () => {
      rerender(wrap(<ListProbe page={2} />));
    });

    await act(async () => { pageTwo.resolve({ count: 2, results: [{ batch_id: BATCH_B }] }); });
    expect(screen.getByTestId('batches')).toHaveTextContent(BATCH_B);

    await act(async () => { pageOne.resolve({ count: 2, results: [{ batch_id: BATCH_A }] }); });
    expect(screen.getByTestId('batches')).toHaveTextContent(BATCH_B);
  });
});

describe('replies that land after unmount', () => {
  // `cancelled` only stops the *next* tick; an open request still resolves. On
  // React 17 a write from that reply logs "state update on an unmounted
  // component", so an unexpected console.error is the failure signal.
  const expectNoWriteAfterUnmount = async (renderIt, mock, resolveWith) => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
    const inFlight = deferred();
    mock.mockReturnValueOnce(inFlight.promise);

    const { unmount } = renderIt();
    unmount(); // operator navigates away while the request is still open

    await act(async () => { inFlight.resolve(resolveWith); });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  };

  it('drops a batch status reply for a page the operator has left', async () => {
    await expectNoWriteAfterUnmount(
      () => renderProbe(<StatusProbe batchId={BATCH_A} />),
      api.getBulkUnenrollBatchStatus,
      batchResponse(BATCH_A),
    );
  });

  it('drops a batch list reply for a page the operator has left', async () => {
    await expectNoWriteAfterUnmount(
      () => renderProbe(<ListProbe page={1} />),
      api.listBulkUnenrollBatches,
      { count: 1, results: [{ batch_id: BATCH_A }] },
    );
  });
});

describe('usePolledBatchStatus — under StrictMode', () => {
  it('resets without React warnings when the batch id changes', async () => {
    // The reset adjusts own state during own render — React's documented pattern
    // for "adjusting state when a prop changes", and the only one avoiding a painted
    // frame of the previous batch. StrictMode double-invokes render, so an
    // unsupported or non-idempotent reset surfaces as a warning or a loop.
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
    const first = deferred();
    api.getBulkUnenrollBatchStatus.mockReturnValueOnce(first.promise);

    const strict = (ui) => <StrictMode>{wrap(ui)}</StrictMode>;
    const { rerender } = render(strict(<StatusProbe batchId={BATCH_A} />));
    await act(async () => { first.resolve(batchResponse(BATCH_A)); });
    expect(shownBatch()).toBe(BATCH_A);

    const second = deferred();
    api.getBulkUnenrollBatchStatus.mockReturnValueOnce(second.promise);
    await act(async () => { rerender(strict(<StatusProbe batchId={BATCH_B} />)); });

    expect(shownBatch()).toBe('none');
    expect(warn).not.toHaveBeenCalled();

    // Double-rendering bumps the ticket twice; harmless, since it is only compared
    // for equality and over-invalidating errs toward dropping a stale reply.
    await act(async () => { first.resolve(batchResponse(BATCH_A)); });
    expect(shownBatch()).toBe('none');
    warn.mockRestore();
  });
});
