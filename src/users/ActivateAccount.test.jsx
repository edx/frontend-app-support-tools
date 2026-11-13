import { mount } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import * as api from './data/api';
import ActivateAccount from './ActivateAccount';

describe('Activate Account Component Tests', () => {
  let wrapper;
  let changeHandler;

  beforeEach(() => {
    changeHandler = jest.fn();
    wrapper = mount(<ActivateAccount username="unconfirmed_learner" changeHandler={changeHandler} />);
  });

  afterEach(() => {
    wrapper.unmount();
    jest.restoreAllMocks();
  });

  const openModal = () => {
    wrapper.find('button#activate-account').simulate('click');
    wrapper.update();
  };

  it('opens a confirmation dialog without calling the API', () => {
    const apiCall = jest.spyOn(api, 'postActivateAccount');
    expect(wrapper.find('ModalDialog#activate-account-modal').prop('isOpen')).toEqual(false);
    openModal();
    expect(wrapper.find('ModalDialog#activate-account-modal').prop('isOpen')).toEqual(true);
    expect(wrapper.find('ModalDialog#activate-account-modal').text()).toContain('unconfirmed_learner');
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('activates the account and refreshes the user on confirm', async () => {
    const apiCall = jest.spyOn(api, 'postActivateAccount').mockImplementationOnce(
      () => Promise.resolve({ is_active: true, already_active: false }),
    );
    openModal();
    wrapper.find('button#activate-account-confirm').simulate('click');
    await waitFor(() => expect(changeHandler).toHaveBeenCalledTimes(1));
    expect(apiCall).toHaveBeenCalledWith('unconfirmed_learner');
    wrapper.update();
    expect(wrapper.find('ModalDialog#activate-account-modal').prop('isOpen')).toEqual(false);
  });

  it('shows an error and keeps the dialog open when activation fails', async () => {
    jest.spyOn(api, 'postActivateAccount').mockImplementationOnce(() => Promise.reject(new Error('403')));
    openModal();
    wrapper.find('button#activate-account-confirm').simulate('click');
    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('#activate-account-error').exists()).toBeTruthy();
    });
    expect(changeHandler).not.toHaveBeenCalled();
    expect(wrapper.find('ModalDialog#activate-account-modal').prop('isOpen')).toEqual(true);
  });
});
