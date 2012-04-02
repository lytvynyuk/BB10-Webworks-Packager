var testData = require("./test-data"),
    configParser = require(testData.libPath + "/config-parser"),
    fileManager = require(testData.libPath + "/file-manager"),
    logger = require(testData.libPath + "./logger"),
    testUtilities = require("./test-utilities"),
    xml2js = require('xml2js'),
    localize = require(testData.libPath + "/localize"),
    path = require("path"),
    session = testData.session,
    configPath = path.resolve("test/config.xml");
    
function mockParsing(data, error) {
    spyOn(xml2js, "Parser").andReturn({
        parseString: function (fileData, callback) {
            //call callback with no error and altered xml2jsConfig data
            callback(error, data);
        }
    });
}

describe("xml parser", function () {
    it("parses standard elements in a config.xml", function () {
        configParser.parse(configPath, session, function (configObj) {
            expect(configObj.content).toEqual("local:///startPage.html");
            expect(configObj.id).toEqual("MyWidgetId");
            expect(configObj.version).toEqual("1.0.0");
            expect(configObj.license).toEqual("My License");
            expect(configObj.licenseURL).toEqual("http://www.apache.org/licenses/LICENSE-2.0");
            expect(configObj.icon).toEqual("test.png");
            expect(configObj.configXML).toEqual("config.xml");
            expect(configObj.author).toEqual("Research In Motion Ltd.");
            expect(configObj.authorURL).toEqual("http://www.rim.com/");
            expect(configObj.copyRight).toEqual("No Copyright");
            expect(configObj.authorEmail).toEqual("author@rim.com");
            expect(configObj.name).toEqual("Demo");
            expect(configObj.description).toEqual("This app does everything.");
            expect(configObj.permissions).toContain('access_shared');
            expect(configObj.permissions).toContain('read_geolocation');
            expect(configObj.permissions).toContain('use_camera');
        });
    });
    
    it("parses Feature elements in a config.xml", function () {
        var localAccessList,
            accessListFeature;

        configParser.parse(configPath, session, function (configObj) {
            //validate WIDGET_LOCAL accessList
            localAccessList = testUtilities.getAccessListForUri(configObj.accessList, "WIDGET_LOCAL");
            expect(localAccessList).toBeDefined();
            expect(localAccessList.uri).toEqual("WIDGET_LOCAL");
            expect(localAccessList.allowSubDomain).toEqual(true);
            
            //validate WIDGET_LOCAL feature [blackberry.app]
            accessListFeature = testUtilities.getFeatureByID(localAccessList.features, "blackberry.app");
            expect(accessListFeature).toBeDefined();
            expect(accessListFeature.id).toEqual("blackberry.app");
            expect(accessListFeature.required).toEqual(true);
            expect(accessListFeature.version).toEqual("1.0.0.0");
            
            //validate WIDGET_LOCAL feature [blackberry.system]
            accessListFeature = testUtilities.getFeatureByID(localAccessList.features, "blackberry.system");
            expect(accessListFeature).toBeDefined();
            expect(accessListFeature.id).toEqual("blackberry.system");
            expect(accessListFeature.required).toEqual(true);
            expect(accessListFeature.version).toEqual("1.0.0.3");
        });
    });
    
    it("parses Access elements a config.xml", function () {
        var customAccessList,
            accessListFeature;

        configParser.parse(configPath, session, function (configObj) {
            //validate http://www.somedomain1.com accessList
            customAccessList = testUtilities.getAccessListForUri(configObj.accessList, "http://www.somedomain1.com");
            expect(customAccessList).toBeDefined();
            expect(customAccessList.uri).toEqual("http://www.somedomain1.com");
            expect(customAccessList.allowSubDomain).toEqual(true);
            
            //validate http://www.somedomain1.com feature [blackberry.app]
            accessListFeature = testUtilities.getFeatureByID(customAccessList.features, "blackberry.app");
            expect(accessListFeature).toBeDefined();
            expect(accessListFeature.id).toEqual("blackberry.app");
            expect(accessListFeature.required).toEqual(true);
            expect(accessListFeature.version).toEqual("1.0.0.0");
            
            //validate http://www.somedomain1.com feature [blackberry.app.event]
            accessListFeature = testUtilities.getFeatureByID(customAccessList.features, "blackberry.app.event");
            expect(accessListFeature).toBeDefined();
            expect(accessListFeature.id).toEqual("blackberry.app.event");
            expect(accessListFeature.required).toEqual(false);
            expect(accessListFeature.version).toEqual("2.0.0.0");
        });
    });

    it("parses a bare minimum config.xml without error", function () {
        configPath = path.resolve("test/config-bare-minimum.xml");

        configParser.parse(configPath, session, function (configObj) {
            expect(configObj.content).toEqual("local:///startPage.html");
            expect(configObj.version).toEqual("1.0.0");
        });
    });
    
    it("fails when id is undefined", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data["@"].id = undefined;
        
        mockParsing(data);
        
        //Should throw an EXCEPTION_INVALID_ID error
        expect(function () {
            configParser.parse(configPath, session, {});
        }).toThrow(localize.translate("EXCEPTION_INVALID_ID"));
        
        
    });
    
    it("adds local:/// protocol to urls", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data.content["@"].src = "localFile.html";
        
        mockParsing(data);
        
        configParser.parse(configPath, session, function (configObj) {
            expect(configObj.content).toEqual("local:///localFile.html");
        });
    });
    
    it("cleans source folder on error", function () {
        mockParsing({}, "ERROR");
        
        spyOn(logger, "error");
        spyOn(fileManager, "cleanSource");
        
        configParser.parse(configPath, session, function () {});
        
        expect(fileManager.cleanSource).toHaveBeenCalled();
    });
    
    it("adds the access_internet permission if unprovided", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data['rim:permit'] = [];
        
        mockParsing(data);
        
        configParser.parse(configPath, session, function (configObj) {
            //access_internet permission was set
            expect(configObj.permissions).toContain('access_internet');
        });
    });

    it("multi access should be false if no access", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);

        mockParsing(data);

        configParser.parse(configPath, session, function (configObj) {
            //hasMultiAccess was set to false
            expect(configObj.hasMultiAccess).toEqual(false);
            expect(configObj.accessList).toEqual([ {
                features : [],
                uri : 'WIDGET_LOCAL',
                allowSubDomain : true
            } ]);
        });
    });

    it("multi access should be false if no uri is equal to *", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data['access'] = {"@" : {"uri" : "http://www.somedomain1.com"}};

        mockParsing(data);

        configParser.parse(configPath, session, function (configObj) {
            //hasMultiAccess was set to false
            expect(configObj.hasMultiAccess).toEqual(false);
            expect(configObj.accessList).toEqual([ {
                features : [],
                uri : 'WIDGET_LOCAL',
                allowSubDomain : true
            }, {
                "features" : [],
                "uri" : "http://www.somedomain1.com"
            } ]);
        });
    });

    it("multi access should be true with the uri being equal to *", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data['access'] = {"@" : {"uri" : "*"}};

        mockParsing(data);

        configParser.parse(configPath, session, function (configObj) {
            //hasMultiAccess was set to true
            expect(configObj.hasMultiAccess).toEqual(true);
            expect(configObj.accessList).toEqual([ {
                features : [],
                uri : 'WIDGET_LOCAL',
                allowSubDomain : true
            } ]);
        });
    });

    it("multi access should be true with one uri being equal to *", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        data['access'] = [{"@" : {"uri" : "*"}}, {"@" : {"uri" : "http://www.somedomain1.com"}}];

        mockParsing(data);

        configParser.parse(configPath, session, function (configObj) {
            //hasMultiAccess was set to true
            expect(configObj.hasMultiAccess).toEqual(true);
            expect(configObj.accessList).toEqual([ {
                features : [],
                uri : 'WIDGET_LOCAL',
                allowSubDomain : true
            }, {
                "features" : [],
                "uri" : "http://www.somedomain1.com"
            } ]);
        });
    });
    
    it("does not fail when there is a single feature element in the access list", function () {
        var data = testUtilities.cloneObj(testData.xml2jsConfig);
        
        //Add an access element with one feature
        data['access'] = {
            '@': {
                uri: 'http://rim.net',
                subdomains: 'true'
            },
            feature: {
                '@': { id: 'blackberry.system' }
            }
        };
        
        mockParsing(data);
        
        expect(function () {
            configParser.parse(configPath, session, function (configObj) {});
        }).not.toThrow();
    });
});