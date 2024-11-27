module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/Tests/**/*.test.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
};