const os = require("os");
const tests = require("./tests");

module.exports = function run() {
    const origOsPlatform = os.platform;

    beforeEach(() => {
        os.platform = () => {return "win32";};
    });

    afterEach(() => {
        os.platform = origOsPlatform;
    });

    tests.bind(this)();
};
