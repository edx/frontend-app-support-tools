import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import CourseBulkUnenrollBatchesPage from './CourseBulkUnenrollBatchesPage';
import CourseBulkUnenrollIndexPage from './CourseBulkUnenrollIndexPage';
import UserMessagesProvider from '../userMessages/UserMessagesProvider';
import * as api from './data/api';

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
const OTHER_BATCH_ID = 'b2c3d4e5-0000-0000-0000-000000000000';

// Both routes mounted so tests follow the real navigation: the list lives on the
// history page, and opening a batch hands off to the upload page's progress view.
const renderAt = (path) => render(
  <IntlProvider locale="en" messages={{}}>
    <MemoryRouter initialEntries={[path]}>
      <UserMessagesProvider>
        <Routes>
          <Route path="/course_bulk_unenroll" element={<CourseBulkUnenrollIndexPage />} />
          <Route path="/course_bulk_unenroll/batches" element={<CourseBulkUnenrollBatchesPage />} />
        </Routes>
      </UserMessagesProvider>
    </MemoryRouter>
  </IntlProvider>,
);

const renderPage = () => renderAt('/course_bulk_unenroll/batches');

const batchRow = (overrides = {}) => ({
  batch_id: BATCH_ID,
  state: 'running',
  reason: 'partner offboarding',
  requester: 'ops-admin',
  csv_filename: 'q3.csv',
  total_courses: 12,
  created: '2026-07-28T10:00:00Z',
  modified: '2026-07-28T12:30:00Z',
  ...overrides,
});

const statusResponse = () => ({
  batch_id: BATCH_ID,
  state: 'running',
  reason: 'partner offboarding',
  requester: 'ops-admin',
  csv_filename: 'q3.csv',
  total_courses: 12,
  created: '2026-07-28T10:00:00Z',
  modified: '2026-07-28T12:30:00Z',
  totals: {
    active: 100, unenrolled: 10, already_inactive: 0, failed: 0, courses_finished: 1,
  },
  courses: { count: 0, results: [] },
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CourseBulkUnenrollIndexPage — batch list', () => {
  it('lists batches, whoever started them', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({
      count: 2,
      results: [
        batchRow(),
        batchRow({
          batch_id: OTHER_BATCH_ID,
          state: 'pending',
          reason: 'test run',
          requester: 'other-admin',
          csv_filename: 'test.csv',
        }),
      ],
    });

    renderPage();

    await screen.findByTestId('bulk-unenroll-batch-list');
    expect(screen.getByText('partner offboarding')).toBeInTheDocument();
    expect(screen.getByText('test run')).toBeInTheDocument();
    expect(screen.getByText('q3.csv')).toBeInTheDocument();
    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText('ops-admin')).toBeInTheDocument();
    expect(screen.getByText('other-admin')).toBeInTheDocument();
  });

  it('asks for every batch rather than filtering by state', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 0, results: [] });

    renderPage();

    await waitFor(() => expect(api.listBulkUnenrollBatches)
      .toHaveBeenCalledWith({ state: undefined, page: 1 }, expect.anything()));
  });

  it('shows finished and cancelled batches alongside running ones', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({
      count: 4,
      results: [
        batchRow({ state: 'running' }),
        batchRow({ batch_id: OTHER_BATCH_ID, state: 'succeeded', reason: 'done last week' }),
        batchRow({ batch_id: 'c3d4e5f6-0000-0000-0000-000000000000', state: 'cancelled', reason: 'stopped early' }),
        batchRow({ batch_id: 'd4e5f6a7-0000-0000-0000-000000000000', state: 'partial', reason: 'some failures' }),
      ],
    });

    renderPage();

    await screen.findByTestId('bulk-unenroll-batch-list');
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    // "Succeeded" is also a filter choice, so it appears more than once.
    expect(screen.getAllByText('Succeeded').length).toBeGreaterThan(0);
  });

  it('narrows the list to the batches a filter choice names', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 1, results: [batchRow()] });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');

    await userEvent.click(screen.getByTestId('bulk-unenroll-batch-filter'));
    await userEvent.click(screen.getByTestId('bulk-unenroll-batch-filter-item-cancelled'));

    await waitFor(() => expect(api.listBulkUnenrollBatches)
      .toHaveBeenCalledWith({ state: 'cancelled', page: 1 }, expect.anything()));
  });

  it('offers every batch status the table can display', async () => {
    // Anything visible in the Status column must be selectable: an earlier grouped
    // menu left validated and cancelled — most real rows — unselectable.
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 1, results: [batchRow()] });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');
    await userEvent.click(screen.getByTestId('bulk-unenroll-batch-filter'));

    ['validated', 'pending', 'running', 'succeeded', 'partial', 'failed', 'cancelled'].forEach(
      (state) => expect(screen.getByTestId(`bulk-unenroll-batch-filter-item-${state}`)).toBeInTheDocument(),
    );
  });

  it('stays visible with an empty-state message when a filter excludes everything', async () => {
    // Distinct from "no batch has ever run": the empty result is an answer, and
    // hiding the panel would take the filter control with it.
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 1, results: [batchRow()] });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');

    api.listBulkUnenrollBatches.mockResolvedValue({ count: 0, results: [] });
    await userEvent.click(screen.getByTestId('bulk-unenroll-batch-filter'));
    await userEvent.click(screen.getByTestId('bulk-unenroll-batch-filter-item-succeeded'));

    expect(await screen.findByTestId('bulk-unenroll-batch-list-empty')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-unenroll-batch-list')).toBeInTheDocument();
  });

  it('opens a finished batch from the list', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({
      count: 1, results: [batchRow({ state: 'succeeded' })],
    });
    api.getBulkUnenrollBatchStatus.mockResolvedValue({ ...statusResponse(), state: 'succeeded' });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');

    await userEvent.click(screen.getByTestId(`bulk-unenroll-open-${BATCH_ID}`));

    expect(await screen.findByTestId('bulk-unenroll-progress')).toBeInTheDocument();
    expect(api.getBulkUnenrollBatchStatus)
      .toHaveBeenCalledWith(BATCH_ID, { state: undefined, page: 1 }, expect.anything());
  });

  it('says so when no batch has ever been run', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 0, results: [] });

    renderPage();

    expect(await screen.findByTestId('bulk-unenroll-batch-list-empty')).toBeInTheDocument();
    expect(screen.getByText(/no batches have been run yet/i)).toBeInTheDocument();
  });

  it('offers a way back to the upload page', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 1, results: [batchRow()] });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');

    await userEvent.click(screen.getByTestId('bulk-unenroll-back-to-upload'));

    expect(await screen.findByTestId('bulk-unenroll-file-input')).toBeInTheDocument();
  });

  it('reports the server-side total, and pages against it', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 140, results: [batchRow()] });

    renderPage();
    await screen.findByTestId('bulk-unenroll-batch-list');

    expect(screen.getByTestId('bulk-unenroll-table-count')).toHaveTextContent('140');

    await userEvent.click(screen.getByLabelText(/next/i));

    await waitFor(() => expect(api.listBulkUnenrollBatches)
      .toHaveBeenCalledWith({ state: undefined, page: 2 }, expect.anything()));
  });

  it('reports a load failure instead of spinning forever', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({
      isApiError: true,
      error: [{
        code: null, dismissible: true, text: 'The list of batches could not be loaded.', type: 'danger', topic: 'courseBulkUnenrollApiErrors',
      }],
    });

    renderPage();

    expect(await screen.findByTestId('bulk-unenroll-batch-list-error')).toBeInTheDocument();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it('is reachable from the upload page, which does not fetch the list itself', async () => {
    api.listBulkUnenrollBatches.mockResolvedValue({ count: 1, results: [batchRow()] });

    renderAt('/course_bulk_unenroll');
    await screen.findByTestId('bulk-unenroll-file-input');
    expect(api.listBulkUnenrollBatches).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('bulk-unenroll-view-history'));

    expect(await screen.findByTestId('bulk-unenroll-batch-list')).toBeInTheDocument();
  });
});
