var getSql = function (name) {
  let fs = require('fs');
  var queryText = fs.readFileSync("./queries/" + name + ".sql", 'utf8');
  return queryText;
}

exports.configure = function () {

  return {
    dataSources: {
      dataMart: {
        type: "MSSQL",
        properties: {
          user: 'conteq',
          password: 'conteq',
          server: 'bi-serv01',
          database: 'LMGT.DataMart'
        }
      }
    },
    data: {
      rmData: {
        dataSource: "dataMart",
        query: getSql("rmData"),
        paramsExample: {
          timeStep: "Month"
        }
      },
      timeStepList: { example: [{ id: '', name: '' }] },
      timeStep:{example:''},
      startDate:{example:new Date()},
      endDate:{example:new Date()},
    }
  }
};