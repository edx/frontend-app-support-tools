import { Suspense, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { DataTable, Form, Icon } from '@openedx/paragon';
import { Search } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import Alert from '../userMessages/Alert';
import StateFilterDropdown from './StateFilterDropdown';
import TableActions from './TableActions';
import messages from './messages';
import {
  ALL_FILTER_VALUE, PREVIEW_FILTER, PREVIEW_FILTER_OPTIONS, TABLE_PAGE_SIZE,
} from './constants';

/**
 * Step 2: the dry-run preview.
 *
 * Rejected rows come first with their 1-based CSV line number. Search and paging
 * are client-side, which only works here because the whole course array arrives in
 * the upload response. No column sorting, deliberately: the rows are the operator's
 * CSV in the order they wrote it and will fix it in, and their two real questions
 * ("is this id in the file?", "which did not resolve?") are answered by the search
 * box and filter. That filter also catches a trap — an all-unknown CSV previews as
 * "0 learners across N courses", which reads as "nothing to do".
 */
export default function PreviewPanel({ courses, errors, totalLearners }) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(ALL_FILTER_VALUE);
  const [tableState, setTableState] = useState({ pageIndex: 0, pageSize: TABLE_PAGE_SIZE });

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((row) => {
      const matchesSearch = !term || (row.course_id || '').toLowerCase().includes(term);
      if (filter === PREVIEW_FILTER.VALID) { return matchesSearch && !row.error; }
      if (filter === PREVIEW_FILTER.NOT_FOUND) { return matchesSearch && !!row.error; }
      return matchesSearch;
    });
  }, [courses, search, filter]);

  const currentPageData = useMemo(() => {
    const start = tableState.pageIndex * tableState.pageSize;
    return filteredData.slice(start, start + tableState.pageSize);
  }, [filteredData, tableState.pageIndex, tableState.pageSize]);

  // Narrowing can strand the viewer past the end, showing an empty table over a
  // non-empty preview.
  const resetToFirstPage = () => setTableState((prev) => ({ ...prev, pageIndex: 0 }));

  const tableActions = (
    <TableActions
      pageIndex={tableState.pageIndex}
      pageSize={tableState.pageSize}
      totalItems={filteredData.length}
    >
      <Form.Control
        type="text"
        placeholder={intl.formatMessage(messages.searchPlaceholder)}
        value={search}
        onChange={(event) => { setSearch(event.target.value); resetToFirstPage(); }}
        trailingElement={<Icon src={Search} />}
        data-testid="bulk-unenroll-preview-search"
      />
      <StateFilterDropdown
        id="bulk-unenroll-preview-filter"
        testId="bulk-unenroll-preview-filter"
        value={filter}
        onChange={(value) => { setFilter(value); resetToFirstPage(); }}
        options={PREVIEW_FILTER_OPTIONS}
      />
    </TableActions>
  );

  return (
    <div data-testid="bulk-unenroll-preview">
      <header className="course-bulk-unenroll-section-title mb-3">
        {intl.formatMessage(messages.previewHeading)}
      </header>
      <div className="course-bulk-unenroll-section-description text-gray-700 mb-4.5">
        <p data-testid="bulk-unenroll-preview-summary">
          {intl.formatMessage(messages.previewSummary, {
            learners: totalLearners.toLocaleString(),
            courses: courses.length.toLocaleString(),
          })}
        </p>
      </div>

      {errors.length > 0 && (
        <Suspense key="BulkUnenrollRejectedRows" fallback={null}>
          <Alert type="error">
            <div data-testid="bulk-unenroll-rejected-rows">
              <strong>
                {intl.formatMessage(messages.rejectedRowsHeading, { count: errors.length })}
              </strong>
              <ul className="mb-0">
                {errors.map((rowError) => (
                  <li key={`${rowError.row}-${rowError.value}`}>
                    {intl.formatMessage(messages.rejectedRow, {
                      row: rowError.row,
                      message: rowError.error,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          </Alert>
        </Suspense>
      )}

      <div className="course-bulk-unenroll-table">
        <DataTable
          isPaginated
          manualPagination
          manualFilters
          isFilterable
          initialState={tableState}
          state={tableState}
          // Plain useState setter: Paragon's fetchData effect depends on this
          // identity, so anything rebuilt per render re-fires forever.
          fetchData={setTableState}
          pageCount={Math.ceil(filteredData.length / tableState.pageSize)}
          itemCount={filteredData.length}
          tableActions={[tableActions]}
          data={currentPageData}
          columns={[
            { Header: intl.formatMessage(messages.columnCourseId), accessor: 'course_id', disableFilters: true },
            { Header: intl.formatMessage(messages.columnLearners), accessor: 'active_count', disableFilters: true },
            {
              Header: intl.formatMessage(messages.columnError),
              accessor: 'error',
              disableFilters: true,
              cellClassName: 'error-cell',
            },
          ]}
        >
          <DataTable.TableControlBar />
          {filteredData.length > 0 && <DataTable.Table />}
          {filteredData.length === 0 && (
            <div className="pgn__data-table-empty">{intl.formatMessage(messages.noCourses)}</div>
          )}
          {filteredData.length > 0 && <DataTable.TableFooter />}
        </DataTable>
      </div>
    </div>
  );
}

PreviewPanel.propTypes = {
  courses: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string,
    active_count: PropTypes.number,
    error: PropTypes.string,
  })).isRequired,
  errors: PropTypes.arrayOf(PropTypes.shape({
    row: PropTypes.number,
    value: PropTypes.string,
    error: PropTypes.string,
  })).isRequired,
  totalLearners: PropTypes.number.isRequired,
};
