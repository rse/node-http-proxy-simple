/*
**  http-proxy-simple -- Simple HTTP proxy, allowing protocol and payload interception
**  Copyright (c) 2013 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*  load Node module requirements (built-in)  */
/* global require: true */
var os     = require("os");
var fs     = require("fs");
var path   = require("path");
var url    = require("url");
var http   = require("http");
var events = require("events");

/*  load Node module requirements (external)  */
var req    = require("request");

/*  export the API  */
/* global module: true */
module.exports = {
    createProxyServer: function (opts) {
        /*  prepare settings  */
        opts = opts || {};
        var serverHost   = opts.host               || "127.0.0.1";
        var serverPort   = parseInt(opts.port, 10) || 3128;
        var serverName   = opts.servername         || os.hostname();
        var proxy        = opts.proxy              || "";

        /*  determine service identifier  */
        var id = opts.id;
        if (typeof id === "undefined" || (id + "").match(/^[a-zA-Z0-9_-]+\/[0-9](?:\.[0-9])*$/) === null) {
            /* global __dirname: true */
            var pjson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
            id = pjson.name + "/" + pjson.version;
        }

        /*  create event emitting proxy object  */
        var proxyserver = new events.EventEmitter();

        /*  helper function: emit event or run fallback action  */
        var emitOrRun = function (eventName, callback) {
            if (!proxyserver.listeners(eventName).length)
                callback();
            else {
                var args = Array.prototype.slice.call(arguments, 2);
                args.unshift(eventName);
                proxyserver.emit.apply(proxyserver, args);
            }
        };

        /*  create HTTP server  */
        var httpServer = http.createServer(function (request, response) {
            /*  determine connection id  */
            var cid = request.connection.remoteAddress + ":" + request.connection.remotePort;

            /*  for interception ensure there is no compression  */
            request.headers["accept-encoding"] = "identity";
            delete request.headers["proxy-connection"];

            /*  provide forwarding information (1/2)  */
            var clientIp = request.connection.remoteAddress;
            if (request.headers["x-forwarded-for"])
                request.headers["x-forwarded-for"] += ", " + clientIp;
            else
                request.headers["x-forwarded-for"] = clientIp;
            request.headers["forwarded-for"] = request.headers["x-forwarded-for"];

            /*  provide forwarding information (2/2)  */
            request.headers.via = request.httpVersion + " " + serverName;
            var localAddr = request.connection.address();
            if (localAddr !== null)
                request.headers.via += ":" + request.connection.address().port;
            request.headers.via += " (" + id + ")";

            /*  assemble request information  */
            var remoteRequest = {
                url:            request.url,
                method:         request.method,
                headers:        request.headers,
                body:           request.body,
                followRedirect: false,
                encoding:       null
            };
            if (proxy !== "") {
                var hostname = url.parse(remoteRequest.url).hostname;
                if (hostname !== "localhost" && hostname !== "127.0.0.1")
                    remoteRequest.proxy = proxy;
            }

            /*  helper function for fixing the upper/lower cases of headers  */
            var fixHeaderCase = function (headers) {
                var result = {};
                for (var key in headers) {
                    if (!headers.hasOwnProperty(key))
                        continue;
                    var newKey = key.split("-")
                        .map(function(token) { return token[0].toUpperCase() + token.slice(1); })
                        .join("-");
                    result[newKey] = headers[key];
                }
                return result;
            };

            /*  perform the HTTP client request  */
            var performRequest = function (remoteRequest) {
                /*  adjust headers  */
                remoteRequest.headers = fixHeaderCase(remoteRequest.headers);
                try {
                    req(remoteRequest, function (error, remoteResponse, remoteResponseBody) {
                        /*  perform the HTTP client response  */
                        if (error) {
                            proxyserver.emit("http-error", cid, error, request, response);
                            response.writeHead(400, {});
                            response.end();
                        }
                        else {
                            var performResponse = function (remoteResponse, remoteResponseBody) {
                                response.writeHead(remoteResponse.statusCode, remoteResponse.headers);
                                response.write(remoteResponseBody);
                                response.end();
                            };
                            emitOrRun("http-intercept-response", function () {
                                performResponse(remoteResponse, remoteResponseBody);
                            }, cid, request, response, remoteResponse, remoteResponseBody, performResponse);
                        }
                    });
                }
                catch (error) {
                    proxyserver.emit("http-error", cid, error, request, response);
                    response.writeHead(400, {});
                    response.end();
                }
            };
            emitOrRun("http-intercept-request", function () {
                performRequest(remoteRequest);
            }, cid, request, response, remoteRequest, performRequest);
        });

        /*  react upon HTTP server events  */
        httpServer.on("connection", function (socket) {
            var cid = socket.remoteAddress + ":" + socket.remotePort;
            proxyserver.emit("connection-open", cid, socket);
            socket.on("close", function (had_error) {
                proxyserver.emit("connection-close", cid, socket, had_error);
            });
            socket.on("error", function (error) {
                proxyserver.emit("connection-error", cid, socket, error);
            });
        });
        httpServer.on("clientError", function () {
            /*  already handled above on socket directly  */
        });
        httpServer.on("request", function (request, response) {
            if (typeof request.connection.remoteAddress === "undefined" ||
                typeof request.connection.remotePort    === "undefined"   )
                return;
            var cid = request.connection.remoteAddress + ":" + request.connection.remotePort;
            proxyserver.emit("http-request", cid, request, response);
        });
        httpServer.on("connect", function (request, socket) {
            var cid = request.connection.remoteAddress + ":" + request.connection.remotePort;
            proxyserver.emit("http-error", cid, "CONNECT method not supported", request, socket);
        });
        httpServer.on("upgrade", function (request, socket) {
            var cid = request.connection.remoteAddress + ":" + request.connection.remotePort;
            proxyserver.emit("http-error", cid, "protocol upgrade not supported", request, socket);
        });

        /*  listen for connections  */
        httpServer.listen(serverPort, serverHost);

        return proxyserver;
    }
};

