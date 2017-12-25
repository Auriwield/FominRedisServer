const msg = require("./app_messages");
const util = require('util');
const minimatch = require("minimatch");
const databases = {};
const removeArrayItem = (arr, itemToRemove) => {
    return arr.filter(item => item !== itemToRemove)
};


module.exports = {

    authorize: function (token) {
        if (!token || token.length < 4) {
            throw new Error(msg.AuthInvalidToken);
        }

        if (!databases[token]) {
            databases[token] = {};
            databases[token].lastAuth = new Date().toISOString();
            return msg.AuthCreated
        }
        let date = databases[token].lastAuth;
        databases[token].lastAuth = new Date().toISOString();
        return util.format(msg.AuthExists, date);
    },

    createDb: function (token, dbName) {
        if (!this.exists(token, dbName)) {
            databases[token][dbName] = {};
            return msg.DbCreated;
        }
        return msg.DbExists;
    },

    getDb: function (token, dbName) {
        let userDbs = databases[token];

        if (!userDbs) {
            throw new Error(util.format(msg.AuthNotExists, dbName));
        }

        let db = userDbs[dbName];

        if (!db) {
            throw new Error(util.format(msg.DbNotExists, dbName));
        }

        return db;
    },

    get: function (token, dbName, key) {
        let db = this.getDb(token, dbName);

        if (db[key] === undefined) {
            throw new Error(msg.GetNotExists);
        }

        return db[key];
    },

    put: function (token, dbName, key, value) {
        this.getDb(token, dbName)[key] = value;
        return msg.PutSuccessful;
    },

    del: function (token, dbName, key) {
        this.getDb(token, dbName)[key] = null;
        return msg.Deleted;
    },

    exists: function () {
        let token = arguments[0];
        let dbName = arguments[1];
        let key = arguments[2];
        let value = arguments[3];

        if (!token) return false;
        if (!dbName) return true;

        let db;
        try {
            db = this.getDb(token, dbName);
        } catch (err) {
            return false;
        }

        if (!key) return !!db;

        if (!value) {
            // noinspection EqualityComparisonWithCoercionJS
            return db[key] != null;
        }

        if (!Array.isArray(db[key])) return !!db[key];

        return db[key].indexOf(value) !== -1;
    },

    getDbs: function (token) {
        let copy = JSON.parse(JSON.stringify(databases[token]));
        delete copy.lastAuth;
        return JSON.stringify(copy);
    },

    search: function (token, pattern) {
        //1. Collect all tokens
        pattern = pattern.replace("%s%", " ");
        let dbs = this.getDbs(token);

        let dbNames = Object.keys(dbs);

        let result = {};

        for (let i = 0; i < dbNames.length; i++) {
            let dbName = dbNames[i];
            let db = dbs[dbName];
            let dbKeys = Object.keys(db);
            let keys = [];
            for (let j = 0; j < dbKeys.length; j++) {
                let key = dbKeys[j];
                if (minimatch(key, pattern)) {
                    keys.push(key);
                }
            }
            result[dbName] = keys;
        }

        return JSON.stringify(result);
    },

    lget: function (token, dbName, key) {
        if (!this.exists(token, dbName, key)) {
            throw Error(msg.LGetNotExists);
        }

        let list = this.getDb(token, dbName)[key];
        if (!Array.isArray(list)) {
            throw Error(msg.LGetSpecifiedKey);
        }

        return list;
    },

    lput: function () {
        let token = arguments[0];
        let dbName = arguments[1];
        let key = arguments[2];
        let values = Array.prototype.slice.call(arguments, 3);

        let list;
        try {
            list = this.lget(token, dbName, key);
        } catch (err) {
            list = this.getDb(token, dbName)[key] = [];
        }

        Array.prototype.push.apply(list, values);

        return util.format(msg.LAdded, values.length);
    },

    ldel: function () {
        let token = arguments[0];
        let dbName = arguments[1];
        let key = arguments[2];
        let values = Array.prototype.slice.call(arguments, 3);

        let list = this.lget(token, dbName, key);
        let count;

        if (values.length === 0) {
            count = list.length;
            this.getDb(token, dbName)[key] = null;
        } else {
            count = list.length;
            for (let i = 0; i < values.length; i++) {
                let val = values[i];
                list = removeArrayItem(list, val);
            }
            count -= list.length;
        }

        return util.format(msg.LAdded, count);
    },

    update: function (e) {
        let token = arguments[0];
        let data = arguments[1].split(".");
        let newName = data[0];
        let dbName = data[1];
        let key = data[2];
        let value = data[3];

        if (!this.exists(data.splice(1))) {
            throw new Error(msg.UpdateNotExist);
        }
        if (!newName) {
            newName = null;
        }
        if (value) {
            let list = this.lget(token, dbName, key);
            if (newName) {
                list[value] = newName;
            }
            else {
                list.splice(value, 1);
            }
            return msg.UpdateSuccessful;
        }
        let db = this.getDb(token, dbName);
        if (key) {
            if (this.exists(token, dbName, key)) {
                return msg.UpdateAlreadyExists;
            }
            if (newName) {
                db[newName] = db[key];
            }
            delete db[key];
            return msg.UpdateSuccessful;
        }
        if (this.exists(token, dbName)) {
            return msg.UpdateAlreadyExists;
        }
        if (newName) {
            databases[token][newName] = databases[token][dbName];
        }
        delete databases[token][dbName];

        return msg.UpdateSuccessful;
    },

    increment: function () {
        this.updateNumericValue([1].concat(arguments))
    },

    decrement: function () {
        this.updateNumericValue([-1].concat(arguments))
    },

    updateNumericValue : function (addiction, token, dbName, key, value) {

        if (!this.exists(arguments)) {
            return msg.GetNotExists;
        }

        if (!value) {
            let v = this.get(token, dbName, key);
            v = parseInt(v, 10);
            if (isNaN(v)) {
                return msg.NAN;
            }
            this.put(token, dbName, key, ++v);
            return v + "";
        }

        let list = this.lget(token, dbName, key);
        let listVal = parseInt(list[value]);

        if (isNaN(listVal)) {
            return msg.NAN;
        }

        listVal += addiction;
        list[value] = listVal;

        return listVal + "";
    }
};