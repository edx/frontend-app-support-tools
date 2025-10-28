import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import * as api from './data/api';
import CoursesTable from './CoursesTable';

const renderWithIntl = (ui, props = {}) => render(
  <IntlProvider locale="en" messages={{}}>
    {ui}
  </IntlProvider>,
  props,
);

const sampleCourses = [
  {
    course_name: 'Test Course A',
    number: 'CS101',
    run: 'run1',
    status: 'active',
    role: 'staff',
    org: 'edx',
    course_url: 'https://example.com/course-a',
    course_id: 'courseId1',
  },
  {
    course_name: 'Test Course B',
    number: 'CS102',
    run: 'run2',
    status: 'archived',
    role: 'instructor',
    org: 'mitx',
    course_url: 'https://example.com/course-b',
    course_id: 'courseId2',
  },
];

const defaultProps = {
  username: 'testuser',
  userCourses: sampleCourses,
  setCourseUpdateErrors: jest.fn(),
  setApiErrors: jest.fn(),
  isAlertDismissed: false,
  setIsAlertDismissed: jest.fn(),
  showErrorsModal: false,
};

describe('CoursesTable (RTL)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the table with course rows', () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      expect(screen.getByText('Test Course A')).toBeInTheDocument();
      expect(screen.getByText('Test Course B')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    });

    it('shows empty state when no matching results', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const searchBox = screen.getByRole('textbox');
      await userEvent.type(searchBox, 'non-existent');
      expect(await screen.findByText(/No results/i)).toBeInTheDocument();
    });
  });

  describe('Checkbox Selection', () => {
    it('toggles row checkbox', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).toBeChecked();
      await userEvent.click(checkboxes[1]);
      expect(checkboxes[1]).not.toBeChecked();
    });

    it('checks/unchecks all via header checkbox', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      let checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);
      checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(1).forEach((cb) => expect(cb).not.toBeChecked());

      await userEvent.click(checkboxes[0]);
      checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(1).forEach((cb) => expect(cb).toBeChecked());
    });
  });

  describe('Role Dropdown', () => {
    it('changes role to Staff', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const toggle = screen.getByTestId('role-dropdown-courseId1');
      await userEvent.click(toggle);
      const staffItem = screen.getByTestId('role-dropdown-item-staff-courseId1');
      await userEvent.click(staffItem);
      expect(screen.getByText(/Staff/i)).toBeInTheDocument();
    });

    it('changes role to Admin (Instructor)', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const toggle = screen.getByTestId('role-dropdown-courseId1');
      await userEvent.click(toggle);
      const adminItem = screen.getByTestId('role-dropdown-item-instructor-courseId1');
      await userEvent.click(adminItem);
      const adminLabels = screen.getAllByText(/Admin/i);
      expect(adminLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Status Dropdown', () => {
    it('filters active and archived courses', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const dropdown = screen.getByRole('button', { name: /All Courses/i });
      await userEvent.click(dropdown);

      const activeOption = screen.getByTestId('status-dropdown-item-active');
      await userEvent.click(activeOption);
      expect(screen.getByText('Test Course A')).toBeInTheDocument();
      expect(screen.queryByText('Test Course B')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button', { name: /Active/i });
      await userEvent.click(buttons[0]);

      const archivedOption = screen.getByTestId('status-dropdown-item-archived');
      await userEvent.click(archivedOption);
      expect(screen.getByText('Test Course B')).toBeInTheDocument();
      expect(screen.queryByText('Test Course A')).not.toBeInTheDocument();
    });
  });

  describe('Org Dropdown', () => {
    it('filters by organization', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const toggle = screen.getByTestId('org-dropdown-toggle');
      await userEvent.click(toggle);
      const mitxOption = screen.getByTestId('org-dropdown-option-mitx');
      await userEvent.click(mitxOption);
      expect(screen.getByText('Test Course B')).toBeInTheDocument();
      expect(screen.queryByText('Test Course A')).not.toBeInTheDocument();
    });

    it('shows all orgs when cleared', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const toggle = screen.getByTestId('org-dropdown-toggle');
      await userEvent.click(toggle);
      await userEvent.click(screen.getByTestId('org-dropdown-option-mitx'));
      await userEvent.click(toggle);
      await userEvent.click(screen.getByTestId('org-dropdown-option-all'));
      expect(screen.getByText('Test Course A')).toBeInTheDocument();
      expect(screen.getByText('Test Course B')).toBeInTheDocument();
    });

    it('shows "No results found" for nonexistent org search', async () => {
      renderWithIntl(<CoursesTable {...defaultProps} />);
      const toggle = screen.getByTestId('org-dropdown-toggle');
      await userEvent.click(toggle);
      const searchBoxes = screen.getAllByPlaceholderText('Search');
      const orgSearchBox = searchBoxes[1];
      await userEvent.type(orgSearchBox, 'nonexistent');
      expect(await screen.findByText(/No results/i)).toBeInTheDocument();
    });
  });

  describe('Save Workflow', () => {
    const mockCourses = [
      ...sampleCourses,
      {
        course_name: 'Extra Course',
        number: 'CS103',
        run: 'run3',
        status: 'active',
        org: 'harvard',
        role: null,
        course_url: 'https://example.com/course-c',
        course_id: 'courseId3',
      },
    ];

    const saveProps = { ...defaultProps, userCourses: mockCourses, email: 'test@test.com' };

    beforeEach(() => {
      jest.spyOn(api, 'updateUserRolesInCourses').mockResolvedValue([]);
    });

    it('adds beforeunload listener when unsaved changes exist', () => {
      renderWithIntl(<CoursesTable {...saveProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      const event = new Event('beforeunload');
      Object.defineProperty(event, 'returnValue', { writable: true });
      window.dispatchEvent(event);
      expect(event.returnValue).toBe('');
    });
  });
});
