import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

/**
 * The control bar above each table: filters left, row count right. Reproduces
 * CourseTeamManagement's `TableActions` and reuses its already-global
 * `custom-table-*` classes; `.course-bulk-unenroll-table` hides Paragon's own bar so
 * this element owns it. The count is passed in, not derived — two of the three
 * tables are server-paginated, so only the caller knows the real total.
 */
export default function TableActions({
  children, pageIndex, pageSize, totalItems,
}) {
  const intl = useIntl();

  const startItemIndex = totalItems === 0 ? 0 : (pageIndex * pageSize) + 1;
  const endItemIndex = Math.min(startItemIndex + pageSize - 1, totalItems);

  return (
    <div className="custom-table-actions-container">
      <div className="custom-table-filter-actions">
        {children}
      </div>

      <div className="pgn__data-table-footer custom-table-data-actions">
        <p data-testid="bulk-unenroll-table-count">
          {intl.formatMessage(messages.tableNoOfEntriesShowingLabel, {
            startItemIndex,
            endItemIndex,
            totalFilteredItems: totalItems,
          })}
        </p>
      </div>
    </div>
  );
}

TableActions.propTypes = {
  children: PropTypes.node,
  pageIndex: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
};

TableActions.defaultProps = {
  children: null,
};
