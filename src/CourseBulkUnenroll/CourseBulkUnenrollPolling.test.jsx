/**
 * Polling tests, kept in their own file: they are the only ones using fake timers,
 * and alongside the rest they left React's scheduler in a state where a later
 * test's effect never fired. Jest isolates per file, so this is the reliable
 * boundary — per-test cleanup was not.
 */
import '@testing-library/jest-dom';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import CourseBulkUnenrollIndexPage from './CourseBulkUnenrollIndexPage';
import UserMessagesProvider from '../userMessages/UserMessagesProvider';
import * as api from './data/api';
import { POLL_INTERVAL_MS } from './constants';

jest.mock('./data/api', () => ({
  ...jest.requireActual('./data/api'),
  uploadBulkUnenrollFile: jest.fn(),
  confirmBulkUnenrollBatch: jest.fn(),
  getBulkUnenrollBatchStatus: jest.fn(),
  cancelBulkUnenrollBatch: jest.fn(),
  retryBulkUnenrollBatch: jest.fn(),
  listBulkUnenrollBatches: jest.fn(),
}));

const BATCH_ID = 'a1b2c3d4-0000-0000-0000-000000000000';

const renderPage = (initialEntry) => render(
  <IntlProvider locale="en" messages={{}}>
    <MemoryRouter initialEntries={[initialEntry]}>
      <UserMessagesProvider>
        <Routes>
          <Route path="/course_bulk_unenroll" element={<CourseBulkUnenrollIndexPage />} />
        </Routes>
      </UserMessagesProvider>
    </MemoryRouter>
  </IntlProvider>,
);

const statusResponse = (overrides = {}) => ({
  batch_id: BATCH_ID,
  state: 'running',
  reason: 'cleanup',
  total_courses: 2,
  totals: {
    active: 4200, unenrolled: 1000, already_inactive: 5, failed: 2, courses_finished: 1,
  },
  courses: {
    count: 1,
    results: [
      {
        course_id: 'course-v1:edX+A+B', state: 'succeeded', active_count: 4000, unenrolled: 1000, failed_count: 0, error: '',
      },
    ],
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  api.listBulkUnenrollBatches.mockResolvedValue({ count: 0, results: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CourseBulkUnenrollIndexPage — polling', () => {
  it('keeps polling while the batch is running', async () => {
    jest.useFakeTimers();
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());

    const { unmount } = renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    await waitFor(() => expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    await waitFor(() => expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(2));

    // Still 'running', so the loop is live; tear it down while timers are fake.
    unmount();
  });

  it('stops polling once the batch reaches a terminal state', async () => {
    jest.useFakeTimers();
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({ state: 'succeeded' }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    await waitFor(() => expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 4);
    });

    // Still one call: a finished batch never changes, and an overnight tab must
    // not keep hitting the API.
    expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling when the batch cannot be loaded', async () => {
    jest.useFakeTimers();
    api.getBulkUnenrollBatchStatus.mockResolvedValue({
      isApiError: true,
      error: [{
        code: null, dismissible: true, text: 'No batch found with that ID.', type: 'danger', topic: 'courseBulkUnenrollApiErrors',
      }],
    });

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    await waitFor(() => expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });

    // A 404 or permission failure will not fix itself; retrying just repeats it.
    expect(api.getBulkUnenrollBatchStatus).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
    expect(await screen.findByText('No batch found with that ID.')).toBeInTheDocument();
  });
});
