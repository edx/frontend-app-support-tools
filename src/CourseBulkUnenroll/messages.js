import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  pageTitle: {
    id: 'courseBulkUnenrollPageTitle',
    defaultMessage: 'Bulk Unenroll',
    description: 'Bulk unenroll page title',
  },
  pageDescription: {
    id: 'courseBulkUnenrollPageDescription',
    defaultMessage: 'Upload a CSV of course IDs to remove all active learners from those courses.',
    description: 'Bulk unenroll page description',
  },

  // --- upload step ---
  fileLabel: {
    id: 'courseBulkUnenrollFileLabel',
    defaultMessage: 'Course ID CSV file',
    description: 'Label for the CSV file picker',
  },
  fileHelpText: {
    id: 'courseBulkUnenrollFileHelpText',
    defaultMessage: 'One course ID per row, up to {maxRows} rows and {maxMegabytes} MB.',
    description: 'Help text under the CSV file picker',
  },
  uploadButton: {
    id: 'courseBulkUnenrollUploadButton',
    defaultMessage: 'Upload and preview',
    description: 'Button that uploads the CSV for a preview',
  },
  uploadingButton: {
    id: 'courseBulkUnenrollUploadingButton',
    defaultMessage: 'Uploading…',
    description: 'Upload button label while the upload is in flight',
  },
  noFileSelected: {
    id: 'courseBulkUnenrollNoFileSelected',
    defaultMessage: 'Choose a CSV file first.',
    description: 'Shown when upload is attempted with no file selected',
  },
  startOver: {
    id: 'courseBulkUnenrollStartOver',
    defaultMessage: 'Start over',
    description: 'Button that discards the current preview and returns to the file picker',
  },

  // --- preview step ---
  previewHeading: {
    id: 'courseBulkUnenrollPreviewHeading',
    defaultMessage: 'Preview',
    description: 'Heading for the dry-run preview section',
  },
  previewSummary: {
    id: 'courseBulkUnenrollPreviewSummary',
    defaultMessage: 'This will unenroll {learners} learners across {courses} courses.',
    description: 'Summary sentence above the preview table',
  },
  rejectedRowsHeading: {
    id: 'courseBulkUnenrollRejectedRowsHeading',
    defaultMessage: 'Rows that could not be read ({count})',
    description: 'Heading for the list of rejected CSV rows',
  },
  rejectedRow: {
    id: 'courseBulkUnenrollRejectedRow',
    defaultMessage: 'Row {row}: {message}',
    description: 'A single rejected CSV row with its line number',
  },
  columnCourseId: {
    id: 'courseBulkUnenrollColumnCourseId',
    defaultMessage: 'Course ID',
    description: 'Preview table column header for the course ID',
  },
  columnLearners: {
    id: 'courseBulkUnenrollColumnLearners',
    defaultMessage: 'Active learners',
    description: 'Preview table column header for the active learner count',
  },
  columnState: {
    id: 'courseBulkUnenrollColumnState',
    defaultMessage: 'Status',
    description: 'Table column header for the per-course status',
  },
  columnUnenrolled: {
    id: 'courseBulkUnenrollColumnUnenrolled',
    defaultMessage: 'Unenrolled',
    description: 'Table column header for learners unenrolled so far',
  },
  columnFailed: {
    id: 'courseBulkUnenrollColumnFailed',
    defaultMessage: 'Failed',
    description: 'Table column header for learners that could not be unenrolled',
  },
  columnError: {
    id: 'courseBulkUnenrollColumnError',
    defaultMessage: 'Error',
    description: 'Table column header for a per-course error message',
  },
  noCourses: {
    id: 'courseBulkUnenrollNoCourses',
    defaultMessage: 'No courses to show.',
    description: 'Empty state for the course table',
  },

  // --- confirm step ---
  reasonLabel: {
    id: 'courseBulkUnenrollReasonLabel',
    defaultMessage: 'Reason (required)',
    description: 'Label for the required reason field',
  },
  reasonHelpText: {
    id: 'courseBulkUnenrollReasonHelpText',
    defaultMessage: 'Recorded with the batch so this action can be traced later.',
    description: 'Help text under the reason field',
  },
  reasonRequired: {
    id: 'courseBulkUnenrollReasonRequired',
    defaultMessage: 'A reason is required.',
    description: 'Validation message when the reason is blank',
  },
  confirmButton: {
    id: 'courseBulkUnenrollConfirmButton',
    defaultMessage: 'Unenroll learners',
    description: 'Button that opens the confirmation modal',
  },
  confirmModalTitle: {
    id: 'courseBulkUnenrollConfirmModalTitle',
    defaultMessage: 'Confirm bulk unenrollment',
    description: 'Title of the confirmation modal',
  },
  confirmModalBody: {
    id: 'courseBulkUnenrollConfirmModalBody',
    defaultMessage: 'across {courses} courses. This cannot be undone.',
    description: 'Body text of the confirmation modal, following the large learner count',
  },
  confirmModalConfirm: {
    id: 'courseBulkUnenrollConfirmModalConfirm',
    defaultMessage: 'Yes, unenroll them',
    description: 'Final confirm button inside the modal',
  },
  confirmModalConfirming: {
    id: 'courseBulkUnenrollConfirmModalConfirming',
    defaultMessage: 'Starting…',
    description: 'Confirm button label while the batch is being started',
  },
  confirmModalConfirmed: {
    id: 'courseBulkUnenrollConfirmModalConfirmed',
    defaultMessage: 'Started',
    description: 'Confirm button label once the batch has been started',
  },
  confirmModalCancel: {
    id: 'courseBulkUnenrollConfirmModalCancel',
    defaultMessage: 'Go back',
    description: 'Button that dismisses the confirmation modal',
  },

  // --- progress step ---
  progressHeading: {
    id: 'courseBulkUnenrollProgressHeading',
    defaultMessage: 'Batch progress',
    description: 'Heading for the progress view',
  },
  progressCourses: {
    id: 'courseBulkUnenrollProgressCourses',
    defaultMessage: '{finished} of {total} courses finished',
    description: 'Course-level progress summary',
  },
  progressLearners: {
    id: 'courseBulkUnenrollProgressLearners',
    defaultMessage: '{unenrolled} learners unenrolled',
    description: 'Learner-level progress summary',
  },
  progressAlreadyInactive: {
    id: 'courseBulkUnenrollProgressAlreadyInactive',
    defaultMessage: '{count} already inactive',
    description: 'Count of learners that were already unenrolled',
  },
  progressFailures: {
    id: 'courseBulkUnenrollProgressFailures',
    defaultMessage: '{count} failures',
    description: 'Count of learners that could not be unenrolled',
  },
  cancelButton: {
    id: 'courseBulkUnenrollCancelButton',
    defaultMessage: 'Cancel batch',
    description: 'Button that stops a running batch',
  },
  retryButton: {
    id: 'courseBulkUnenrollRetryButton',
    defaultMessage: 'Retry failed courses',
    description: 'Button that re-runs the failed courses of a batch',
  },
  cancelledNotice: {
    id: 'courseBulkUnenrollCancelledNotice',
    defaultMessage: 'This batch was cancelled. Learners already unenrolled stay unenrolled; '
      + 'the remaining courses were not processed.',
    description: 'Explains what cancelling did, shown on a cancelled batch',
  },

  // --- table controls (shared by all three tables) ---
  searchPlaceholder: {
    id: 'courseBulkUnenrollSearchPlaceholder',
    defaultMessage: 'Search course ID',
    description: 'Placeholder in the preview table search box',
  },
  tableNoOfEntriesShowingLabel: {
    id: 'courseBulkUnenrollTableNoOfEntriesShowingLabel',
    defaultMessage: 'Showing {startItemIndex} - {endItemIndex} of {totalFilteredItems}',
    description: 'Count of the rows currently visible in a table',
  },
  filterAll: {
    id: 'courseBulkUnenrollFilterAll',
    defaultMessage: 'All statuses',
    description: 'Unfiltered choice in a table status filter',
  },
  filterValid: {
    id: 'courseBulkUnenrollFilterValid',
    defaultMessage: 'Found',
    description: 'Preview filter choice for courses that exist',
  },
  filterNotFound: {
    id: 'courseBulkUnenrollFilterNotFound',
    defaultMessage: 'Not found',
    description: 'Preview filter choice for course IDs the server could not find',
  },
  stateValidated: {
    id: 'courseBulkUnenrollStateValidated',
    defaultMessage: 'Validated',
    description: 'Label for the validated state',
  },
  statePending: {
    id: 'courseBulkUnenrollStatePending',
    defaultMessage: 'Pending',
    description: 'Label for the pending state',
  },
  stateRunning: {
    id: 'courseBulkUnenrollStateRunning',
    defaultMessage: 'Running',
    description: 'Label for the running state',
  },
  stateSucceeded: {
    id: 'courseBulkUnenrollStateSucceeded',
    defaultMessage: 'Succeeded',
    description: 'Label for the succeeded state',
  },
  statePartial: {
    id: 'courseBulkUnenrollStatePartial',
    defaultMessage: 'Partial',
    description: 'Label for the partial state',
  },
  stateFailed: {
    id: 'courseBulkUnenrollStateFailed',
    defaultMessage: 'Failed',
    description: 'Label for the failed state',
  },
  stateCancelled: {
    id: 'courseBulkUnenrollStateCancelled',
    defaultMessage: 'Cancelled',
    description: 'Label for the cancelled state',
  },
  stateSkipped: {
    id: 'courseBulkUnenrollStateSkipped',
    defaultMessage: 'Skipped',
    description: 'Label for the skipped state',
  },

  // --- batch list ---
  batchListHeading: {
    id: 'courseBulkUnenrollBatchListHeading',
    defaultMessage: 'Batches ({count})',
    description: 'Heading for the list of every bulk unenroll batch',
  },
  batchListDescription: {
    id: 'courseBulkUnenrollBatchListDescription',
    defaultMessage: 'Every batch, newest first. Open one to see its progress and details.',
    description: 'Explanatory text under the batch list heading',
  },
  noBatches: {
    id: 'courseBulkUnenrollNoBatches',
    defaultMessage: 'No batches match this filter.',
    description: 'Empty state for the batch list when a status filter excludes everything',
  },
  noBatchesYet: {
    id: 'courseBulkUnenrollNoBatchesYet',
    defaultMessage: 'No batches have been run yet.',
    description: 'Empty state for the batch list before any batch exists',
  },
  batchesPageTitle: {
    id: 'courseBulkUnenrollBatchesPageTitle',
    defaultMessage: 'Bulk Unenroll Batches',
    description: 'Title of the batch history page',
  },
  backToUpload: {
    id: 'courseBulkUnenrollBackToUpload',
    defaultMessage: 'Back to bulk unenroll',
    description: 'Link from the batch history page, or from a batch being watched, back to the upload page',
  },
  viewBatchHistory: {
    id: 'courseBulkUnenrollViewBatchHistory',
    defaultMessage: 'View batch history',
    description: 'Link from the upload page to the batch history page',
  },
  columnReason: {
    id: 'courseBulkUnenrollColumnReason',
    defaultMessage: 'Reason',
    description: 'Batch list column header for the operator-supplied reason',
  },
  columnRequester: {
    id: 'courseBulkUnenrollColumnRequester',
    defaultMessage: 'Started by',
    description: 'Batch list column header for the user who started the batch',
  },
  columnFile: {
    id: 'courseBulkUnenrollColumnFile',
    defaultMessage: 'File',
    description: 'Batch list column header for the uploaded CSV filename',
  },
  columnCourses: {
    id: 'courseBulkUnenrollColumnCourses',
    defaultMessage: 'Courses',
    description: 'Batch list column header for the batch course count',
  },
  columnStarted: {
    id: 'courseBulkUnenrollColumnStarted',
    defaultMessage: 'Started',
    description: 'Batch list column header for when the batch was created',
  },
  openBatch: {
    id: 'courseBulkUnenrollOpenBatch',
    defaultMessage: 'Open',
    description: 'Button on a batch list row that opens that batch',
  },

  // --- batch details ---
  detailsHeading: {
    id: 'courseBulkUnenrollDetailsHeading',
    defaultMessage: 'Batch details',
    description: 'Heading for the batch metadata block on the progress view',
  },
  detailsReason: {
    id: 'courseBulkUnenrollDetailsReason',
    defaultMessage: 'Reason',
    description: 'Metadata label for the operator-supplied reason',
  },
  detailsNoReason: {
    id: 'courseBulkUnenrollDetailsNoReason',
    defaultMessage: 'Not recorded',
    description: 'Shown in place of the reason when the batch has none',
  },
  detailsRequester: {
    id: 'courseBulkUnenrollDetailsRequester',
    defaultMessage: 'Started by',
    description: 'Metadata label for the user who started the batch',
  },
  detailsFile: {
    id: 'courseBulkUnenrollDetailsFile',
    defaultMessage: 'File',
    description: 'Metadata label for the uploaded CSV filename',
  },
  detailsStarted: {
    id: 'courseBulkUnenrollDetailsStarted',
    defaultMessage: 'Started',
    description: 'Metadata label for when the batch was created',
  },
  detailsFinished: {
    id: 'courseBulkUnenrollDetailsFinished',
    defaultMessage: 'Finished',
    description: 'Metadata label for when a completed batch stopped',
  },
  detailsLastUpdated: {
    id: 'courseBulkUnenrollDetailsLastUpdated',
    defaultMessage: 'Last updated',
    description: 'Metadata label for the last change to a batch still in flight',
  },
  detailsBatchId: {
    id: 'courseBulkUnenrollDetailsBatchId',
    defaultMessage: 'Batch ID',
    description: 'Metadata label for the batch id',
  },

  // --- batch lookup ---
  lookupHeading: {
    id: 'courseBulkUnenrollLookupHeading',
    defaultMessage: 'Look up an existing batch',
    description: 'Heading for the batch lookup entry point',
  },
  lookupLabel: {
    id: 'courseBulkUnenrollLookupLabel',
    defaultMessage: 'Batch ID',
    description: 'Label for the batch ID lookup field',
  },
  lookupButton: {
    id: 'courseBulkUnenrollLookupButton',
    defaultMessage: 'Open batch',
    description: 'Button that opens an existing batch by ID',
  },

  // --- errors ---
  uploadError: {
    id: 'courseBulkUnenrollUploadError',
    defaultMessage: 'The file could not be uploaded.',
    description: 'Generic upload failure message',
  },
  fileTooLargeError: {
    id: 'courseBulkUnenrollFileTooLargeError',
    defaultMessage: 'That file is too large. The limit is {maxMegabytes} MB.',
    description: 'Shown when the server rejects the file for size',
  },
  tooManyRowsError: {
    id: 'courseBulkUnenrollTooManyRowsError',
    defaultMessage: 'That file has too many rows. The limit is {maxRows}.',
    description: 'Shown when the server rejects the file for row count',
  },
  confirmError: {
    id: 'courseBulkUnenrollConfirmError',
    defaultMessage: 'The batch could not be confirmed.',
    description: 'Generic confirm failure message',
  },
  statusError: {
    id: 'courseBulkUnenrollStatusError',
    defaultMessage: 'The batch status could not be loaded.',
    description: 'Generic status fetch failure message',
  },
  listError: {
    id: 'courseBulkUnenrollListError',
    defaultMessage: 'The list of batches could not be loaded.',
    description: 'Generic batch list fetch failure message',
  },
  batchNotFoundError: {
    id: 'courseBulkUnenrollBatchNotFoundError',
    defaultMessage: 'No batch found with that ID.',
    description: 'Shown when a batch ID does not exist',
  },
  cancelError: {
    id: 'courseBulkUnenrollCancelError',
    defaultMessage: 'The batch could not be cancelled.',
    description: 'Generic cancel failure message',
  },
  retryError: {
    id: 'courseBulkUnenrollRetryError',
    defaultMessage: 'The failed courses could not be retried.',
    description: 'Generic retry failure message',
  },
  permissionError: {
    id: 'courseBulkUnenrollPermissionError',
    defaultMessage: 'You do not have permission to use this tool.',
    description: 'Shown when the API rejects the user as not global staff',
  },
});

export default messages;
