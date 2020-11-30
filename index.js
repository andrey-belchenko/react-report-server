#!/usr/bin/env node

require('colors');

require('yargs')
    .scriptName("react-report-server")
    .usage('$0 <cmd> [args]')
    .command('start', '(start development server with API based on dataconfig.js)', (yargs) => {
        yargs.option("p", { alias: "port", describe: "Port number", type: "number" })
    }, function (argv) {
        var ds = require("./dev-server");
        var port = argv.port;
        if (!port) {
            port = 3004;
        }
        ds.run(port);
    })
    .command(['generate-client', 'gc'], '(generate report API client for access to report server API based on dataconfig.js)', (yargs) => {

    }, function (argv) {
        let cg = require("./client-generator");
        var fileName = '1.txt';
        cg.generate(fileName).then(() => {
            console.log(('report API client generated: ' + fileName).green);
            process.exit();
        });

    })
    .demandCommand()
    .help()
    .argv;