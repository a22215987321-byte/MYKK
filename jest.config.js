const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
};

module.exports = createJestConfig(customJestConfig);
