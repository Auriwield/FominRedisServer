"use strict";

const ws = require("nodejs-websocket");
const router = require("./router");
const logger = require("./logger");
const port = process.env.PORT || 8081;

ws.createServer({secure: true}, function (conn) {
    logger.info("New connection");

    conn.on("text", command => {
        let response = router.route(command);
        logger.info("'%s' => %s", command, response);
        conn.sendText(response);
    });

    conn.on("close", function (code, reason) {
        logger.info("Connection closed with code: %s and reason: %s", code, reason);
    });

    conn.on("error", function (err) {
        logger.info("Connection closed with error: %s", JSON.stringify(err));
    });

}).listen(port);

logger.info("Server started at port: %s", port);