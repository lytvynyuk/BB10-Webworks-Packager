var bbwp = "/Users/nukulb/github-reviews/bbwp-post-ext/bbwp",
    input = __dirname + "/../data/input",
    childProcess = require("child_process"),
    wrench = require("wrench"),
    output = __dirname + "/../data/output",
    path = require("path"),
    cliTest,
    flag,
    child;

var CLITest = function (face) {
    var cli = face,
    option = [];

    this.addOption = function (name, value) {
        option.push(name + " " + (value || ""));
    };
    this.run = function (done) {
        var cmd = option.reduce(function (previousValue, currentValue, index, array) {
            return (index === 0 ? "" : " ") + previousValue + " " + currentValue;
        }, cli);
        console.log(cmd);
        childProcess.exec(cmd, function (error, stdout, stderr) {
            console.log(stderr);
            console.log(stdout);
            done();
        });
    };
};

var DeployTest = function () {
    var listeners = [];
    function _exec(cmdExpr) {
        console.log(cmdExpr);
        var proc = childProcess.exec(cmdExpr, function (error, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
        });

    }

    this.startServer = function () {
        child = childProcess.fork(__dirname + "/server.js");
        child.on('message', function (data) {
            console.log('The child says: ', data);
            if (data.msg === "Response Received") {
                listeners.forEach(function (listener) {
                    listener.apply(null, [data.msg, data.status]);
                });
            }
        });
        child.send({method: "start"});
    };

    this.deploy = function (barFile) {
         _exec("blackberry-deploy -installApp -launchApp " + "-package " +  barFile + " -device " + "169.254.0.1" + " -password " + "qaqa");
    };

    this.listen = function (done, scope) {
        listeners.push(done);
    };

    this.stopListening = function (done) {
        var index = listeners.indexOf(done);
        listeners.splice(index, 1);
    };
};

/**
 * Start automating all of Igor's tests.
 *
*/
describe("bbwp", function () {
    beforeEach(function () {
        cliTest = new CLITest(bbwp);
        flag = false;
        wrench.rmdirSyncRecursive(output, true);
        wrench.mkdirSyncRecursive(output, "0755");
    });

    afterEach(function () {
        wrench.rmdirSyncRecursive(output, true);
        wrench.mkdirSyncRecursive(output, "0755");
    });

    xit("correctly packages bar", function () {
        cliTest.addOption(input + "/Archive.zip");
        cliTest.addOption("-o", output);
        cliTest.run(function () {
            flag = true;
        });

        waitsFor(function () {
            return flag;
        }, "Something", 100000);

        runs(function () {
            var x = path.existsSync(output + "/device/Archive.bar");
            expect(x).toBe(true);
            x = path.existsSync(output + "/simulator/Archive.bar");
            expect(x).toBe(true);
        });
    });

    xit("correctly packages bar in debug mode", function () {
        cliTest.addOption(input + "/Archive.zip");
        cliTest.addOption("-d");
        cliTest.addOption("-o", output);
        cliTest.run(function () {
            flag = true;
        });

        waitsFor(function () {
            return flag;
        }, "Something", 100000);

        runs(function () {
            var x = path.existsSync(output + "/device/Archive.bar");
            expect(x).toBe(true);
            x = path.existsSync(output + "/simulator/Archive.bar");
            expect(x).toBe(true);
        });
    });

    it("correctly packages bar and deploys it", function () {
        cliTest.addOption(input + "/Archive2.zip");
        cliTest.addOption("-d");
        cliTest.addOption("-o", output);
        cliTest.run(function () {
            flag = true;
        });

        waitsFor(function () {
            return flag;
        }, "Something", 100000);

        runs(function () {
            var reqStatus = false,
            flag = false;
            runs(function () {
                var dt = new DeployTest();
                dt.listen(function (msg, status) {
                    console.log("Listener called with ", msg, status);
                    reqStatus = status;
                    flag = true;
                });
                dt.startServer();
                dt.deploy(output + "/device/Archive2.bar");
            });
            waitsFor(function () {
                return flag;
            }, "Something", 100000);

            runs(function () {
                child.send({method: "stop"});
                console.log(reqStatus);
                expect(reqStatus).toEqual('success');
                console.log("Test Ended");
            });
        });

    });
});
