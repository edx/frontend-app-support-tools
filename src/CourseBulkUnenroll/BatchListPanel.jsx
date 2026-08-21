import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Badge, Button, DataTable, Spinner, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import StateFilterDropdown from './StateFilterDropdown';
import TableActions from './TableActions';
import { usePolledBatchList } from './data/hooks';
import {
  ALL_FILTER_VALUE, BATCH_STATE_FILTER_OPTIONS, BATCH_STATE_VARIANTS, TABLE_PAGE_SIZE,
} from './constants';
import { formatDate } from '../utils';
import { stateLabel } from './utils';

// Module scope: inline these would be new component types every render, tearing
// down the rows' DOM.

const rowShape = PropTypes.shape({
  original: PropTypes.shape({
    batch_id: PropTypes.string,
    state: PropTypes.string,
    created: PropTypes.string,
  }).isRequired,
}).isRequired;

function StateCell({ row }) {
  const intl = useIntl();
  const { state } = row.original;
  return (
    <Badge
      className="course-bulk-unenroll-status-badge d-inline-flex justify-content-center align-items-center p-2"
      variant={BATCH_STATE_VARIANTS[state] ?? 'light'}
    >
      {stateLabel(intl, state)}
    </Badge>
  );
}
StateCell.propTypes = { row: rowShape };

const StartedCell = ({ row }) => formatDate(row.original.created);
StartedCell.propTypes = { row: rowShape };

// `onOpen` rides on the column definition: react-table merges custom keys into the
// column instance, which is how a module-scope cell reaches a page callback.
function OpenCell({ row, column }) {
  const intl = useIntl();
  return (
    <Button
      variant="outline-primary"
      size="sm"
      onClick={() => column.onOpen(row.original.batch_id)}
      data-testid={`bulk-unenroll-open-${row.original.batch_id}`}
    >
      {intl.formatMessage(messages.openBatch)}
    </Button>
  );
}
OpenCell.propTypes = {
  row: rowShape,
  column: PropTypes.shape({ onOpen: PropTypes.func.isRequired }).isRequired,
};

/**
 * Every batch, newest first — the run history, routed by
 * `CourseBulkUnenrollBatchesPage`.
 *
 * Unfiltered by default and not scoped to the current user, on purpose: this is the
 * only place a finished or cancelled batch can be found, since the id is surfaced
 * just once (the URL after confirming) and a run can take hours. A run you cannot
 * find because a colleague started it is the same operational problem.
 */
export default function BatchListPanel({ onOpen }) {
  const intl = useIntl();
  const [filter, setFilter] = useState(ALL_FILTER_VALUE);
  const [tableState, setTableState] = useState({ pageIndex: 0, pageSize: TABLE_PAGE_SIZE });

  const {
    batches, count, error, isLoading,
  } = usePolledBatchList(filter || undefined, tableState.pageIndex + 1);

  if (error) {
    return (
      <Alert variant="danger" data-testid="bulk-unenroll-batch-list-error">
        {error.error?.[0]?.text ?? intl.formatMessage(messages.listError)}
      </Alert>
    );
  }

  // null until the first response, distinct from empty — a blank page here would
  // read as a broken route.
  if (batches === null) {
    return (
      <div className="d-flex align-items-center" data-testid="bulk-unenroll-batch-list-loading">
        <Spinner animation="border" className="mr-2" screenReaderText="loading" />
        {intl.formatMessage(messages.batchListHeading, { count: 0 })}
      </div>
    );
  }

  const tableActions = (
    <TableActions
      pageIndex={tableState.pageIndex}
      pageSize={tableState.pageSize}
      totalItems={count}
    >
      <StateFilterDropdown
        id="bulk-unenroll-batch-filter"
        testId="bulk-unenroll-batch-filter"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setTableState((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        options={BATCH_STATE_FILTER_OPTIONS}
      />
    </TableActions>
  );

  return (
    <div className="mb-4" data-testid="bulk-unenroll-batch-list">
      <Stack direction="horizontal" gap={2} className="align-items-center mb-1">
        <header className="course-bulk-unenroll-section-title">
          {intl.formatMessage(messages.batchListHeading, { count })}
        </header>
        {isLoading && <Spinner animation="border" size="sm" screenReaderText="loading" />}
      </Stack>
      <div className="course-bulk-unenroll-section-description text-gray-700 mb-4.5">
        <p>{intl.formatMessage(messages.batchListDescription)}</p>
      </div>

      <div className="course-bulk-unenroll-table">
        <DataTable
          isLoading={isLoading}
          isPaginated
          manualPagination
          manualFilters
          isFilterable
          initialState={tableState}
          state={tableState}
          // Plain useState setter: Paragon's fetchData effect depends on this
          // identity, so anything rebuilt per render re-fires forever.
          fetchData={setTableState}
          pageCount={Math.ceil(count / tableState.pageSize)}
          itemCount={count}
          tableActions={[tableActions]}
          data={batches}
          columns={[
            {
              Header: intl.formatMessage(messages.columnState),
              accessor: 'state',
              Cell: StateCell,
              disableFilters: true,
            },
            { Header: intl.formatMessage(messages.columnReason), accessor: 'reason', disableFilters: true },
            { Header: intl.formatMessage(messages.columnRequester), accessor: 'requester', disableFilters: true },
            { Header: intl.formatMessage(messages.columnFile), accessor: 'csv_filename', disableFilters: true },
            { Header: intl.formatMessage(messages.columnCourses), accessor: 'total_courses', disableFilters: true },
            {
              Header: intl.formatMessage(messages.columnStarted),
              accessor: 'created',
              Cell: StartedCell,
              disableFilters: true,
            },
            {
              Header: '', id: 'open', onOpen, Cell: OpenCell, disableFilters: true,
            },
          ]}
        >
          <DataTable.TableControlBar />
          {batches.length > 0 && <DataTable.Table />}
          {batches.length === 0 && (
            <div className="pgn__data-table-empty" data-testid="bulk-unenroll-batch-list-empty">
              {intl.formatMessage(filter ? messages.noBatches : messages.noBatchesYet)}
            </div>
          )}
          {count > 0 && <DataTable.TableFooter />}
        </DataTable>
      </div>
    </div>
  );
}

BatchListPanel.propTypes = {
  onOpen: PropTypes.func.isRequired,
};
