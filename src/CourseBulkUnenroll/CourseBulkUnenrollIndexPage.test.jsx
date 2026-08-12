import '@testing-library/jest-dom';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

const renderPage = (initialEntry = '/course_bulk_unenroll') => render(
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

const csvFile = () => new File(['course-v1:edX+A+B'], 'courses.csv', { type: 'text/csv' });

const previewResponse = {
  batch_id: BATCH_ID,
  state: 'validated',
  total_courses: 2,
  totals: { active: 4200 },
  courses: [
    {
      course_id: 'course-v1:edX+A+B', active_count: 4000, state: 'pending', error: '',
    },
    {
      course_id: 'course-v1:edX+C+D', active_count: 200, state: 'pending', error: '',
    },
  ],
  errors: [],
};

const statusResponse = (overrides = {}) => ({
  batch_id: BATCH_ID,
  state: 'running',
  reason: 'cleanup',
  requester: 'ops-admin',
  csv_filename: 'courses.csv',
  created: '2026-07-28T10:00:00Z',
  modified: '2026-07-28T12:30:00Z',
  total_courses: 2,
  totals: {
    active: 4200, unenrolled: 1000, already_inactive: 5, failed: 2, courses_finished: 1,
  },
  courses: {
    count: 2,
    results: [
      {
        course_id: 'course-v1:edX+A+B', state: 'succeeded', active_count: 4000, unenrolled: 1000, failed_count: 0, error: '',
      },
      {
        course_id: 'course-v1:edX+C+D', state: 'failed', active_count: 200, unenrolled: 0, failed_count: 2, error: 'boom',
      },
    ],
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  // The landing page always asks what is in flight; default to nothing so these
  // tests exercise upload/preview/progress rather than the list.
  api.listBulkUnenrollBatches.mockResolvedValue({ count: 0, results: [] });
});

// Unconditional: a failing fake-timer test would otherwise freeze timers for every
// test after it, and userEvent waits on a real setTimeout and would hang, not fail.
afterEach(() => {
  jest.useRealTimers();
});

describe('CourseBulkUnenrollIndexPage — upload and preview', () => {
  it('uploads the chosen file and shows the preview', async () => {
    api.uploadBulkUnenrollFile.mockResolvedValue(previewResponse);
    renderPage();

    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    await waitFor(() => expect(screen.getByTestId('bulk-unenroll-preview')).toBeInTheDocument());
    expect(api.uploadBulkUnenrollFile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('bulk-unenroll-preview-summary')).toHaveTextContent('4,200');
    expect(screen.getByText('course-v1:edX+A+B')).toBeInTheDocument();
  });

  it('re-enables the form when the upload throws instead of returning an error', async () => {
    // The API layer returns request failures rather than rejecting, so this is an
    // unexpected fault — but without clearing the busy flag the button stays
    // spinning and the only way on is a reload.
    api.uploadBulkUnenrollFile.mockRejectedValue(new Error('boom'));
    renderPage();

    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    expect(await screen.findByTestId('bulk-unenroll-file-error')).toBeInTheDocument();
    const button = screen.getByTestId('bulk-unenroll-upload-button');
    expect(button).not.toBeDisabled();

    api.uploadBulkUnenrollFile.mockResolvedValue(previewResponse);
    await userEvent.click(button);
    await waitFor(() => expect(screen.getByTestId('bulk-unenroll-preview')).toBeInTheDocument());
  });

  it('refuses to upload when no file was chosen', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    expect(await screen.findByTestId('bulk-unenroll-file-error')).toBeInTheDocument();
    expect(api.uploadBulkUnenrollFile).not.toHaveBeenCalled();
  });

  it('marks the file input invalid and points it at the reason', async () => {
    // Mostly Paragon's FormGroup wiring, asserted end to end anyway: rendering the
    // message is not the same as a screen reader being told the field is invalid.
    renderPage();
    const input = screen.getByTestId('bulk-unenroll-file-input');
    expect(input).not.toHaveAttribute('aria-invalid');
    // react-bootstrap styles type="file" as .form-control-file, not .form-control.
    expect(input).toHaveClass('form-control-file');
    // Form.Text does NOT self-register as a descriptor, so this is wired by hand;
    // drop it and the limits stop being announced with nothing else to notice.
    expect(input.getAttribute('aria-describedby')).toContain('bulk-unenroll-file-help');

    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    const error = await screen.findByTestId('bulk-unenroll-file-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // The id must survive Paragon's Feedback props or aria-describedby points nowhere.
    expect(error.id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(input.getAttribute('aria-describedby')).toContain('bulk-unenroll-file-help');

    await userEvent.upload(input, csvFile());
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('lists rejected rows with their CSV line numbers', async () => {
    api.uploadBulkUnenrollFile.mockResolvedValue({
      ...previewResponse,
      errors: [
        { row: 3, value: 'not-a-course', error: 'Not a valid course id' },
        { row: 7, value: 'a,b', error: 'Expected exactly one column' },
      ],
    });
    renderPage();

    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    const rejected = await screen.findByTestId('bulk-unenroll-rejected-rows');
    expect(within(rejected).getByText(/Row 3/)).toBeInTheDocument();
    expect(within(rejected).getByText(/Not a valid course id/)).toBeInTheDocument();
    expect(within(rejected).getByText(/Row 7/)).toBeInTheDocument();
  });

  it('shows an alert when the upload is rejected', async () => {
    api.uploadBulkUnenrollFile.mockResolvedValue({
      isApiError: true,
      error: [{
        code: null, dismissible: true, text: 'That file is too large.', type: 'danger', topic: 'courseBulkUnenrollApiErrors',
      }],
    });
    renderPage();

    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));

    expect(await screen.findByText('That file is too large.')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-unenroll-preview')).not.toBeInTheDocument();
  });
});

describe('CourseBulkUnenrollIndexPage — preview table controls', () => {
  const showPreview = async (response = previewResponse) => {
    api.uploadBulkUnenrollFile.mockResolvedValue(response);
    renderPage();
    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));
    await screen.findByTestId('bulk-unenroll-preview');
  };

  it('narrows the rows to a searched course id, and reports the filtered count', async () => {
    // Client-side: the whole array arrives in the upload response, which is why this
    // table can search where the paginated ones cannot.
    await showPreview();
    expect(screen.getByTestId('bulk-unenroll-table-count')).toHaveTextContent('2');

    await userEvent.type(screen.getByTestId('bulk-unenroll-preview-search'), 'C+D');

    await waitFor(() => expect(screen.queryByText('course-v1:edX+A+B')).not.toBeInTheDocument());
    expect(screen.getByText('course-v1:edX+C+D')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-unenroll-table-count')).toHaveTextContent('1');
  });

  it('isolates course ids the server could not find', async () => {
    // The trap: an all-unknown CSV previews as "0 learners across N courses", which
    // reads as "nothing to do" rather than "none of these exist".
    await showPreview({
      ...previewResponse,
      totals: { active: 0 },
      courses: [
        {
          course_id: 'course-v1:edX+A+B', active_count: 0, state: 'pending', error: 'Course not found',
        },
        {
          course_id: 'course-v1:edX+C+D', active_count: 200, state: 'pending', error: '',
        },
      ],
    });

    await userEvent.click(screen.getByTestId('bulk-unenroll-preview-filter'));
    await userEvent.click(screen.getByTestId('bulk-unenroll-preview-filter-item-not_found'));

    await waitFor(() => expect(screen.queryByText('course-v1:edX+C+D')).not.toBeInTheDocument());
    expect(screen.getByText('course-v1:edX+A+B')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-unenroll-table-count')).toHaveTextContent('1');
  });

  it('keeps the rows in the order the CSV listed them', async () => {
    // Not sortable: the file gets fixed in the order it was written, so reordering
    // costs the operator the line they are looking for.
    await showPreview();

    const ids = screen.getAllByText(/^course-v1:edX/).map((node) => node.textContent);
    expect(ids).toEqual(['course-v1:edX+A+B', 'course-v1:edX+C+D']);
    expect(screen.queryByTestId('sort-icon-active_count')).not.toBeInTheDocument();
  });
});

describe('CourseBulkUnenrollIndexPage — reason and confirm', () => {
  const getToPreview = async () => {
    api.uploadBulkUnenrollFile.mockResolvedValue(previewResponse);
    renderPage();
    await userEvent.upload(screen.getByTestId('bulk-unenroll-file-input'), csvFile());
    await userEvent.click(screen.getByTestId('bulk-unenroll-upload-button'));
    await screen.findByTestId('bulk-unenroll-preview');
  };

  it('enables confirm only for a non-blank reason', async () => {
    await getToPreview();
    const confirm = screen.getByTestId('bulk-unenroll-open-confirm');
    const reason = screen.getByTestId('bulk-unenroll-reason-input');

    expect(confirm).toBeDisabled();

    await userEvent.type(reason, '   ');
    expect(confirm).toBeDisabled();

    await userEvent.type(reason, 'partner offboarding');
    expect(confirm).not.toBeDisabled();
  });

  it('confirms with the trimmed reason, then hands off to the progress view', async () => {
    api.confirmBulkUnenrollBatch.mockResolvedValue({ batch_id: BATCH_ID, state: 'pending' });
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());
    await getToPreview();

    await userEvent.type(screen.getByTestId('bulk-unenroll-reason-input'), '  cleanup  ');
    await userEvent.click(screen.getByTestId('bulk-unenroll-open-confirm'));

    const modal = await screen.findByTestId('bulk-unenroll-confirm-modal');
    expect(within(modal).getByTestId('bulk-unenroll-confirm-count')).toHaveTextContent('4,200');

    await userEvent.click(screen.getByTestId('bulk-unenroll-confirm-submit'));

    await waitFor(() => expect(api.confirmBulkUnenrollBatch).toHaveBeenCalledWith(BATCH_ID, 'cleanup', expect.anything()));
    // Rests on `complete` for a beat so the operator sees an irreversible action
    // land rather than the screen swapping under them.
    expect(await screen.findByText('Started')).toBeInTheDocument();
    expect(await screen.findByTestId('bulk-unenroll-progress', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('keeps the operator on the preview when confirm fails', async () => {
    api.confirmBulkUnenrollBatch.mockResolvedValue({
      isApiError: true,
      error: [{
        code: null, dismissible: true, text: 'The batch could not be confirmed.', type: 'danger', topic: 'courseBulkUnenrollApiErrors',
      }],
    });
    await getToPreview();

    await userEvent.type(screen.getByTestId('bulk-unenroll-reason-input'), 'cleanup');
    await userEvent.click(screen.getByTestId('bulk-unenroll-open-confirm'));
    await screen.findByTestId('bulk-unenroll-confirm-modal');
    await userEvent.click(screen.getByTestId('bulk-unenroll-confirm-submit'));

    expect(await screen.findByText('The batch could not be confirmed.')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-unenroll-preview')).toBeInTheDocument();
  });

  it('does not confirm when the modal is dismissed', async () => {
    await getToPreview();

    await userEvent.type(screen.getByTestId('bulk-unenroll-reason-input'), 'cleanup');
    await userEvent.click(screen.getByTestId('bulk-unenroll-open-confirm'));
    await screen.findByTestId('bulk-unenroll-confirm-modal');
    await userEvent.click(screen.getByTestId('bulk-unenroll-confirm-cancel'));

    expect(api.confirmBulkUnenrollBatch).not.toHaveBeenCalled();
  });
});

describe('CourseBulkUnenrollIndexPage — progress view', () => {
  it('opens straight into progress when the URL carries a batch id', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    expect(await screen.findByTestId('bulk-unenroll-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-unenroll-file-input')).not.toBeInTheDocument();
    expect(api.getBulkUnenrollBatchStatus)
      .toHaveBeenCalledWith(BATCH_ID, { state: undefined, page: 1 }, expect.anything());
  });

  it('measures the progress bar in learners, not courses', async () => {
    // Courses-finished would read 1/2 = 50%; learners read (1000 + 5 + 2) / 4200 =
    // 24%. Course granularity pins a single-course batch at 0% for its whole run,
    // which is exactly when one course can hold millions of learners.
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    expect(screen.getByText('24%')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('keeps the bar at 100% ceiling when late enrolments exceed the preview count', async () => {
    // `active` is counted at upload, so late enrolments can push processed past it.
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({
      state: 'succeeded',
      totals: {
        active: 100, unenrolled: 130, already_inactive: 0, failed: 0, courses_finished: 2,
      },
    }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows batch-level totals rather than a sum of the visible page', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    expect(await screen.findByTestId('bulk-unenroll-progress-learners')).toHaveTextContent('1,000');
    expect(screen.getByTestId('bulk-unenroll-progress-courses')).toHaveTextContent('1 of 2');
    expect(screen.getByTestId('bulk-unenroll-progress-failures')).toHaveTextContent('2');
    expect(screen.getByTestId('bulk-unenroll-progress-inactive')).toHaveTextContent('5');
  });

  it('shows the reason the batch was run', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({ reason: 'partner offboarding' }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    const details = await screen.findByTestId('bulk-unenroll-batch-details');
    expect(within(details).getByText('partner offboarding')).toBeInTheDocument();
    expect(within(details).getByText('ops-admin')).toBeInTheDocument();
    expect(within(details).getByText('courses.csv')).toBeInTheDocument();
    expect(within(details).getByText(BATCH_ID)).toBeInTheDocument();
  });

  it('says so when a batch carries no reason', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({ reason: '' }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    const details = await screen.findByTestId('bulk-unenroll-batch-details');
    expect(within(details).getByText('Not recorded')).toBeInTheDocument();
  });

  it.each([
    ['succeeded', 'Finished', 'Last updated'],
    ['running', 'Last updated', 'Finished'],
  ])('labels the last timestamp for a %s batch', async (state, shown, hidden) => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({ state }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    const details = await screen.findByTestId('bulk-unenroll-batch-details');
    expect(within(details).getByText(shown)).toBeInTheDocument();
    expect(within(details).queryByText(hidden)).not.toBeInTheDocument();
  });

  it('offers cancel while running and calls it', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());
    api.cancelBulkUnenrollBatch.mockResolvedValue({ state: 'cancelled' });

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    await userEvent.click(screen.getByTestId('bulk-unenroll-cancel-button'));

    await waitFor(() => expect(api.cancelBulkUnenrollBatch).toHaveBeenCalledWith(BATCH_ID, expect.anything()));
  });

  it('shows cancelled courses as cancelled and finished ones as they ended', async () => {
    // Unfinished courses used to read "running" forever, so a stopped batch looked
    // like it was still working.
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({
      state: 'cancelled',
      totals: {
        active: 4200, unenrolled: 1000, already_inactive: 0, failed: 0, courses_finished: 2,
      },
      courses: {
        count: 2,
        results: [
          {
            course_id: 'course-v1:edX+A+B', state: 'succeeded', active_count: 4000, unenrolled: 1000, failed_count: 0, error: '',
          },
          {
            course_id: 'course-v1:edX+C+D', state: 'cancelled', active_count: 200, unenrolled: 0, failed_count: 0, error: '',
          },
        ],
      },
    }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    // Both the batch badge and the stopped course row read "Cancelled".
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
    // A cancelled course will not be worked on again, so progress reads complete.
    expect(screen.getByTestId('bulk-unenroll-progress-courses')).toHaveTextContent('2');
  });

  it('offers retry only for a finished-but-imperfect batch', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({ state: 'partial' }));
    api.retryBulkUnenrollBatch.mockResolvedValue({ state: 'pending' });

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    expect(screen.queryByTestId('bulk-unenroll-cancel-button')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('bulk-unenroll-retry-button'));

    await waitFor(() => expect(api.retryBulkUnenrollBatch).toHaveBeenCalledWith(BATCH_ID, expect.anything()));
  });

  it('offers every course status the table can display', async () => {
    // Includes `cancelled`, which the cancel sweep writes — left out of this menu at
    // first, so the courses a cancelled batch stopped could not be filtered to.
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');
    await userEvent.click(screen.getByTestId('bulk-unenroll-course-filter'));

    ['pending', 'running', 'succeeded', 'failed', 'skipped', 'cancelled'].forEach(
      (state) => expect(screen.getByTestId(`bulk-unenroll-course-filter-item-${state}`)).toBeInTheDocument(),
    );
  });

  it('pages courses on the server, and resets to page 1 when the filter changes', async () => {
    // Server-paginated: without fetchData wired through the footer buttons would move
    // a local index. Narrowing then strands the viewer past the end of the new set.
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse({
      courses: { count: 140, results: [{ course_id: 'course-v1:X+A+1', state: 'succeeded' }] },
    }));

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);
    await screen.findByTestId('bulk-unenroll-progress');

    await userEvent.click(screen.getByLabelText(/next/i));
    await waitFor(() => expect(api.getBulkUnenrollBatchStatus)
      .toHaveBeenCalledWith(BATCH_ID, { state: undefined, page: 2 }, expect.anything()));

    await userEvent.click(screen.getByTestId('bulk-unenroll-course-filter'));
    await userEvent.click(screen.getByTestId('bulk-unenroll-course-filter-item-failed'));

    await waitFor(() => expect(api.getBulkUnenrollBatchStatus)
      .toHaveBeenCalledWith(BATCH_ID, { state: 'failed', page: 1 }, expect.anything()));
  });
});

describe('CourseBulkUnenrollIndexPage — batch lookup', () => {
  it('opens a batch entered by id', async () => {
    api.getBulkUnenrollBatchStatus.mockResolvedValue(statusResponse());
    renderPage();

    await userEvent.type(screen.getByTestId('bulk-unenroll-lookup-input'), BATCH_ID);
    await userEvent.click(screen.getByTestId('bulk-unenroll-lookup-button'));

    expect(await screen.findByTestId('bulk-unenroll-progress')).toBeInTheDocument();
  });

  it('shows a loading indicator instead of a blank page while the batch loads', async () => {
    let resolveStatus;
    api.getBulkUnenrollBatchStatus.mockReturnValue(
      new Promise((resolve) => { resolveStatus = resolve; }),
    );

    renderPage(`/course_bulk_unenroll?batch_id=${BATCH_ID}`);

    expect(await screen.findByTestId('bulk-unenroll-loading')).toBeInTheDocument();

    await act(async () => { resolveStatus(statusResponse()); });

    expect(await screen.findByTestId('bulk-unenroll-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-unenroll-loading')).not.toBeInTheDocument();
  });

  it('ignores a blank lookup', async () => {
    renderPage();

    await userEvent.click(screen.getByTestId('bulk-unenroll-lookup-button'));

    expect(api.getBulkUnenrollBatchStatus).not.toHaveBeenCalled();
    expect(screen.queryByTestId('bulk-unenroll-progress')).not.toBeInTheDocument();
  });
});
