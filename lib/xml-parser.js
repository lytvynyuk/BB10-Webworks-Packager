var fs = require('fs'),
    util = require('util'),
    xml2js = require('xml2js'),
    packager_utils = require('./packager-utils'),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    parser = new xml2js.Parser({trim: true, normalize: true, explicitRoot: false}),
    localize = require("./localize"),
    logger = require("./logger"),
    _self;

function processWidgetData(data, widgetConfig) {
    if (data["@"]) {
        widgetConfig.version = data["@"].version;
        widgetConfig.id = data["@"].id;
    }
    
    widgetConfig.hasMultiAccess = true;//Implement properly
    //TODO rim:header
    //TODO access table
}

function processIconData(data, widgetConfig) {
    if (data.icon && data.icon["@"]) {
        widgetConfig.icon = data.icon["@"].src;
    }
}

function processAuthorData(data, widgetConfig) {
    if (data.author) {
        var attribs = data.author["@"];
        
        widgetConfig.author = sanitize(data.author).trim();
        
        if (attribs) {
            widgetConfig.authorURL = attribs.href;
            widgetConfig.copyRight = attribs["rim:copyright"];
            widgetConfig.authorEmail = attribs.email;
        }
    }
}

function processLicenseData(data, widgetConfig) {
    if (data.license && data.license["#"]) {
        widgetConfig.license = data.license["#"];
        
        if (data.license["@"]) {
            widgetConfig.licenseURL = data.license["@"].href;
        }
    }
}

function processContentData(data, widgetConfig) {
    if (data.content) {
        var attribs  = data.content["@"];        
        if (attribs) {
            widgetConfig.content = attribs.src;
            widgetConfig.foregroundSource = attribs.src;
            widgetConfig.contentType = attribs.type;
            widgetConfig.contentCharSet = attribs.charset;
            widgetConfig.allowInvokeParams = attribs["rim:allowInvokeParams"];
            //TODO content rim:background
        }
    }    
}

function processOrientationData(data, widgetConfig) {
    if (data["rim:orientation"]) {
        var mode = data["rim:orientation"].mode;
        
        if (mode === "landscape" || mode === "portrait") {
            widgetConfig.autoOrientation = false;
            widgetConfig.orientation = mode;
            return;
        }
    }
    
    //Default value
    widgetConfig.autoOrientation = true;
}

function validateConfig(widgetConfig) {
    check(widgetConfig.version, localize.translate("EXCEPTION_INVALID_VERSION"))
        .notNull()
        .regex("(\\d{1,3})(?:\\.(\\d{1,3}))(?:\\.(\\d{1,3}))(?:\\.(\\d{1,3}))?$");
    check(widgetConfig.name, localize.translate("EXCEPTION_INVALID_NAME")).notEmpty();
    check(widgetConfig.author, localize.translate("EXCEPTION_INVALID_AUTHOR")).notNull();
    
    if (widgetConfig.id) {
        check(widgetConfig.id, localize.translate("EXCEPTION_INVALID_ID")).regex("[a-zA-Z][a-zA-Z0-9]*");
    }
    
    if (widgetConfig.icon) {
        check(widgetConfig.icon, localize.translate("EXCEPTION_INVALID_ICON_SRC")).notNull();
    }
}

function processResult(data) {
    var widgetConfig = {},
        i;
    
    processWidgetData(data, widgetConfig);
    processIconData(data, widgetConfig);
    processAuthorData(data, widgetConfig);
    processLicenseData(data, widgetConfig);
    processContentData(data, widgetConfig);
    processOrientationData(data, widgetConfig);
    
    widgetConfig.name = data.name;
    widgetConfig.description = data.description;
    widgetConfig.permissions = data["rim:permissions"];    
    widgetConfig.configXML = "config.xml";
    widgetConfig.accessList = {
        "allowSubDomain": true,
        "features": [],
        "uri": "WIDGET_LOCAL"
    };
    
    //push features to the widgetConfig accessList
    if (data.feature) {
        for (i = 0 ;  i < data.feature.length; i++) {
            widgetConfig.accessList.features.push(data.feature[i]['@']);
        }
    }
    
    //validate the widgetConfig
    validateConfig(widgetConfig);
    
    return widgetConfig;
}

_self = {
    parse: function (xmlPath, callback) {
        var fileData = fs.readFileSync(xmlPath);
        
        //parse xml file data
        parser.parseString(fileData, function (err, result) {
            if (err) {
                logger.error(localize.translate("EXCEPTION_PARSING_XML"));
            } else {
                callback(processResult(result));
            }
        });
    }
};

module.exports = _self;