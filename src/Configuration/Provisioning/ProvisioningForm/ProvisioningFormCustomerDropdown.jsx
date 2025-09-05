import {
  Form,
} from '@openedx/paragon';
import {
  useEffect, useMemo, useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';
import PROVISIONING_PAGE_TEXT from '../data/constants';
import { selectProvisioningContext } from '../data/utils';
import useProvisioningContext from '../data/hooks';
import ProvisioningFormHelpText from './ProvisioningFormHelpText';

const { ENTERPRISE_UUID } = PROVISIONING_PAGE_TEXT.FORM.CUSTOMER;

const generateDropdownValue = (customer) => {
  if (customer === ENTERPRISE_UUID.DROPDOWN_DEFAULT) {
    return { option: ENTERPRISE_UUID.DROPDOWN_DEFAULT };
  }
  return {
    uuid: customer.id,
    option: `${customer.name} --- ${customer.id}`,
  };
};

const generateAutosuggestOption = (dropDownValue) => (
  <Form.AutosuggestOption id={dropDownValue.uuid || uuidv4()}>
    {dropDownValue.option}
  </Form.AutosuggestOption>
);

const ProvisioningFormCustomerDropdown = () => {
  const [formData, customers, showInvalidField] = selectProvisioningContext('formData', 'customers', 'showInvalidField');
  const { subsidy } = showInvalidField;
  const isEnterpriseUuidDefinedAndFalse = subsidy?.enterpriseUUID === false;
  const { setCustomerUUID, getCustomers, setInvalidSubsidyFields } = useProvisioningContext();
  const [selected, setSelected] = useState({ title: '' });
  const [dropdownValues, setDropdownValues] = useState([generateDropdownValue(ENTERPRISE_UUID.DROPDOWN_DEFAULT)]);
  const debouncedSearch = useMemo(() => debounce(getCustomers, 500, {
    leading: false,
  }), [getCustomers]);
  const handleOnSelected = (value) => {
    if (value && value.selectionId) {
      setCustomerUUID(value.selectionId);
      setInvalidSubsidyFields({ ...subsidy, enterpriseUUID: true });
    }
    setSelected(value);
  };
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      debouncedSearch(formData.enterpriseUUID);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.enterpriseUUID, debouncedSearch]);
  useEffect(() => {
    if (customers.length > 0) {
      const options = customers.map(generateDropdownValue);
      setDropdownValues(options);
    }
  }, [customers]);
  return (
    <Form.Group>
      <Form.Autosuggest
        floatingLabel={ENTERPRISE_UUID.TITLE}
        value={selected}
        onChange={handleOnSelected}
        helpMessage={ENTERPRISE_UUID.SUB_TITLE}
        errorMessageText={ENTERPRISE_UUID.ERROR.selected}
        data-testid="customer-uuid"
        isInvalid={isEnterpriseUuidDefinedAndFalse}
      >
        {dropdownValues.map(generateAutosuggestOption)}
      </Form.Autosuggest>
      <ProvisioningFormHelpText className="my-n3" />
      {isEnterpriseUuidDefinedAndFalse && (
        <Form.Control.Feedback
          type="invalid"
        >
          {ENTERPRISE_UUID.ERROR.invalid}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default ProvisioningFormCustomerDropdown;
