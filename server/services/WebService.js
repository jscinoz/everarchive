/* jshint globalstrict: true */
/* global require, module, __dirname */

"use strict";

let path = require("path"),
    koa = require("koa"),
    router = require("koa-router"),
    logger = require("koa-logger"),
    bodyParser = require("koa-body"),
    mongoose = require("mongoose"),
    fileServer = require("koa-file-server")({
        // TODO: Get the client file path in a cleaner / more robust way
        root: path.resolve(__dirname, "../../client"),
        index: true
    }),
    routes = require("../routes");

// TODO: default values for unspecified options
function WebService(options) {
    // FIXME: Use Object.defineProperty to make things immutable as appropriate
    this.app = koa();
    this.port = options.port || 3000;

    this.setupMiddleware();
    this.registerRoutes();
}

WebService.prototype.setupMiddleware = function() {
    let app = this.app;

    // Log all the things!
    app.use(logger());

    // Serve static files
    app.use(fileServer);

    // Set up router
    app.use(router(app));
};

WebService.prototype.registerRoutes = function() {
    let app = this.app;

    // Route registration
    app.get("/archive/:pageUrl/:resource*", routes.getArchivedPage);
    app.post("/archive", bodyParser(), routes.archivePage);
};

WebService.prototype.start = function() {
    this.app.listen(this.port);
};

module.exports = WebService;
