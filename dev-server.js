#!/usr/bin/env node
'use strict'


var express = require("express");
var app = express();

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

var utils = require("./utils");
app.use(express.json());
app.use("/datasets", function (req, res) {
    utils.readDataConfig();
    var aurl = req.url.split('/');
    var dsName = aurl[1];
    var subUrl = aurl[2];
    subUrl = subUrl || "-";

    switch (subUrl) {
        case 'data':
            utils.queryData(dsName, req.body).then(function (data) {
                res.send(data);
            });
            break;
        case 'metadata':
            utils.queryMetadata(dsName).then(function (model) {
                res.send(model);
            })
            break;
        case '-':
            if (dsName) {
                res.send(["data", "metadata"]);
            } else {
                var dsList = utils.getRemoteDataSetsNames();
                res.send(dsList);
            }

            break;
    }
});

app.use("/url", function (req, res, next) {
    var nodeSSPI = require('node-sspi')
    var nodeSSPIObj = new nodeSSPI({
        retrieveGroups: true
    })
    nodeSSPIObj.authenticate(req, res, function (err) {
        res.finished || next()
    });

});

app.get("/test", (req, res, next) => {
    res.send("Ок");
});


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



exports.run = function (port) {
    require("colors");
    app.listen(port, () => {
        console.log("Development server running: " + ("http://localhost:" + port + "/datasets").blue);
    });
}
