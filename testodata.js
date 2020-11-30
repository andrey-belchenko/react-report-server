#!/usr/bin/env node
'use strict'
var express = require("express");
var app = express();


var Datastore = require('nedb')



exports.addDataSource = function () {
    console.log("addDataSource");
}

// Set up a whitelist and check against it:
// var whitelist = ['https://localhost:4321','http://localhost:3004']
var corsOptions = {
    origin: function (origin, callback) {
        // if (whitelist.indexOf(origin) !== -1) {
        //   callback(null, true)
        // } else {
        //   callback(new Error('Not allowed by CORS'))
        // }
        callback(null, true)
    }
}
var cors = require('cors');
// Then pass them to cors:
app.use(cors(corsOptions));

app.use('/app3', express.static('public/app3'));
app.use('/app4', express.static('public/app4'));
app.use('/src', express.static('src'));



app.use("/url", function (req, res, next) {
    var nodeSSPI = require('node-sspi')
    var nodeSSPIObj = new nodeSSPI({
        retrieveGroups: true
    })
    nodeSSPIObj.authenticate(req, res, function (err) {
        res.finished || next()
    });

});

//app.use(express.static('public'));
var path = require('path');
var configJs = require(path.join(process.cwd(), 'crs.js'));
var dataConfig = configJs.configure();



var ODataServer = require('simple-odata-server');
var Adapter = require('simple-odata-server-nedb');
var sql = require("mssql");
var sqlToOdataTypes = {
    "BIGINT": "Edm.Int64",
    "BINARY": "Edm.Binary",
    "BIT": "Edm.Boolean",
    "BOOLEAN": "Edm.Boolean",
    "CHAR": "Edm.String",
    "DATE": "Edm.Date",
    "DECIMAL": "Edm.Decimal",
    "DOUBLE": "Edm.Double",
    "FLOAT": "Edm.Double",
    "INTEGER": "Edm.Int32",
    "LONGVARBINARY1": "Edm.Binary",
    "LONGVARCHAR2": "Edm.String",
    "REAL": "Edm.Single",
    "SMALLINT": "Edm.Int16",
    "TIME": "Edm.TimeOfDay",
    "TIMESTAMP": "Edm.DateTimeOffset",
    "TINYINT": "Edm.Byte | Edm.SByte3",
    "VARBINARY": "Edm.Binary",
    "VARCHAR": "Edm.String"
}

function executeSqlQuery(conConfig, query, callback) {
  
    sql.connect(conConfig, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
        request.query(query, function (err, recordset) {
            if (err) console.log(err);
            callback(recordset.recordsets[0]);
        });
    });
}

function loadData(dataSetName, callback) {
    var dataSet = dataConfig.dataSets[dataSetName];
    var conConfig = dataConfig.dataSources[dataSet.dataSource].properties;
    var db = new Datastore();
    executeSqlQuery(conConfig, dataSet.query, function (data) {
        db.insert(data, function (err, newDocs) {
            if (err) console.log(err);
            callback(db);
        });
    });
}


function queryMetadata(dataSetName, callback) {
    var dataSet = dataConfig.dataSets[dataSetName];
    var conConfig = dataConfig.dataSources[dataSet.dataSource].properties;
    var metadataQuery = `SELECT [name],system_type_name as [type] FROM [sys].[dm_exec_describe_first_result_set](N'${dataSet.query}', NULL, 0);`; //TODO экранировать '
    executeSqlQuery(conConfig, metadataQuery, function (data) {
        let itemType = {
            "_id": { "type": "Edm.String", key: true },
        }
        var model = {
            namespace: dataSetName,
            entityTypes: {
                "item": itemType
            },
            entitySets: {
                "items": {
                    entityType: "item"
                }
            }
        };
        for (let fieldInfo of data) {
            var sqlType = fieldInfo["type"].split('(')[0].toUpperCase();
            var odataType = sqlToOdataTypes[sqlType];
            if (!odataType) {
                odataType = "Edm.String";
            }
            itemType[fieldInfo.name] = { "type": odataType };
        }
  
        callback(model);
    });
}

for (var dsName in dataConfig.dataSets) {
    let dsNameLoc = dsName
    app.use("/datasets/" + dsName, (req, res) => {
 
        queryMetadata(dsNameLoc, function (model) {
            loadData(dsNameLoc, function (db) {
                var odataServer = ODataServer()
                    .model(model)
                    .adapter(Adapter(function (es, cb) { cb(null, db) }));
                odataServer.handle(req, res);
            });
        })
    });
}




app.get("/url", (req, res, next) => {

    const os = require('os');
    const userInfo = os.userInfo();

    var fs = require('fs');
    var filedata = '';
    fs.readFile('test.txt', 'utf8', function (err, data) {
        if (err) {
            return res.json(err);
        }
        var filedata = data;

        var out =
            'Hello ' +
            req.connection.user + "(" + userInfo.username + ")"
        '! Your sid is ' +
            req.connection.userSid +
            ' and you belong to following groups:<br/><ul>'
        if (req.connection.userGroups) {
            for (var i in req.connection.userGroups) {
                out += '<li>' + req.connection.userGroups[i] + '</li><br/>\n'
            }
        }
        out += '</ul>'
        out += filedata + "xxx" + __dirname + process.cwd();
        res.send(out);
    });
});


app.get("/sql", (req, res, next) => {
    var sql = require("mssql");

    // config for your database
    var config = {
        user: 'conteq',
        password: 'conteq',
        server: '192.168.0.115',
        database: 'RAOS.Extract'
    };

    sql.connect(config, function (err) {

        if (err) console.log(err);

        // create Request object
        var request = new sql.Request();

        // query to the database and get the records
        request.query('SELECT TOP (10) * FROM [RAOS.Extract].[dbo].[AllDocs]', function (err, recordset) {

            if (err) console.log(err)

            // send records as a response
            // res.send(recordset.recordset.columns);
            res.send(recordset.recordsets[0]);

        });
    });
});


app.listen(3004, () => {
    console.log("Server running on port 3004");
});