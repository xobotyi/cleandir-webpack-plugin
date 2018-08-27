const path = require("path");

module.exports = {
    verbose:              true,
    bail:                 true,
    testEnvironment:      "node",
    moduleFileExtensions: [
        "js",
    ],
    collectCoverageFrom:  [
        'cleandir-webpack-plugin.js',
    ],
    coverageDirectory:    path.join(__dirname, 'coverage'),
};
