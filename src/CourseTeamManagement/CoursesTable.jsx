import React, { useEffect, useState, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  Form,
  DataTable,
  Badge,
  Dropdown,
} from '@openedx/paragon';
import { ArrowDropDown } from '@openedx/paragon/icons';
import PropTypes from 'prop-types';
import messages from './messages';
import SortableHeader from './SortableHeader';
import TableActions from './TableActions';
import { getChangedRows } from './utils';
import CoursesChangesModal from './CoursesChangesModal';
import { updateUserRolesInCourses } from './data/api';
import {
  ACTIVE_COURSE_STATUS, INSTRUCTOR_ROLE, NULL_ROLE, STAFF_ROLE,
} from './constants';

export default function CoursesTable({
  username,
  email,
  userCourses,
  courseUpdateErrors,
  setCourseUpdateErrors,
  showErrorsModal,
  setApiErrors,
  isAlertDismissed,
  setIsAlertDismissed,
}) {
  const intl = useIntl();
  const saveButtonRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [submitButtonState, setSubmitButtonState] = useState('default');
  const handleCancel = () => {
    setShowModal(false);
  };

  let userCoursesData = userCourses;
  const [originalRowRoles] = useState(() => userCoursesData.reduce((acc, row) => {
    acc[row.course_id] = row.role == null ? NULL_ROLE : row.role;
    return acc;
  }, {}));

  const [originalCheckedRows] = useState(() => {
    const initial = {};
    userCoursesData.forEach((row) => {
      if (row.role === STAFF_ROLE || row.role === INSTRUCTOR_ROLE) {
        initial[row.course_id] = true;
      }
    });
    return initial;
  });

  const unsavedChangesRef = useRef({ newlyCheckedWithRole: [], uncheckedWithRole: [], roleChangedRows: [] });
  const hasUnsavedChangesRef = useRef(false);
  useEffect(() => {
    if (submitButtonState === 'pending') {
      updateUserRolesInCourses({
        userEmail: email,
        changedCourses: unsavedChangesRef.current,
        intl,
      }).then((response) => {
        // APIs already tested in api.test.js
        /* istanbul ignore next */
        if (response?.error) {
          setShowModal(false);
          setCourseUpdateErrors({
            email: '',
            username: '',
            success: true,
            errors: {
              newlyCheckedWithRoleErrors: [],
              uncheckedWithRoleErrors: [],
              roleChangedRowsErrors: [],
            },
          });
          setApiErrors(response);
        } else {
          setSubmitButtonState('complete');
          setTimeout(() => {
            setCourseUpdateErrors({
              username, email, success: true, errors: response,
            });
            setShowModal(false);
          }, 1000);
        }
      });
    }
  }, [submitButtonState]);

  // Change role null to 'null' for sorting to working correctly
  // As we are considering 'null' to appear as staff with disabled dropdown
  userCoursesData = userCoursesData.map((course) => ({
    ...course,
    role: course.role === null ? NULL_ROLE : course.role,
  }));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [org, setOrg] = useState('');
  const [tableState, setTableState] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sortBy, setSortBy] = useState([{
    id: 'course_name',
    desc: false,
  }]);
  // Track roles for each course row, keyed by course_id
  const [rowRoles, setRowRoles] = useState(() => userCoursesData.reduce((acc, row) => {
    acc[row.course_id] = row.role;
    return acc;
  }, {}));
  const searchInputRef = useRef(null);

  const sortedAndFilteredData = React.useMemo(() => {
    let data = userCoursesData.map((row) => ({
      ...row,
      role: rowRoles[row.course_id] !== undefined ? rowRoles[row.course_id] : NULL_ROLE,
    }));

    // Manual Filtering for all columns in single search box
    data = data.filter(
      (row) => ((row.course_name || '').toLowerCase().includes(search.toLowerCase())
          || (row.number || '').toLowerCase().includes(search.toLowerCase())
          || (row.run || '').toLowerCase().includes(search.toLowerCase())
      )
      && (status === '' || row.status === status)
      && (org === '' || row.org === org),
    );

    // Manual sorting
    if (sortBy.length > 0) {
      const { id, desc } = sortBy[0];

      const collator = new Intl.Collator(undefined, {
        numeric: true, // "test 5" < "test 15"
        sensitivity: 'base', // ignore case differences
      });
      data = [...data].sort((a, b) => {
        const aVal = a[id] === null || a[id] === undefined ? '' : String(a[id]);
        const bVal = b[id] === null || b[id] === undefined ? '' : String(b[id]);

        const comparison = collator.compare(aVal, bVal);
        return desc ? -comparison : comparison;
      });
    }

    return data;
  }, [search, status, org, sortBy]);

  const currentPageData = React.useMemo(() => {
    const startIndex = tableState.pageIndex * tableState.pageSize;
    const endIndex = startIndex + tableState.pageSize;
    return sortedAndFilteredData.slice(startIndex, endIndex);
  }, [sortedAndFilteredData, tableState.pageIndex, tableState.pageSize]);
  const previousButton = document.querySelector('button.previous.page-link[aria-label*="Previous, Page"]');
  const isLoading = currentPageData.length === 0 && previousButton && sortedAndFilteredData.length > 0;
  useEffect(() => {
    if (isLoading) {
      // There wasn't any other solution provided by manual pagination props
      // of DataTable to handle going back, if no record found after filteration
      // on a certain page. So, had to manually go back to previous page with some records.
      previousButton.click();
    }
  }, [currentPageData]);

  // Focus the search input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Custom checkbox selection state, keyed by course_id
  const [checkedRows, setCheckedRows] = useState(() => {
    const initial = {};
    userCoursesData.forEach((row) => {
      if (row.role === STAFF_ROLE || row.role === INSTRUCTOR_ROLE) {
        initial[row.course_id] = true;
      }
    });
    return initial;
  });

  const handleCheckboxChange = (courseId) => {
    setCheckedRows((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // Select all/clear all logic for header checkbox
  const headerCheckboxRef = useRef(null);
  const allRowIds = currentPageData.map((row) => row.course_id);
  const numChecked = allRowIds.filter((id) => checkedRows[id]).length;
  const allChecked = numChecked === allRowIds.length && allRowIds.length > 0;
  const someChecked = numChecked > 0 && numChecked < allRowIds.length;
  const [isSaveBtnEnabled, setIsSaveBtnEnabled] = useState(false);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someChecked && !allChecked;
      setIsAlertDismissed(false);
    }
  }, [
    org,
    someChecked,
    allChecked,
    numChecked,
    sortBy,
    rowRoles,
    isSaveBtnEnabled,
    showModal,
    submitButtonState,
    courseUpdateErrors,
    showErrorsModal,
    isAlertDismissed,
    tableState,
  ]);

  useEffect(() => {
    const changes = getChangedRows(checkedRows, originalCheckedRows, rowRoles, originalRowRoles, userCoursesData);
    hasUnsavedChangesRef.current = Object.values(changes).some(arr => arr.length > 0);
    setIsSaveBtnEnabled(hasUnsavedChangesRef.current);
    sessionStorage.setItem(`${username}hasUnsavedChanges`, hasUnsavedChangesRef.current);
    unsavedChangesRef.current = changes;
  }, [checkedRows, rowRoles]);

  const handleHeaderCheckboxChange = () => {
    setCheckedRows((prev) => {
      const updated = { ...prev };
      currentPageData.forEach((row) => {
        updated[row.course_id] = !allChecked;
      });
      return updated;
    });
  };

  // Generate unique orgs for org filterChoices
  const orgFilterChoices = Array.from(new Set(userCoursesData.map((row) => row.org)))
    .filter(Boolean)
    .map((organization) => ({ name: organization, value: organization }));

  const formatStatus = ({ value }) => (
    <Badge
      className="course-team-management-course-status-badge"
      variant={value === ACTIVE_COURSE_STATUS ? 'success' : 'light'}
    >
      {value === ACTIVE_COURSE_STATUS
        ? intl.formatMessage(messages.activeCoursesFilterLabel)
        : intl.formatMessage(messages.archivedCoursesFilterLabel)}
    </Badge>
  );

  const formatCourseName = ({ row }) => {
    const courseLink = row.original.course_url;
    const courseName = row.original.course_name;
    return (
      <a href={courseLink} target="_blank" rel="noopener noreferrer">
        {courseName}
      </a>
    );
  };

  const formatRole = ({ row }) => {
    const courseId = row.original.course_id;
    const value = rowRoles[courseId];
    // If role is 'null', default to staff for display only
    const displayValue = value === NULL_ROLE ? STAFF_ROLE : value;
    let title = intl.formatMessage(messages.statusStaffFilterLabelChoice);
    if (displayValue === INSTRUCTOR_ROLE) { title = intl.formatMessage(messages.statusAdminFilterLabelChoice); }
    // Enable dropdown if checkbox is checked, otherwise disable
    const isChecked = !!checkedRows[courseId];
    const isDisabled = !isChecked;
    return (
      <Dropdown>
        <Dropdown.Toggle
          as="button"
          className="course-team-management-role-col-dropdown"
          data-testid={`role-dropdown-${courseId}`}
          variant="outline-primary"
          disabled={isDisabled}
        >
          <span>{title}</span>
          <ArrowDropDown className="ml-2" />
        </Dropdown.Toggle>

        <Dropdown.Menu placement="top">
          <Dropdown.Item
            data-testid={`role-dropdown-item-staff-${courseId}`}
            eventKey={STAFF_ROLE}
            active={displayValue === STAFF_ROLE}
            onClick={() => setRowRoles((prev) => ({ ...prev, [courseId]: STAFF_ROLE }))}
          >
            {intl.formatMessage(messages.statusStaffFilterLabelChoice)}
          </Dropdown.Item>
          <Dropdown.Item
            data-testid={`role-dropdown-item-instructor-${courseId}`}
            eventKey={INSTRUCTOR_ROLE}
            active={displayValue === INSTRUCTOR_ROLE}
            onClick={() => setRowRoles((prev) => ({ ...prev, [courseId]: INSTRUCTOR_ROLE }))}
          >
            {intl.formatMessage(messages.statusAdminFilterLabelChoice)}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  // Custom filter UI for tableActions
  const tableActions = (
    <TableActions
      search={search}
      setSearch={setSearch}
      searchInputRef={searchInputRef}
      status={status}
      setStatus={setStatus}
      org={org}
      setOrg={setOrg}
      orgFilterChoices={orgFilterChoices}
      setRowRoles={setRowRoles}
      sortedAndFilteredData={sortedAndFilteredData}
      checkedRows={checkedRows}
      currentPageData={currentPageData}
      paginationState={tableState}
    />
  );
  // eslint-disable-next-line react/no-unstable-nested-components
  const CheckboxHeader = () => (
    <Form.Check
      ref={headerCheckboxRef}
      type="checkbox"
      checked={allChecked}
      onChange={handleHeaderCheckboxChange}
      aria-label="Select all rows"
      className="ml-2"
    />
  );
  // eslint-disable-next-line react/no-unstable-nested-components
  const CheckboxCell = ({ row }) => (
    <Form.Check
      type="checkbox"
      checked={!!checkedRows[row.original.course_id]}
      onChange={() => handleCheckboxChange(row.original.course_id)}
      aria-label={`Select row for ${row.original.course_name}`}
      className="ml-2"
    />
  );
  const sortableHeader = (id, label) => (
    <SortableHeader
      id={id}
      label={label}
      sortBy={sortBy}
      setSortBy={setSortBy}
    />
  );
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChangesRef.current) { return; }

      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="course-team-management-courses-table">
      <header className="course-team-management-courses-table-title">
        {intl.formatMessage(messages.courseAccessForUsernameTitle, {
          username,
        })}
      </header>{' '}
      {}
      <div className="course-team-management-courses-table-description">
        <p>{intl.formatMessage(messages.courseAccessDescription)}</p>
      </div>
      <DataTable
        isLoading={isLoading}
        isPaginated
        manualPagination
        state={tableState}
        onStateChange={setTableState}
        pageCount={Math.ceil(sortedAndFilteredData.length / tableState.pageSize)}
        isSortable
        manualSortBy
        manualFilters
        sortBy={sortBy}
        onSortByChange={setSortBy}
        isFilterable
        itemCount={sortedAndFilteredData.length}
        tableActions={[tableActions]}
        data={currentPageData}
        fetchData={setTableState}
        columns={[
          {
            Header: CheckboxHeader,
            accessor: 'checkbox',
            disableFilters: true,
            disableSortBy: true,
            id: 'checkbox',
            Cell: CheckboxCell,
          },
          {
            Header: sortableHeader('course_name', messages.tableHeaderNameLabel),
            accessor: 'course_name',
            id: 'course_name',
            Cell: formatCourseName,
            disableFilters: true,
          },
          {
            Header: sortableHeader('number', messages.tableHeaderNumberLabel),
            accessor: 'number',
            id: 'number',
            disableFilters: true,
          },
          {
            Header: sortableHeader('run', messages.tableHeaderRunLabel),
            accessor: 'run',
            id: 'run',
            disableFilters: true,
          },
          {
            Header: sortableHeader('status', messages.tableHeaderAllCoursesStatusLabel),
            accessor: 'status',
            id: 'status',
            Cell: formatStatus,
            disableFilters: true,
          },
          {
            Header: sortableHeader('role', messages.tableHeaderRoleLabel),
            accessor: 'role',
            id: 'role',
            Cell: formatRole,
            disableFilters: true,
          },
        ]}
        /* istanbul ignore next */
        getRowId={(row) => row.course_id}
      >
        <DataTable.TableControlBar />
        <div className="course-team-table-content-size">
          {sortedAndFilteredData.length > 0 && <DataTable.Table />}
          {sortedAndFilteredData.length === 0 && (
            <div className="pgn__data-table-empty">{intl.formatMessage(messages.noResultsFoundForTable)}</div>
          )}
        </div>
        {sortedAndFilteredData.length > 0 && <DataTable.TableFooter />}
      </DataTable>
      <div className="py-4 my-2 d-flex justify-content-end align-items-center">
        <Button
          onClick={() => setShowModal(true)}
          disabled={!isSaveBtnEnabled}
          variant="danger"
          className="save-changes-btn"
          data-testid="save-course-changes"
        >
          {intl.formatMessage(messages.saveButtonLabel)}
        </Button>
      </div>
      <CoursesChangesModal
        changedData={unsavedChangesRef.current}
        isOpen={showModal}
        onConfirm={setSubmitButtonState}
        submitButtonState={submitButtonState}
        onCancel={handleCancel}
        username={username}
        email={email}
        positionRef={saveButtonRef}
      />
    </div>
  );
}

CoursesTable.propTypes = {
  username: PropTypes.string,
  email: PropTypes.string,
  userCourses: PropTypes.shape({
    course_id: PropTypes.string,
    course_name: PropTypes.string,
    course_url: PropTypes.string,
    role: PropTypes.string,
    status: PropTypes.string,
    org: PropTypes.string,
    number: PropTypes.string,
    run: PropTypes.string,
  }).isRequired,
  courseUpdateErrors: PropTypes.shape({
    email: PropTypes.string,
    username: PropTypes.string,
    success: PropTypes.bool,
    errors: PropTypes.shape({
      newlyCheckedWithRoleErrors: PropTypes.shape({
        runId: PropTypes.string,
        role: PropTypes.string,
        courseName: PropTypes.string,
        number: PropTypes.string,
        courseId: PropTypes.string,
        error: PropTypes.string,
      }),
      uncheckedWithRoleErrors: PropTypes.shape({
        runId: PropTypes.string,
        role: PropTypes.string,
        courseName: PropTypes.string,
        number: PropTypes.string,
        courseId: PropTypes.string,
        error: PropTypes.string,
      }),
      roleChangedRowsErrors: PropTypes.shape({
        runId: PropTypes.string,
        from: PropTypes.string,
        to: PropTypes.string,
        courseName: PropTypes.string,
        number: PropTypes.string,
        courseId: PropTypes.string,
        error: PropTypes.string,
      }),
    }),
  }),
  setCourseUpdateErrors: PropTypes.func.isRequired,
  setApiErrors: PropTypes.func.isRequired,
  row: PropTypes.shape({
    run: PropTypes.string.isRequired,
    course_id: PropTypes.string.isRequired,
    original: PropTypes.shape({
      run: PropTypes.string.isRequired,
      course_name: PropTypes.string.isRequired,
      course_id: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  showErrorsModal: PropTypes.bool,
  isAlertDismissed: PropTypes.bool,
  setIsAlertDismissed: PropTypes.func,
};

CoursesTable.defaultProps = {
  username: '',
  email: '',
};
