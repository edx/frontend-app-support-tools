const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('jest', {
  setupFiles: ['<rootDir>/src/setupTest.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{js,jsx}'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/setupTest.js',
    'src/i18n',
    'src/users/v2/UserPage.jsx',
    'src/supportHeader/ToggleVersion.jsx',
  ],
});

// @openedx/frontend-build's default transformIgnorePatterns only covers
// @edx and @openedx scoped packages. Add @2uinc so Jest will transpile
// those modules too.
config.transformIgnorePatterns = ['node_modules/(?!@(open)?edx|@2uinc)'];

module.exports = config;
