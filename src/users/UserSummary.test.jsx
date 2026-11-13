import { mount } from 'enzyme';
import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import * as api from './data/api';
import UserSummary from './UserSummary';
import UserSummaryData from './data/test/userSummary';
import UserMessagesProvider from '../userMessages/UserMessagesProvider';
import enrollmentsData from './data/test/enrollments';
import OnboardingStatusData from './data/test/onboardingStatus';
import enterpriseCustomerUsersData from './data/test/enterpriseCustomerUsers';
import verifiedNameHistoryData from './data/test/verifiedNameHistory';

const UserSummaryWrapper = (props) => (
  <IntlProvider locale="en">
    <UserMessagesProvider>
      <UserSummary {...props} />
    </UserMessagesProvider>
  </IntlProvider>
);

describe('User Summary Component Tests', () => {
  let wrapper;

  const mountUserSummaryWrapper = async (data) => {
    jest.spyOn(api, 'getVerifiedNameHistory').mockImplementationOnce(() => Promise.resolve(verifiedNameHistoryData));
    jest.spyOn(api, 'getEnrollments').mockImplementationOnce(() => Promise.resolve(enrollmentsData));
    jest.spyOn(api, 'getOnboardingStatus').mockImplementationOnce(() => Promise.resolve(OnboardingStatusData));
    jest.spyOn(api, 'getEnterpriseCustomerUsers').mockImplementationOnce(() => Promise.resolve(enterpriseCustomerUsersData));
    wrapper = mount(<UserSummaryWrapper {...data} />);
  };

  beforeEach(() => {
    mountUserSummaryWrapper(UserSummaryData);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  describe('Default Correct Data Values', () => {
    it('User Data Values', () => {
      const ComponentUserData = wrapper.prop('userData');
      const ExpectedUserData = UserSummaryData.userData;
      Object.keys(ComponentUserData).forEach(key => {
        expect(ComponentUserData[key]).not.toEqual(undefined);
        expect(ExpectedUserData[key]).not.toEqual(undefined);
        expect(ComponentUserData[key]).toEqual(ExpectedUserData[key]);
      });
    });

    it('Data Table Render', () => {
      const dataTable = wrapper.find('#account-table table tr');
      const expectedData = [
        {
          header: 'Full Name',
          value: 'edx',
        },
        {
          header: 'Verified Name',
          value: '',
        },
        {
          header: 'Username',
          value: 'edx',
        },
        {
          header: 'LMS User ID',
          value: '1',
        },
        {
          header: 'Email',
          value: 'edx@example.com',
        },
        {
          header: 'Confirmed',
          value: 'yes',
        },
        {
          header: 'Country',
          value: 'US',
        },
        {
          header: 'Join Date/Time',
          value: 'N/A',
        },
        {
          header: 'Last Login',
          value: 'N/A',
        },
        {
          header: 'Password Status',
          value: 'Usable',
        },
      ];
      expectedData.forEach((item, index) => {
        expect(dataTable.at(index).find('th').text()).toEqual(item.header);
        expect(dataTable.at(index).find('td').text()).toEqual(item.value);
      });
    });

    it('Account Actions', () => {
      const actionsContainer = wrapper.find('div#account-actions');

      expect(actionsContainer.find('h3').text()).toEqual('Account Actions');
      expect(actionsContainer.find('button#toggle-password').text()).toEqual('Disable User');
      expect(actionsContainer.find('button#reset-password').text()).toEqual('Reset Password');
      expect(actionsContainer.find('button#toggle-password-history').text()).toEqual('Show History');
    });
  });

  describe('Account Confirmation Field', () => {
    const getConfirmationRow = (data) => {
      mountUserSummaryWrapper(data);
      const dataTable = wrapper.find('#account-table table');
      const row = dataTable.find('tbody tr').at(5);
      return { rowName: row.find('th').at(0), rowValue: row.find('td').at(0) };
    };

    it('shows "yes" and no activate button for a confirmed account', () => {
      const { rowName, rowValue } = getConfirmationRow(UserSummaryData);
      expect(rowName.text()).toEqual('Confirmed');
      expect(rowValue.text()).toEqual('yes');
      expect(rowValue.find('button#activate-account').exists()).toBeFalsy();
    });

    it('shows "No" and an Activate account button for an unconfirmed account', () => {
      const unconfirmed = { ...UserSummaryData, userData: { ...UserSummaryData.userData, isActive: false } };
      const { rowName, rowValue } = getConfirmationRow(unconfirmed);
      expect(rowName.text()).toEqual('Confirmed');
      expect(rowValue.text()).toContain('No');
      expect(rowValue.find('button#activate-account').text()).toEqual('Activate account');
      // No activation link or key is rendered anywhere.
      expect(rowValue.find('a').exists()).toBeFalsy();
    });
  });
});
