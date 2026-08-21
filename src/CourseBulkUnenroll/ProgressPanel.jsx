import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Badge, Button, DataTable, ProgressBar, Spinner, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import BatchMetadata from './BatchMetadata';
import StateFilterDropdown from './StateFilterDropdown';
import TableActions from './TableActions';
import { stateLabel } from './utils';
import {
  BATCH_STATE,
  BATCH_STATE_VARIANTS,
  CANCELLABLE_BATCH_STATES,
  COURSE_STATE_FILTER_OPTIONS,
  COURSE_STATE_VARIANTS,
  RETRYABLE_BATCH_STATES,
  TABLE_PAGE_SIZE,
} from './constants';

// Module scope: inline this would be a new component type every poll, tearing
// down the rows' DOM.
function CourseStateCell({ row }) {
  const intl = useIntl();
  const { state } = row.original;
  return (
    <Badge
      className="course-bulk-unenroll-status-badge d-inline-flex justify-content-center align-items-center p-2"
      variant={COURSE_STATE_VARIANTS[state] ?? 'light'}
    >
      {stateLabel(intl, state)}
    </Badge>
  );
}
CourseStateCell.propTypes = {
  row: PropTypes.shape({
    original: PropTypes.shape({ state: PropTypes.string }).isRequired,
  }).isRequired,
};

/**
 * Step 4: watch a running batch.
 *
 * Numbers come from batch-level `totals`, not the visible rows — the table shows
 * one page, so summing the screen would understate a 2000-course batch. That table
 * is server-paginated, so it cannot sort or search, and page changes must be handed
 * back up to refetch or the footer buttons just move a local index.
 */
export default function ProgressPanel({
  batch, isLoading, courseFilter, onCourseFilterChange, page, onPageChange,
  onCancel, onRetry, isMutating,
}) {
  const intl = useIntl();
  const [tableState, setTableState] = useState({ pageIndex: page - 1, pageSize: TABLE_PAGE_SIZE });

  // DataTable owns the page index, the fetch is driven from `page` above. Keep both
  // in step so a filter change that resets the page shows in the footer.
  useEffect(() => {
    setTableState((prev) => (prev.pageIndex === page - 1 ? prev : { ...prev, pageIndex: page - 1 }));
  }, [page]);

  // `page` via ref so this callback stays stable: Paragon's fetchData effect depends
  // on its identity, so one rebuilt per render re-fires forever.
  const pageRef = useRef(page);
  pageRef.current = page;

  const handleFetchData = useCallback((next) => {
    setTableState((prev) => (
      prev.pageIndex === next.pageIndex && prev.pageSize === next.pageSize
        ? prev
        : { ...prev, pageIndex: next.pageIndex, pageSize: next.pageSize }
    ));
    if (next.pageIndex !== pageRef.current - 1) { onPageChange(next.pageIndex + 1); }
  }, [onPageChange]);

  const totals = batch.totals ?? {};
  const coursesFinished = totals.courses_finished ?? 0;
  const totalCourses = batch.total_courses ?? 0;

  // Measured in LEARNERS, not courses: a course counts as finished only once all its
  // chunks land, so a single-course batch would sit at 0% then snap to 100% — and one
  // course can hold millions of learners. Learner counts advance every chunk.
  const processed = (totals.unenrolled ?? 0)
    + (totals.already_inactive ?? 0)
    + (totals.failed ?? 0);
  const totalLearners = totals.active ?? 0;
  // Clamp: `active` is the upload-time preview count, so late enrolments can exceed it.
  const percent = totalLearners > 0
    ? Math.min(100, Math.round((processed / totalLearners) * 100))
    : 0;

  // Paginated here (unlike the upload response's plain array), so rows are in `results`.
  const rows = batch.courses?.results ?? [];
  const rowCount = batch.courses?.count ?? rows.length;

  const canCancel = CANCELLABLE_BATCH_STATES.includes(batch.state);
  const canRetry = RETRYABLE_BATCH_STATES.includes(batch.state);

  const tableActions = (
    <TableActions
      pageIndex={tableState.pageIndex}
      pageSize={tableState.pageSize}
      totalItems={rowCount}
    >
      <StateFilterDropdown
        id="bulk-unenroll-course-filter"
        testId="bulk-unenroll-course-filter"
        value={courseFilter}
        onChange={onCourseFilterChange}
        options={COURSE_STATE_FILTER_OPTIONS}
      />
    </TableActions>
  );

  return (
    <div data-testid="bulk-unenroll-progress">
      <Stack direction="horizontal" gap={2} className="align-items-center mb-2">
        <header className="course-bulk-unenroll-section-title">
          {intl.formatMessage(messages.progressHeading)}
        </header>
        <Badge
          className="course-bulk-unenroll-status-badge d-inline-flex justify-content-center align-items-center p-2"
          variant={BATCH_STATE_VARIANTS[batch.state] ?? 'light'}
          data-testid="bulk-unenroll-batch-state"
        >
          {stateLabel(intl, batch.state)}
        </Badge>
        {isLoading && <Spinner animation="border" size="sm" screenReaderText="loading" />}
      </Stack>

      <ProgressBar now={percent} label={`${percent}%`} variant="primary" className="mb-3" />

      <Stack direction="horizontal" gap={4} className="mb-3">
        <span data-testid="bulk-unenroll-progress-courses">
          {intl.formatMessage(messages.progressCourses, {
            finished: coursesFinished.toLocaleString(),
            total: totalCourses.toLocaleString(),
          })}
        </span>
        <span data-testid="bulk-unenroll-progress-learners">
          {intl.formatMessage(messages.progressLearners, {
            unenrolled: (totals.unenrolled ?? 0).toLocaleString(),
          })}
        </span>
        <span data-testid="bulk-unenroll-progress-inactive">
          {intl.formatMessage(messages.progressAlreadyInactive, {
            count: (totals.already_inactive ?? 0).toLocaleString(),
          })}
        </span>
        <span data-testid="bulk-unenroll-progress-failures">
          {intl.formatMessage(messages.progressFailures, {
            count: (totals.failed ?? 0).toLocaleString(),
          })}
        </span>
      </Stack>

      <BatchMetadata batch={batch} />

      {batch.state === BATCH_STATE.CANCELLED && (
        <Alert variant="info" data-testid="bulk-unenroll-cancelled-notice">
          {intl.formatMessage(messages.cancelledNotice)}
        </Alert>
      )}

      {(canCancel || canRetry) && (
        <div className="py-2 mb-2 d-flex justify-content-end align-items-center">
          {canCancel && (
            <Button
              variant="outline-danger"
              onClick={onCancel}
              disabled={isMutating}
              data-testid="bulk-unenroll-cancel-button"
            >
              {intl.formatMessage(messages.cancelButton)}
            </Button>
          )}
          {canRetry && (
            <Button
              variant="danger"
              onClick={onRetry}
              disabled={isMutating}
              data-testid="bulk-unenroll-retry-button"
            >
              {intl.formatMessage(messages.retryButton)}
            </Button>
          )}
        </div>
      )}

      <div className="course-bulk-unenroll-table">
        <DataTable
          isLoading={isLoading}
          isPaginated
          manualPagination
          manualFilters
          isFilterable
          initialState={tableState}
          state={tableState}
          fetchData={handleFetchData}
          pageCount={Math.ceil(rowCount / tableState.pageSize)}
          itemCount={rowCount}
          tableActions={[tableActions]}
          data={rows}
          columns={[
            { Header: intl.formatMessage(messages.columnCourseId), accessor: 'course_id', disableFilters: true },
            {
              Header: intl.formatMessage(messages.columnState),
              accessor: 'state',
              id: 'state',
              Cell: CourseStateCell,
              disableFilters: true,
            },
            { Header: intl.formatMessage(messages.columnLearners), accessor: 'active_count', disableFilters: true },
            { Header: intl.formatMessage(messages.columnUnenrolled), accessor: 'unenrolled', disableFilters: true },
            { Header: intl.formatMessage(messages.columnFailed), accessor: 'failed_count', disableFilters: true },
            {
              Header: intl.formatMessage(messages.columnError),
              accessor: 'error',
              disableFilters: true,
              cellClassName: 'error-cell',
            },
          ]}
        >
          <DataTable.TableControlBar />
          {rows.length > 0 && <DataTable.Table />}
          {rows.length === 0 && (
            <div className="pgn__data-table-empty">{intl.formatMessage(messages.noCourses)}</div>
          )}
          {rowCount > 0 && <DataTable.TableFooter />}
        </DataTable>
      </div>
    </div>
  );
}

ProgressPanel.propTypes = {
  batch: PropTypes.shape({
    batch_id: PropTypes.string,
    state: PropTypes.string,
    reason: PropTypes.string,
    requester: PropTypes.string,
    csv_filename: PropTypes.string,
    created: PropTypes.string,
    modified: PropTypes.string,
    total_courses: PropTypes.number,
    totals: PropTypes.shape({
      courses_finished: PropTypes.number,
      unenrolled: PropTypes.number,
      already_inactive: PropTypes.number,
      failed: PropTypes.number,
    }),
    courses: PropTypes.shape({
      count: PropTypes.number,
      results: PropTypes.arrayOf(PropTypes.shape({
        course_id: PropTypes.string,
        state: PropTypes.string,
      })),
    }),
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  courseFilter: PropTypes.string.isRequired,
  onCourseFilterChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  isMutating: PropTypes.bool.isRequired,
};
