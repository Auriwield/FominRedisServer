const db = require("./database");
const msg = require("./app_messages");
const printHelp = require("./print_help");

module.exports = {

    route: function (commandText) {
        let command = parseCommand(commandText);

        if (!command) {
            return msg.UnknownCommand;
        }

        if (checkTokenIfNeed(command)) {
            return msg.AuthNotExists;
        }

        try {
            return commandMap[command.name].apply(db, command.params);
        }
        catch (err) {
            if (err.message) {
                return err.message;
            }
            return msg.UnknownError;
        }
    }
};

// noinspection SpellCheckingInspection
const commandMap = {
    AUTH:    db.authorize,
    CREATE:  db.createDb,
    GET:     db.get,
    PUT:     db.put,
    DEL:     db.del,
    EXISTS:  db.exists,
    HELP:    printHelp,
    GET_DBS: db.getDbs,
    LGET:    db.lget,
    LPUT:    db.lput,
    LDEL:    db.ldel,
    UPDATE:  db.update,
    INCR:    db.increment,
    DECR:    db.decrement,
    SEARCH:  db.search
};

function checkTokenIfNeed(command) {
    if (command.name !== "AUTH"
        && command.name !== "HELP") {
        return !db.exists(command.params[0]);
    }
    return false;
}

function isCommandExists(command) {
    if (typeof command !== "string") return false;
    return !!commandMap[command.toUpperCase()];
}

function parseCommand(commandText) {
    if (!commandText || typeof commandText !== "string")
        return null;
    let parts = commandText.trim().replace(/\s{2,}/g, " ").split(" ");

    if (parts.length === 0) return null;

    if (!isCommandExists(parts[0]))
        return null;

    return {
        name:   parts[0].toUpperCase(),
        params: parts.slice(1)
    };
}