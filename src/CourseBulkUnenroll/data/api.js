import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

import messages from '../messages';
import { MAX_FILE_BYTES, MAX_ROWS, TABLE_PAGE_SIZE } from '../constants';

export const ERROR_TOPIC = 'courseBulkUnenrollApiErrors';

const baseUrl = () => `${getConfig().LMS_BASE_URL}/api/support/v1/bulk_unenroll`;

/** Wrap a message in the alert shape the shared UserMessages alert list expects. */
function toAlert(intl, message, values) {
  return {
    error: [
      {
        code: null,
        dismissible: true,
        text: intl.formatMessage(message, values),
        type: 'danger',
        topic: ERROR_TOPIC,
      },
    ],
    isApiError: true,
  };
}

/**
 * Turn an axios failure into an operator-readable alert.
 *
 * The server is the authority on the size and row limits, so we translate its
 * rejections rather than pre-empting them. Any other 400 is surfaced verbatim so
 * the operator reads the server's own reason; the rest fall back to `fallback`.
 */
function toError(intl, error, fallback) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 403 || status === 401) {
    return toAlert(intl, messages.permissionError);
  }
  if (status === 404) {
    return toAlert(intl, messages.batchNotFoundError);
  }
  if (status === 413) {
    return toAlert(intl, messages.fileTooLargeError, {
      maxMegabytes: Math.round(MAX_FILE_BYTES / (1024 * 1024)),
    });
  }
  if (status === 400) {
    // DRF ValidationError bodies are {field: [msg]} or {field: msg}; flatten to one
    // string. Match the cap phrase, not merely "row" — other rejections name a row
    // ("invalid course id on row 3") and must not be relabelled as the cap.
    const detail = JSON.stringify(data ?? '');
    if (/too many rows/i.test(detail)) {
      return toAlert(intl, messages.tooManyRowsError, { maxRows: MAX_ROWS });
    }
    const fieldMessage = data && typeof data === 'object'
      ? Object.values(data).flat().filter(v => typeof v === 'string')[0]
      : null;
    if (fieldMessage) {
      return {
        error: [{
          code: null, dismissible: true, text: fieldMessage, type: 'danger', topic: ERROR_TOPIC,
        }],
        isApiError: true,
      };
    }
  }
  return toAlert(intl, fallback);
}

/** Run one request, returning its data on success and a `toError` alert on failure. */
async function request(intl, fallback, send) {
  try {
    const { data } = await send(getAuthenticatedHttpClient());
    return data;
  } catch (error) {
    return toError(intl, error, fallback);
  }
}

/**
 * `?page=&state=&page_size=` for the two paginated GETs. The server defaults to 10
 * per page; ask for the size the table renders, or its page count comes out wrong
 * and silently disables its own paging controls.
 */
function pagedQuery(options) {
  const { page, state } = options || {};
  const params = new URLSearchParams();
  if (page) { params.append('page', page); }
  if (state) { params.append('state', state); }
  params.append('page_size', TABLE_PAGE_SIZE);
  return `?${params.toString()}`;
}

/**
 * Upload a CSV of course ids. The response is the dry-run preview *and* creates the
 * batch — there is no separate preview call, and nothing is mutated yet. Never set
 * Content-Type: the browser must set it to include the multipart boundary.
 */
export function uploadBulkUnenrollFile(file, intl) {
  const formData = new FormData();
  formData.append('file', file);
  return request(intl, messages.uploadError, (client) => client.post(`${baseUrl()}/`, formData));
}

/**
 * List batches, newest first. `state` is comma-separated (e.g. `pending,running`)
 * so one request covers every in-flight state — otherwise the batch id, surfaced
 * only in the URL after confirming, is the sole handle on a run lasting hours.
 */
export function listBulkUnenrollBatches(options, intl) {
  return request(intl, messages.listError, (client) => client.get(`${baseUrl()}/${pagedQuery(options)}`));
}

/**
 * Confirm a validated batch and start the work. The reason is collected here,
 * not at upload, so the operator sees the preview before justifying the action.
 */
export function confirmBulkUnenrollBatch(batchId, reason, intl) {
  return request(intl, messages.confirmError, (client) => client.post(`${baseUrl()}/${batchId}/confirm/`, { reason }));
}

/**
 * Fetch a batch's summary and one page of its per-course rows.
 * `state` filters the listed rows only; the totals stay batch-wide.
 */
export function getBulkUnenrollBatchStatus(batchId, options, intl) {
  return request(intl, messages.statusError, (client) => client.get(`${baseUrl()}/${batchId}/${pagedQuery(options)}`));
}

export function cancelBulkUnenrollBatch(batchId, intl) {
  return request(intl, messages.cancelError, (client) => client.post(`${baseUrl()}/${batchId}/cancel/`));
}

export function retryBulkUnenrollBatch(batchId, intl) {
  return request(intl, messages.retryError, (client) => client.post(`${baseUrl()}/${batchId}/retry/`));
}
