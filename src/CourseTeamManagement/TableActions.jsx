import {
  Dropdown,
  DropdownButton,
  Form,
  Icon,
} from '@openedx/paragon';
import { Check, Search, ArrowDropDown } from '@openedx/paragon/icons';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';

import OrgDropdownWithSearch from './OrgDropdownWithSearch';
import messages from './messages';
import {
  ACTIVE_COURSE_STATUS,
  ARCHIVED_COURSE_STATUS,
  COURSE_STATUS_DROPDOWN_OPTIONS,
  INSTRUCTOR_ROLE,
  ROLE_DROPDOWN_OPTIONS,
  STAFF_ROLE,
} from './constants';

const TableActions = ({
  search,
  setSearch,
  searchInputRef,
  status,
  setStatus,
  org,
  setOrg,
  orgFilterChoices,
  setRowRoles,
  sortedAndFilteredData,
  checkedRows,
  currentPageData,
  paginationState,
}) => {
  const intl = useIntl();
  let statusLabelMessage = messages.allCoursesFilterLabel;
  if (status === ACTIVE_COURSE_STATUS) {
    statusLabelMessage = messages.activeCoursesFilterLabel;
  } else if (status === ARCHIVED_COURSE_STATUS) {
    statusLabelMessage = messages.archivedCoursesFilterLabel;
  }

  const { pageIndex, pageSize } = paginationState;
  const totalFilteredItems = sortedAndFilteredData.length;

  const startItemIndex = totalFilteredItems === 0 ? 0 : (pageIndex * pageSize) + 1;
  const endItemIndex = Math.min(startItemIndex + pageSize - 1, totalFilteredItems);

  return (
    <div className="custom-table-actions-container">
      <div className="custom-table-filter-actions">
        <Form.Control
          ref={searchInputRef}
          type="text"
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          trailingElement={<Icon src={Search} />}
        />
        <DropdownButton
          id="status-dropdown"
          title={
            (
              <span className="d-flex align-items-center">
                {intl.formatMessage(statusLabelMessage)}
                <Icon className="ml-2" src={ArrowDropDown} />
              </span>
            )
          }
          onSelect={(eventKey) => setStatus(eventKey)}
          className="ml-2"
          variant="outline-primary"
        >
          {COURSE_STATUS_DROPDOWN_OPTIONS.map((option) => (
            <Dropdown.Item
              data-testid={`status-dropdown-item-${option.value}`}
              key={option.value}
              eventKey={option.value}
              className="d-flex justify-content-between align-items-center"
            >
              {intl.formatMessage(option.label)}
              {status === option.value && <Icon src={Check} size="sm" />}
            </Dropdown.Item>
          ))}
        </DropdownButton>

        <OrgDropdownWithSearch
          org={org}
          setOrg={setOrg}
          orgFilterChoices={orgFilterChoices}
        />

        <DropdownButton
          id="role-dropdown"
          title={
            (
              <span className="d-flex align-items-center">
                {intl.formatMessage(messages.statusActionsFilterLabel)}
                <Icon className="ml-2" src={ArrowDropDown} />
              </span>
            )
          }
          onSelect={(eventKey) => {
            if (eventKey === STAFF_ROLE || eventKey === INSTRUCTOR_ROLE) {
              const filteredCourseIds = new Set(currentPageData.map((row) => row.course_id));
              setRowRoles((prev) => {
                const updated = { ...prev };
                Object.keys(checkedRows).forEach((courseId) => {
                  if (checkedRows[courseId] && filteredCourseIds.has(courseId)) {
                    updated[courseId] = eventKey;
                  }
                });
                return updated;
              });
            }
          }}
          className="ml-2"
          variant="outline-primary"
        >
          {ROLE_DROPDOWN_OPTIONS.map((option) => (
            <Dropdown.Item key={option.value} eventKey={option.value}>
              {intl.formatMessage(option.label)}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      </div>

      <div className="pgn__data-table-footer custom-table-data-actions">
        <p>
          {
            intl.formatMessage(
              messages.tableNoOfEntriesShowingLabel,
              {
                startItemIndex,
                endItemIndex,
                totalFilteredItems,
              },
            )
          }
        </p>
      </div>
    </div>
  );
};

export default TableActions;

TableActions.propTypes = {
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,
  searchInputRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  status: PropTypes.string.isRequired,
  setStatus: PropTypes.func.isRequired,
  org: PropTypes.string.isRequired,
  setOrg: PropTypes.func.isRequired,
  orgFilterChoices: PropTypes.arrayOf(PropTypes.string).isRequired,
  setRowRoles: PropTypes.func.isRequired,
  sortedAndFilteredData: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string.isRequired,
  })).isRequired,
  checkedRows: PropTypes.objectOf(PropTypes.bool).isRequired,
  currentPageData: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string.isRequired,
  })).isRequired,
  paginationState: PropTypes.shape({
    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
  }).isRequired,
};
