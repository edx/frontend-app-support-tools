const UserSummaryData = {
  userData: {
    name: 'edx',
    username: 'edx',
    email: 'edx@example.com',
    id: 1,
    isActive: true,
    country: 'US',
    dateJoined: null,
    lastLogin: null,
    passwordStatus: {
      passwordToggleHistory: [
        {
          created: Date().toLocaleString(),
          comment: 'Test Disabled',
          disabled: false,
          createdBy: 'staff',
        },
        {
          created: Date().toLocaleString(),
          comment: 'Test Enable',
          disabled: true,
          createdBy: 'staff',
        }],
      status: 'Usable',
    },
  },
  changeHandler: jest.fn(() => {}),
};

export default UserSummaryData;
