


var path = require('path');
var sql = require("mssql");
var dataConfig = null;

exports.getDataConfig = function () {
    return dataConfig;
}

exports.readDataConfig = function () {
    let filePath = path.join(process.cwd(), 'dataconfig.js');
    delete require.cache[filePath];
    let configJs = require(filePath);
    dataConfig = configJs.configure();
}



async function executeSqlProcedure(conConfig, procName, params) {
    await sql.connect(conConfig);
    let request = new sql.Request();
    for (let parName in params) {
        request.input(parName, params[parName]);
    }
    let result = await request.execute(procName);
    return Promise.resolve(result.recordsets[0]);
}
async function executeSqlQuery(conConfig, query, params) {

    await sql.connect(conConfig);
    let request = new sql.Request();
    for (let parName in params) {
        request.input(parName, params[parName]);
    }
    let result = await request.query(query);
    return Promise.resolve(result.recordsets[0]);
}

exports.queryData = async function (dataSetName, params) {
    let dataSet = getDataSet(dataSetName);
    let conConfig = getConConfig(dataSetName);
    let data = null;
    if (dataSet.procedure) {
        data = await executeSqlProcedure(conConfig, dataSet.procedure, params);
    } else {
        data = await executeSqlQuery(conConfig, dataSet.query, params);
    }

    return Promise.resolve(data);
}
//TODO: need check
var sqlToJsTypes = {
    "BIGINT": "number",
    "INT": "number",
    "BINARY": "string",
    "BIT": "boolean",
    "BOOLEAN": "boolean",
    "CHAR": "string",
    "DATE": "date",
    "DECIMAL": "number",
    "DOUBLE": "number",
    "FLOAT": "number",
    "INTEGER": "number",
    "LONGVARBINARY1": "string",
    "LONGVARCHAR2": "string",
    "REAL": "number",
    "SMALLINT": "number",
    "TIME": "date",
    "TIMESTAMP": "date",
    "TINYINT": "number",
    "VARBINARY": "string",
    "VARCHAR": "string"
}

function sqlToJsType(sqlType) {
    sqlType = sqlType.split('(')[0].toUpperCase();
    let jsType = sqlToJsTypes[sqlType];
    if (!jsType) {
        jsType = "string";
    }
    return jsType;
}

function getDataSet(dataSetName) {
    return dataConfig.data[dataSetName];
}
function getConConfig(dataSetName) {
    let dataSet = getDataSet(dataSetName);
    let conConfig = dataConfig.dataSources[dataSet.dataSource].properties;
    if (!conConfig.options) {
        conConfig.options = {
            "encrypt": true,
            "enableArithAbort": true
        }
    }
    return dataConfig.dataSources[dataSet.dataSource].properties;
}


async function checkProcExists(dataSetName) {

    let dataSet = getDataSet(dataSetName);
    let conConfig = getConConfig(dataSetName);
    let procObjectId = (await executeSqlQuery(conConfig, `select  max(OBJECT_ID(N'${dataSet.procedure}')) as id`))[0]["id"];
    if (!procObjectId) {
        throw new Error(`Object ${dataSet.procedure} does not exist`)
    }
    return Promise.resolve();

}

async function loadProcParamsMetadata(dataSetName) {

    let dataSet = getDataSet(dataSetName);
    let conConfig = getConConfig(dataSetName);
    let paramsQuery = `
SELECT 
    [name], 
    [type] = TYPE_NAME([user_type_id])
FROM 
    [sys].[parameters]
WHERE 
    object_id = OBJECT_ID(N'${dataSet.procedure}')
ORDER BY 
    [parameter_id]`;
    let paramsInfo = await executeSqlQuery(conConfig, paramsQuery);
    let factParsStr = "";
    let q = "";
    let params = {}
    for (let info of paramsInfo) {
        let parName = info.name.replace('@', '');
        params[parName] = { "type": sqlToJsType(info["type"]), "srcType": info["type"] };
        factParsStr += q + "null";
        q = ",";
    }
    return Promise.resolve(params);
}

async function loadFieldsMetadata(conConfig, query) {
    let fieldsQuery = `
SELECT 
    [name],
    system_type_name as [type] 
FROM 
    [sys].[dm_exec_describe_first_result_set](N'${query}', NULL, 0);`; //TODO quotes escape. Replace ' with '' ?

    let fieldsInfo = await executeSqlQuery(conConfig, fieldsQuery);
    let fields = {}
    for (let info of fieldsInfo) {
        fields[info.name] = { "type": sqlToJsType(info["type"]), "srcType": info["type"] };
    }
    return Promise.resolve(fields);
}

exports.queryMetadata = async function (dataSetName) {
    let dataSet = getDataSet(dataSetName);
    let conConfig = getConConfig(dataSetName);
    let params = {};
    let query = null;
    if (dataSet.procedure) {
        checkProcExists(dataSetName);
        params = await loadProcParamsMetadata(dataSetName);
        let factParsStr = "";
        let q = "";
        for (let name in params) {
            factParsStr += q + "null";
            q = ",";
        }
        query = `exec ${dataSet.procedure} ${factParsStr}`;
    } else {
        query = dataSet.query;
        if (dataSet.paramsExample) {
            for (let name in dataSet.paramsExample) {
                params[name] = { type: typeof (dataSet.paramsExample[name]) };
            }
        }
    }

    let fields = await loadFieldsMetadata(conConfig, query);
    return Promise.resolve({ params: params, fields: fields });

}


exports.getRemoteDataSetsNames = function () {
    var list = [];
    for (var name in dataConfig.data) {
        var ds = getDataSet(name);
        if (ds.dataSource) {
            list.push(name);
        }
    }
    return list;
}
