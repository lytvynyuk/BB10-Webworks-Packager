var srcPath = __dirname + "/../../../lib/",
    path = require("path"),
    fs = require("fs"),
    wrench = require("wrench"),
    logger = require(srcPath + "logger"),
    fileMgr = require(srcPath + "file-manager"),
    testData = require("./test-data"),
    session = testData.session;

describe("File manager", function () {
    beforeEach(function () {
        var wweDir = path.resolve("dependencies/simulator-wwe");

        if (!path.existsSync(wweDir)) {
            wrench.mkdirSyncRecursive(wweDir, "0755");
        }

        if (!path.existsSync(path.normalize(wweDir + "/wwe"))) {
            fs.writeFileSync(path.normalize(wweDir + "/wwe"), "");
        }
    });

    it("prepareOutputFiles() should copy files and unzip archive", function () {
        fileMgr.prepareOutputFiles(session, []);

        expect(path.existsSync(session.sourcePaths.CHROME)).toBeTruthy();
        expect(path.existsSync(session.sourcePaths.LIB)).toBeTruthy();
    });

    it("copyWWE() should copy wwe of the specified target", function () {
        fileMgr.copyWWE(session, "simulator");

        expect(path.existsSync(path.normalize(session.sourceDir + "/wwe"))).toBeTruthy();
    });

    it("generateFrameworkModulesJS() should create frameworkModules.js", function () {
        var data, modulesArr;

        fileMgr.generateFrameworkModulesJS(session);

        expect(path.existsSync(session.sourcePaths.CHROME + "/frameworkModules.js")).toBeTruthy();

        data = fs.readFileSync(session.sourcePaths.CHROME + "/frameworkModules.js");
        modulesArr = JSON.parse(data.toString().replace("var frameworkModules =", "").replace(";", ""));

        expect(modulesArr.indexOf('lib/framework.js') >= 0).toBeTruthy();
        expect(modulesArr.indexOf('lib/config/user.js') >= 0).toBeTruthy();
        expect(modulesArr.indexOf('lib/plugins/bridge.js') >= 0).toBeTruthy();
        expect(modulesArr.indexOf('lib/policy/whitelist.js') >= 0).toBeTruthy();

        modulesArr.forEach(function (module) {
            expect(module.match(/^lib/)).toBeTruthy();
        });
    });

    it("unzip() should extract 'from' zip file to 'to' directory", function () {
        var from = session.archivePath,
            to = session.sourceDir;

        fileMgr.unzip(from, to);

        expect(fs.statSync(session.sourceDir + "/a").isDirectory()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/a/dummy.txt").isFile()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/a/b").isDirectory()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/a/b/dummy2.txt").isFile()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/startPage.html").isFile()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/config.xml").isFile()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/test.png").isFile()).toBeTruthy();
        expect(fs.statSync(session.sourceDir + "/webworks.js").isFile()).toBeTruthy();
    });

    it("cleanSource() should delete source folder", function () {
        expect(path.existsSync(session.sourceDir)).toBeTruthy();
        expect(fs.statSync(session.sourceDir).isDirectory()).toBeTruthy();
        fileMgr.cleanSource(session);
        expect(path.existsSync(session.sourceDir)).toBeFalsy();
    });
});