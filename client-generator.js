var fs = require('fs');
const { type } = require('os');
const { array } = require('yargs');
var utils = require("./utils");

var templates = {};
function getTemplate(name) {
    var requireText = require('require-text');

    if (!templates[name]) {
        templates[name] = requireText("./client-template/" + name, require);
        // templates[name] = fs.readFileSync("./client-template/" + name, 'utf8');
    }
    return templates[name].slice();
}
var metadata = {};
async function getOrQueryMetadata(name) {
    if (!metadata[name]) {
        metadata[name] = await utils.queryMetadata(name);
    }
    return Promise.resolve(metadata[name]);
}

function getMetadata(name) {
    return metadata[name];
}

function applyVar(template, name, value) {
    let res = template;
    name = `$${name}$`;
    let i = res.indexOf(name);
    //applying tabulation for multi row value
    while (i >= 0) {
        let di = 0;
        if (i > 0) {
            let c = res[i - di - 1];
            while (c == " " || c == "   ") {
                di++;
                c = res[i - di - 1];
            }
        }
        let tab = "";
        let v = value;
        if (di > 0) {
            tab = res.slice(i - di, i);
            v = value.replace(/\n/g, '\n' + tab);
        }
        let s1 = res.slice(0, i);
        let s2 = res.slice(i + name.length);
        res = [s1, v, s2].join("");
        i = res.indexOf(name);
    }
    return res;
}
var itemSuffix = "Item";

function mapItemsObject(template, itemsObject, targetVarName, callback) {
    let sValue = "";
    let config = utils.getDataConfig();
    for (let name in itemsObject) {
        let item = itemsObject[name];
        var sval = callback(name, item);
        sValue += sval;
    }
    template = applyVar(template, targetVarName, sValue);
    return template;
}
function getExempleType(value, objectName) {
    let type = "";
    if (typeof (value) == "object") {
        if (Object.prototype.toString.call(value) === "[object Date]") {
            type = "Date | undefined";
        } else {
            type = objectName + itemSuffix;
            if (Array.isArray(value)) {
                type += "[]";
            }
        }
    }
    else {
        type = typeof (value);
        if (Array.isArray(value)) {
            type += "[]";
        } else {
            type += " | undefined";
        }
    }
    return type;
}
exports.generate = async function (outputFileName) {
    utils.readDataConfig();
    let config = utils.getDataConfig();
    let stypes = "";
    let mt = getTemplate("main");
    //for further synchronous usage
    for (let name in config.data) {
        let item = config.data[name];
        if (item.dataSource) {
            await getOrQueryMetadata(name);
        }
    }

    mt = mapItemsObject(mt, config.data, "itemInterfaces",
        (name, item) => {
            if (item.dataSource) {
                let it = getTemplate("item-interface");
                it = applyVar(it, "name", name + itemSuffix);
                let metadata = getMetadata(name);
                it = mapItemsObject(it, metadata.fields, "fields", (name, item) => {
                    let ft = getTemplate("field");
                    ft = applyVar(ft, "name", name);
                    ft = applyVar(ft, "type", item.type);
                    return ft;
                });
                return it;
            }
            else if (typeof (item.example) == "object" && !(Object.prototype.toString.call(item.example) === "[object Date]")) {
                let it = getTemplate("item-interface");
                it = applyVar(it, "name", name + itemSuffix);
                var val = item.example;
                if (Array.isArray(item.example)) {
                    val = val[0];
                }
                it = mapItemsObject(it, val, "fields", (name, item) => {
                    let ft = getTemplate("field");
                    ft = applyVar(ft, "name", name);
                    ft = applyVar(ft, "type", typeof (item));
                    return ft;
                });
                return it;
            }
            else {
                return "";
            }
        }
    );
    mt = mapItemsObject(mt, config.data, "stateFields",
        (name, item) => {
            let type = "";
            if (item.dataSource) {
                type = name + itemSuffix;
                if (!item.isSingle) {//TODO: test
                    type += "[]";
                }
            }
            else {
                type = getExempleType(item.example, name);
            }
            let ft = getTemplate("field");
            ft = applyVar(ft, "name", name);
            ft = applyVar(ft, "type", type);
            return ft;
        }
    );

    mt = mapItemsObject(mt, config.data, "stateFieldsValues",
        (name, item) => {
            let value = "";
            if (item.dataSource) {
                value = `new Array<${name + itemSuffix}>()`;
            } else {
                var val = config.data[name].example;
                if (Array.isArray(val)) {
                    value = `new Array<${name + itemSuffix}>()`;
                } else {
                    value = "undefined";
                }
                // var type = typeof (val);
                // switch (type) {
                //     case "number":
                //         value = val.toString();
                //         break;
                //     case "string":
                //         value = '"' + val + '"';
                //         break;
                //     case "object":
                //         if (Array.isArray(val)) {
                //             value = `new Array<${name + itemSuffix}>()`;
                //         }
                //         else if (Object.prototype.toString.call(val) === "[object Date]") {
                //             value = 'new Date()';
                //         }
                //         else {
                //             value = "null";
                //         }
                //         break;
                // }
            }
            let ft = getTemplate("field-value");
            ft = applyVar(ft, "name", name);
            ft = applyVar(ft, "value", value);
            return ft;
        }
    );


    mt = mapItemsObject(mt, config.data, "reducers",
        (name, item) => {
            let ft = getTemplate("reducer");
            ft = applyVar(ft, "item", name);
            return ft;
        }
    );

    mt = mapItemsObject(mt, config.data, "dataItems",
        (name, item) => {
            let ft = null;
            let metadata = getMetadata(name);
            if (item.dataSource) {
                ft = getTemplate("remote-item");

                ft = mapItemsObject(ft, metadata.params, "params", (name, item) => {
                    let it = getTemplate("param");
                    it = applyVar(it, "name", name);
                    it = applyVar(it, "type", item.type+" | undefined");
                    return it;
                });
                ft = mapItemsObject(ft, metadata.params, "values", (name) => {
                    let it = getTemplate("value");
                    it = applyVar(it, "name", name);
                    return it;
                });
            } else {
                ft = getTemplate("local-item");
                let type = getExempleType(config.data[name].example, name);
                ft = applyVar(ft, "type", type);
            }
            ft = applyVar(ft, "name", name);
            return ft;

        }
    );


    fs.writeFileSync(outputFileName, mt);

    return Promise.resolve();

}

// exports.generate();



