
node-http-proxy-simple
======================

Abstract
--------

This is a [Node.js](http://nodejs.org/) extension module for
implementing a very simple HTTP proxy which allows you to on-the-fly
intercept and modify HTTP request/response header and payload
information. It is primarily intended for development scenarios where
a full-featured HTTP proxy is not necessary but the data of an
own application needs to be on-the-fly modified for testing
and instrumentation purposes.

Installation
------------

Use the Node Package Manager (NPM) to install this module
locally (default) or globally (with option `-g`):

    $ npm install [-g] http-proxy-simple

Usage
-----

var proxy = request("http-proxy-simple").createProxyServer({
    host: "127.0.0.1",
    port: 3128,
    servername: os.hostname().
    id: "my-proxy/1.0",
    proxy: "proxy.example.com:3128",
});

proxy.on("request", function (request, response) {
   console.log("request: " + JSON.stringify(request.connection));
});

proxy.on("error", function (error, socket) {
   console.log("error: " + error + ": " + JSON.stringify(socket));
});

Application Programming Interface (API)
---------------------------------------

### Method: `createProxyServer(options: Options): ProxyServer`

Create a proxy server. The following options are supported:

- `host`: IP address (or name) for listening for HTTP proxy requests. Defaults to `127.0.0.1`.
- `port`: TCP port for listening for HTTP proxy requests. Defaults to `3128`.
- `servername`: server host name for identification purposes in HTTP `Via` headers. Defaults to the result of `os.hostname()`.
- `id`: optional software name/version pair for identification purposes in HTTP `Via`headers. Defaults to `http-proxy-simple/X.X.X`.
- `proxy`: optional upstream proxy to forward requests to. Defaults to `""` (no forward proxy).

See Also
--------

- [node http.Server](http://nodejs.org/api/http.html#http_class_http_server)
- [node request](https://github.com/mikeal/request)

Credits
-------

Thanks to [Michael C. Axiak](mailto:mike@axiak.net) for its
[FilterNet](https://github.com/axiak/filternet) module which inspired
this module. FilterNet is more feature-packed (it also provides SSL/TLS
support, compression support, etc) but had too much dependencies
and especially did not support proxy forwarding.

License
-------

Copyright (c) 2013 Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

