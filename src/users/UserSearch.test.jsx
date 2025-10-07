import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import UserSearch from './UserSearch';

describe('User Search Page', () => {
  let props;

  // helper function to render with IntlProvider
  const renderWithIntl = (ui) => render(
    <IntlProvider locale="en">{ui}</IntlProvider>,
  );

  beforeEach(() => {
    props = { userIdentifier: '', searchHandler: jest.fn() };
  });

  describe('renders correctly', () => {
    it('with correct user identifier', () => {
      renderWithIntl(<UserSearch {...props} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue(props.userIdentifier);
    });

    it('with correct default user identifier', () => {
      delete props.userIdentifier;
      renderWithIntl(<UserSearch {...props} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('with submit button', () => {
      renderWithIntl(<UserSearch {...props} />);
      const button = screen.getByRole('button', { name: /search/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Search');
    });

    it('when submit button is clicked', () => {
      const searchProps = { userIdentifier: 'staff', searchHandler: jest.fn() };
      renderWithIntl(<UserSearch {...searchProps} />);

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      expect(searchProps.searchHandler).toHaveBeenCalledWith(
        searchProps.userIdentifier,
      );
    });

    it('matches snapshot', () => {
      const { asFragment } = renderWithIntl(<UserSearch {...props} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });
});
