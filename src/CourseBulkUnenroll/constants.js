import messages from './messages';

// Batch-level states, mirroring BulkUnenrollBatch.State on the LMS side.
export const BATCH_STATE = {
  VALIDATED: 'validated',
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  PARTIAL: 'partial',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Per-course states, mirroring BulkUnenrollCourseState.State.
export const COURSE_STATE = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  // Unfinished when the batch was cancelled — unlike SKIPPED, some of this
  // course's learners may already be unenrolled.
  CANCELLED: 'cancelled',
};

// A batch in one of these states will never change again, so polling stops.
export const TERMINAL_BATCH_STATES = [
  BATCH_STATE.SUCCEEDED,
  BATCH_STATE.PARTIAL,
  BATCH_STATE.FAILED,
  BATCH_STATE.CANCELLED,
];

// Only these can be cancelled; anything else has already stopped.
export const CANCELLABLE_BATCH_STATES = [
  BATCH_STATE.PENDING,
  BATCH_STATE.RUNNING,
];

// Retry re-runs the failed courses of a finished-but-imperfect batch.
export const RETRYABLE_BATCH_STATES = [
  BATCH_STATE.PARTIAL,
  BATCH_STATE.FAILED,
];

// Shared by the batch list and progress view so a state never reads as two things.
export const BATCH_STATE_VARIANTS = {
  [BATCH_STATE.SUCCEEDED]: 'success',
  [BATCH_STATE.PARTIAL]: 'warning',
  [BATCH_STATE.FAILED]: 'danger',
  [BATCH_STATE.CANCELLED]: 'light',
  [BATCH_STATE.RUNNING]: 'info',
  [BATCH_STATE.PENDING]: 'light',
  [BATCH_STATE.VALIDATED]: 'light',
};

// Not derived from BATCH_STATE_VARIANTS: the vocabularies only partly overlap
// (a course can be `skipped`, a batch `partial`), so one map cannot serve both.
export const COURSE_STATE_VARIANTS = {
  [COURSE_STATE.SUCCEEDED]: 'success',
  [COURSE_STATE.FAILED]: 'danger',
  [COURSE_STATE.RUNNING]: 'info',
  [COURSE_STATE.PENDING]: 'light',
  [COURSE_STATE.SKIPPED]: 'light',
  // Matches the cancelled batch badge, so the two levels of one screen agree.
  [COURSE_STATE.CANCELLED]: 'light',
};

// {value, label} pairs, shaped like CourseTeamManagement's dropdown options.
// One option per real state: grouped shortcuts ("in flight", "needs attention")
// were tried and removed — they left states that dominate real data (`validated`,
// `cancelled`) unselectable. If it can appear in the column, it can be filtered on.
// `value: ''` is unfiltered; the API call omits the param rather than sending empty.
export const ALL_FILTER_VALUE = '';

export const BATCH_STATE_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: messages.filterAll },
  { value: BATCH_STATE.VALIDATED, label: messages.stateValidated },
  { value: BATCH_STATE.PENDING, label: messages.statePending },
  { value: BATCH_STATE.RUNNING, label: messages.stateRunning },
  { value: BATCH_STATE.SUCCEEDED, label: messages.stateSucceeded },
  { value: BATCH_STATE.PARTIAL, label: messages.statePartial },
  { value: BATCH_STATE.FAILED, label: messages.stateFailed },
  { value: BATCH_STATE.CANCELLED, label: messages.stateCancelled },
];

export const COURSE_STATE_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: messages.filterAll },
  { value: COURSE_STATE.PENDING, label: messages.statePending },
  { value: COURSE_STATE.RUNNING, label: messages.stateRunning },
  { value: COURSE_STATE.SUCCEEDED, label: messages.stateSucceeded },
  { value: COURSE_STATE.FAILED, label: messages.stateFailed },
  { value: COURSE_STATE.SKIPPED, label: messages.stateSkipped },
  { value: COURSE_STATE.CANCELLED, label: messages.stateCancelled },
];

// Preview rows filter on whether the server flagged the course, not on state — a
// previewed course has none yet. Filtered in-browser; the upload response has all.
export const PREVIEW_FILTER = {
  ALL: ALL_FILTER_VALUE,
  VALID: 'valid',
  NOT_FOUND: 'not_found',
};

export const PREVIEW_FILTER_OPTIONS = [
  { value: PREVIEW_FILTER.ALL, label: messages.filterAll },
  { value: PREVIEW_FILTER.VALID, label: messages.filterValid },
  { value: PREVIEW_FILTER.NOT_FOUND, label: messages.filterNotFound },
];

// Sent as `page_size` *and* used for the table's page-count maths; the two must
// agree or `pageCount` is wrong and the paging controls silently go dead.
export const TABLE_PAGE_SIZE = 10;

// How long confirm rests on `complete` before handing off to the progress view.
export const CONFIRM_COMPLETE_DELAY_MS = 1000;

export const POLL_INTERVAL_MS = 5000;

// Slower than a single batch: background awareness, not progress being watched,
// and it has no terminal state to stop on.
export const BATCH_LIST_POLL_INTERVAL_MS = 15000;

// Mirrors BULK_UNENROLL_MAX_FILE_BYTES / MAX_ROWS in lms/envs/common.py, only to
// phrase the server's rejection in the operator's terms. The server is authority.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 2000;

// URL param that makes a run shareable and reload-proof.
export const BATCH_ID_PARAM = 'batch_id';
