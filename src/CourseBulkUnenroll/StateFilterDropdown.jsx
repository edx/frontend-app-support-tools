import PropTypes from 'prop-types';
import { Dropdown, Icon } from '@openedx/paragon';
import { ArrowDropDown, Check } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

/**
 * The status filter used by all three bulk-unenroll tables, mirroring
 * CourseTeamManagement's status dropdown.
 *
 * Composed from `Dropdown` + `Dropdown.Toggle` rather than `DropdownButton` for one
 * reason: `DropdownButton` forwards stray props to its wrapper `div`, so a
 * `data-testid` never reaches the button and cannot be clicked.
 *
 * Options are `{value, label}` pairs. A value may name several API states at once
 * (`"pending,running"`) — the filter answers an operator's question, which does not
 * always map to one row of the data model.
 */
export default function StateFilterDropdown({
  id, value, onChange, options, testId,
}) {
  const intl = useIntl();
  const active = options.find((option) => option.value === value) ?? options[0];

  return (
    <Dropdown className="ml-2" onSelect={onChange}>
      <Dropdown.Toggle
        id={id}
        data-testid={testId}
        variant="outline-primary"
      >
        <span className="d-flex align-items-center">
          {intl.formatMessage(active.label)}
          <Icon className="ml-2" src={ArrowDropDown} />
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {options.map((option) => (
          <Dropdown.Item
            key={option.value || 'all'}
            eventKey={option.value}
            active={value === option.value}
            data-testid={`${testId}-item-${option.value || 'all'}`}
            className="d-flex justify-content-between align-items-center"
          >
            {intl.formatMessage(option.label)}
            {value === option.value && <Icon src={Check} size="sm" />}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

StateFilterDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  })).isRequired,
  testId: PropTypes.string.isRequired,
};
