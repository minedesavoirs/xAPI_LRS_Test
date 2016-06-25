"use strict";
var request = require("request"),
    qs = require("querystring"),
    async = require("async"),
    factory = require("./factory"),
    cleanup = require("./cleanup"),
	colors = require("colors"),
    requestStatTotal = 0,
    requestStat = {},
    updateStat,
    buildUrl,
    checkCleanUp,
    makeRequest,
    VOIDED = "http://adlnet.gov/expapi/verbs/voided";

updateStat = function (cfg) {
    var statKey = cfg.request.method + " /" + cfg.request.resource;
    if (typeof requestStat[statKey] === "undefined") {
        requestStat[statKey] = 0;
    }
    requestStat[statKey] += 1;
    requestStatTotal += 1;
};

buildUrl = function (endpoint, resource, params) {
    var prop;
    if (typeof params !== "undefined" && Object.keys(params).length > 0) {
        for (prop in params) {
            if (params.hasOwnProperty(prop) && typeof params[prop] === "object") {
                params[prop] = JSON.stringify(params[prop]);
            }
        }
        resource += "?" + qs.stringify(params);
    }
    return resource.indexOf("http") === 0 ? resource : endpoint + resource;
};

//
// function to check the configuration to see if this is a request
// that needs to be cleaned up after, and whether that clean up request
// is included in the global store of expected clean up requests
//
checkCleanUp = function (cfg, context) {
    /* jshint maxdepth: 4 */
    var request,
        ids;

    context.scenarioResource = context.scenarioResource || {};
    context.scenarioResource.cleanUpRequests = context.scenarioResource.cleanUpRequests || [];

    if (["PUT", "POST"].indexOf(cfg.request.method) === -1) {
        return;
    }
    if ([200, 204].indexOf(cfg.response.statusCode) === -1) {
        return;
    }

    if (cfg.request.resource === "statements") {
        //
        // if 204 status code then need to get id from the request params
        //
        if (cfg.response.statusCode === 204) {
            //
            // don't void voiding statements
            //
            if (typeof cfg.request.content !== "undefined") {
                if (cfg.request.content.verb.id === VOIDED) {
                    return;
                }
            }
            else if (typeof cfg.request.parts !== "undefined") {
                if (cfg.request.parts[0]._body.verb.id === VOIDED) {
                    return;
                }
            }
            else {
                throw new Error("Unrecognized statement request format");
            }

            request = factory.make("voiding saveStatement");

            request.params = {
                statementId: request.content.id
            };
            request.content.object = {
                id: cfg.request.params.statementId,
                objectType: "StatementRef"
            };

            context.scenarioResource.cleanUpRequests.push(
                {
                    request: request,
                    endpoint: cfg.endpoint
                }
            );
        }
        else {
            ids = JSON.parse(cfg.response.body);
            ids.forEach(
                function (v, i) {
                    var sentStatement;

                    if (Array.isArray(cfg.request.content)) {
                        sentStatement = cfg.request.content[i];
                    }
                    else {
                        sentStatement = cfg.request.content;
                    }

                    //
                    // don't void voiding statements
                    //
                    if (sentStatement.verb.id === VOIDED) {
                        return;
                    }

                    request = factory.make("voiding saveStatement");

                    request.params = {
                        statementId: request.content.id
                    };
                    request.content.object = {
                        id: v,
                        objectType: "StatementRef"
                    };

                    context.scenarioResource.cleanUpRequests.push(
                        {
                            request: request,
                            endpoint: cfg.endpoint
                        }
                    );
                }
            );
        }
    }
    else if (
        [
            "agents/profile",
            "activities/profile",
            "activities/state"
        ].indexOf(cfg.request.resource) > -1
    ) {
        request = {
            method: "DELETE",
            resource: cfg.request.resource,
            params: cfg.request.params
        };
        cleanup.isKnown(request, { trackMissing: true });

        request.headers = {
            "X-Experience-API-Version": cfg.request.headers["X-Experience-API-Version"],
            Authorization: cfg.request.headers.Authorization
        };
        context.scenarioResource.cleanUpRequests.push(
            {
                request: request,
                endpoint: cfg.endpoint
            }
        );
    }
};

makeRequest = function (cfg, callback, context, opts) {
    var requestCfg;

    opts = opts || {};

    if (! opts.skipCount) {
        updateStat(cfg);
    }

    requestCfg = {
        url: buildUrl(cfg.endpoint, cfg.request.resource, cfg.request.params),
        method: cfg.request.method,
        headers: cfg.request.headers
    };
    if (typeof cfg.request.content !== "undefined") {
        requestCfg.body = typeof cfg.request.content === "object" ? JSON.stringify(cfg.request.content) : cfg.request.content;
    }
    else if (typeof cfg.request.parts !== "undefined") {
        //
        // the request library deletes the "body" property of each part in the multipart
        // array's objects when building the request, so we need to store a copy for our
        // own use, if request is patched to not do that, then we can get rid of the copy
        //
        // see: https://github.com/mikeal/request/issues/1133
        //
        cfg.request.parts.forEach(
            function (v) {
                v._body = v.body;
            }
        );

        requestCfg.multipart = cfg.request.parts;

        if (requestCfg.multipart.length > 0) {
            if (typeof requestCfg.multipart[0].body === "object") {
                requestCfg.multipart[0].body = JSON.stringify(requestCfg.multipart[0].body);
            }
        }
    }
    
    console.log('******************************************');
    console.log('URL: ' + requestCfg.url + ' (' + requestCfg.method + ')');
    console.log('Response body: ' + requestCfg.body);
    console.log('******************************************');

    request(
        requestCfg,
        function (err, res) {
            cfg.response = res;

            if (! err) {
                checkCleanUp(cfg, context);
            }
            
            callback(err, res);
        }
    );
};

module.exports = {
    stat: function (logFunc) {
        logFunc("Request counts:");
        logFunc(JSON.stringify(requestStat, null, 4).slice(1, -1));
        logFunc("Total: ", requestStatTotal);
        logFunc("---------------");
    },

    statReset: function () {
        requestStat = {};
        requestStatTotal = 0;
    },

    makeRequest: makeRequest,

    makeRequestSeries: function (requests, callback) {
        var wrapperFuncs = [];

        requests.forEach(
            function (request) {
                wrapperFuncs.push(
                    function (callback) {
                        makeRequest(
                            request,
                            function (err, res) {
                                if (err) {
                                    callback(err, res);
                                    return;
                                }

                                if (res.statusCode !== 204) {
                                    callback(new Error("Cleanup request failed: " + res.body + " (" + res.statusCode + ")", res));
                                    return;
                                }

                                callback(err, res);
                            },
                            {},
                            { skipCount: true }
                        );
                    }
                );
            }
        );

        //
        // these should be doable in parallel but I felt it better to restrict
        // the test suite to only doing 1 request at a time
        //
        async.series(wrapperFuncs, callback);
    }
};
