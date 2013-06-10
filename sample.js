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

var proxy = require("./http-proxy-simple").createProxyServer({
    host: "0.0.0.0",
    port: 4129
});

proxy.on("connection-open", function (cid, socket) {
   console.log("proxy: " + cid + ": TCP connection open");
});

proxy.on("connection-error", function (cid, socket, error) {
   console.log("proxy: " + cid + ": TCP connection error: " + error);
});

proxy.on("connection-close", function (cid, socket, had_error) {
   console.log("proxy: " + cid + ": TCP connection close");
});

proxy.on("http-request", function (cid, request, response) {
   console.log("proxy: " + cid + ": HTTP request: " + request.url);
});

proxy.on("http-error", function (cid, error, request, response) {
   console.log("proxy: " + cid + ": HTTP error: " + error);
});

proxy.on("http-intercept-request", function (cid, request, response, remoteRequest, performRequest) {
   console.log("proxy: " + cid + ": HTTP intercept request");
   performRequest(remoteRequest);
});

proxy.on("http-intercept-response", function (cid, request, response, remoteResponse, remoteResponseBody, performResponse) {
   console.log("proxy: " + cid + ": HTTP intercept response");
   if (   remoteResponse.headers["content-type"]
       && remoteResponse.headers["content-type"].toLowerCase() === "text/html") {
       var body = remoteResponseBody.toString("utf8");
       var css = "<style>body { border: 10px solid red !important; }</style>";
       remoteResponseBody = body.replace(/(<\/head>)/i, css + "$1");
       remoteResponse.headers["content-length"] = remoteResponseBody.length;
       console.log("proxy: " + cid + ": HTTP intercept response: MODIFIED RESPONSE BODY");
   }
   performResponse(remoteResponse, remoteResponseBody);
});

