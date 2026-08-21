import MockAdapter from 'axios-mock-adapter';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { createIntl } from '@edx/frontend-platform/i18n';

import {
  cancelBulkUnenrollBatch,
  confirmBulkUnenrollBatch,
  getBulkUnenrollBatchStatus,
  listBulkUnenrollBatches,
  retryBulkUnenrollBatch,
  uploadBulkUnenrollFile,
} from './api';

const intl = createIntl({ locale: 'en', messages: {} });

describe('Bulk Unenroll API', () => {
  let mockAdapter;
  const { LMS_BASE_URL } = getConfig();
  const base = `${LMS_BASE_URL}/api/support/v1/bulk_unenroll`;
  const batchId = 'a1b2c3d4-0000-0000-0000-000000000000';

  beforeEach(() => {
    mockAdapter = new MockAdapter(getAuthenticatedHttpClient(), { onNoMatch: 'throwException' });
  });

  afterEach(() => {
    mockAdapter.reset();
  });

  describe('uploadBulkUnenrollFile', () => {
    it('posts the file to the collection URL and returns the preview', async () => {
      const preview = { batch_id: batchId, courses: [], errors: [] };
      mockAdapter.onPost(`${base}/`).reply(200, preview);

      const file = new File(['course-v1:edX+A+B'], 'courses.csv', { type: 'text/csv' });
      const result = await uploadBulkUnenrollFile(file, intl);

      expect(result).toEqual(preview);
      expect(mockAdapter.history.post).toHaveLength(1);
      expect(mockAdapter.history.post[0].url).toEqual(`${base}/`);
    });

    it('does not set Content-Type, so the browser can add the multipart boundary', async () => {
      mockAdapter.onPost(`${base}/`).reply(200, {});
      const file = new File(['x'], 'courses.csv', { type: 'text/csv' });

      await uploadBulkUnenrollFile(file, intl);

      const sentHeaders = mockAdapter.history.post[0].headers;
      // A hardcoded multipart Content-Type omits the boundary and fails to parse.
      expect(sentHeaders['Content-Type']).not.toMatch(/multipart\/form-data;\s*boundary/);
      expect(sentHeaders['Content-Type']).not.toEqual('multipart/form-data');
    });

    it('reports a 413 as a file-size problem', async () => {
      mockAdapter.onPost(`${base}/`).reply(413);
      const file = new File(['x'], 'courses.csv', { type: 'text/csv' });

      const result = await uploadBulkUnenrollFile(file, intl);

      expect(result.isApiError).toBe(true);
      expect(result.error[0].text).toMatch(/too large/i);
    });

    it('reports a row-count rejection distinctly from other 400s', async () => {
      mockAdapter.onPost(`${base}/`).reply(400, { file: ['Too many rows: 2500 exceeds 2000.'] });
      const file = new File(['x'], 'courses.csv', { type: 'text/csv' });

      const result = await uploadBulkUnenrollFile(file, intl);

      expect(result.error[0].text).toMatch(/too many rows/i);
    });

    it('does not mistake a per-row validation error for the row cap', async () => {
      // "row" alone is not the cap signal: this names the offending row, and
      // relabelling it would hide the only detail that locates the problem.
      mockAdapter.onPost(`${base}/`).reply(400, { file: ['Invalid course id on row 3.'] });
      const file = new File(['x'], 'courses.csv', { type: 'text/csv' });

      const result = await uploadBulkUnenrollFile(file, intl);

      expect(result.error[0].text).toEqual('Invalid course id on row 3.');
    });

    it('reports a 403 as a permission problem', async () => {
      mockAdapter.onPost(`${base}/`).reply(403);
      const file = new File(['x'], 'courses.csv', { type: 'text/csv' });

      const result = await uploadBulkUnenrollFile(file, intl);

      expect(result.error[0].text).toMatch(/permission/i);
    });
  });

  describe('confirmBulkUnenrollBatch', () => {
    it('posts the reason to the confirm URL', async () => {
      mockAdapter.onPost(`${base}/${batchId}/confirm/`).reply(202, { batch_id: batchId, state: 'pending' });

      const result = await confirmBulkUnenrollBatch(batchId, 'partner offboarding', intl);

      expect(result.state).toEqual('pending');
      expect(mockAdapter.history.post).toHaveLength(1);
      expect(JSON.parse(mockAdapter.history.post[0].data)).toEqual({ reason: 'partner offboarding' });
    });

    it('surfaces a blank-reason rejection from the server', async () => {
      mockAdapter.onPost(`${base}/${batchId}/confirm/`).reply(400, {
        reason: 'A non-blank reason is required to confirm.',
      });

      const result = await confirmBulkUnenrollBatch(batchId, '', intl);

      expect(result.error[0].text).toEqual('A non-blank reason is required to confirm.');
    });
  });

  describe('getBulkUnenrollBatchStatus', () => {
    it('asks for the page size the table renders', async () => {
      // The server defaults to 10; without this the page count is wrong and paging dies.
      mockAdapter.onGet(/.*/).reply(200, { batch_id: batchId });

      await getBulkUnenrollBatchStatus(batchId, {}, intl);

      expect(mockAdapter.history.get[0].url).toEqual(`${base}/${batchId}/?page_size=10`);
    });

    it('passes the state filter through as a query param', async () => {
      mockAdapter.onGet(/.*/).reply(200, { batch_id: batchId });

      await getBulkUnenrollBatchStatus(batchId, { state: 'failed' }, intl);

      expect(mockAdapter.history.get[0].url).toEqual(`${base}/${batchId}/?state=failed&page_size=10`);
    });

    it('reports an unknown batch as not found', async () => {
      mockAdapter.onGet(/.*/).reply(404);

      const result = await getBulkUnenrollBatchStatus(batchId, {}, intl);

      expect(result.error[0].text).toMatch(/no batch found/i);
    });
  });

  describe('listBulkUnenrollBatches', () => {
    it('gets the collection URL and returns the paginated payload', async () => {
      const payload = { count: 1, results: [{ batch_id: batchId, state: 'running' }] };
      mockAdapter.onGet(/.*/).reply(200, payload);

      const result = await listBulkUnenrollBatches({}, intl);

      expect(result).toEqual(payload);
      expect(mockAdapter.history.get[0].url).toEqual(`${base}/?page_size=10`);
    });

    it('sends several states as one comma-separated filter', async () => {
      mockAdapter.onGet(/.*/).reply(200, { count: 0, results: [] });

      await listBulkUnenrollBatches({ state: 'pending,running' }, intl);

      expect(mockAdapter.history.get[0].url).toEqual(`${base}/?state=pending%2Crunning&page_size=10`);
    });

    it('reports a failure as an api error rather than throwing', async () => {
      mockAdapter.onGet(/.*/).reply(500);

      const result = await listBulkUnenrollBatches({}, intl);

      expect(result.isApiError).toBe(true);
      expect(result.error[0].text).toMatch(/list of batches/i);
    });
  });

  describe('cancel and retry', () => {
    it('posts to the cancel URL', async () => {
      mockAdapter.onPost(`${base}/${batchId}/cancel/`).reply(200, { state: 'cancelled' });

      const result = await cancelBulkUnenrollBatch(batchId, intl);

      expect(result.state).toEqual('cancelled');
      expect(mockAdapter.history.post[0].url).toEqual(`${base}/${batchId}/cancel/`);
    });

    it('posts to the retry URL', async () => {
      mockAdapter.onPost(`${base}/${batchId}/retry/`).reply(202, { state: 'pending' });

      const result = await retryBulkUnenrollBatch(batchId, intl);

      expect(result.state).toEqual('pending');
      expect(mockAdapter.history.post[0].url).toEqual(`${base}/${batchId}/retry/`);
    });
  });
});
