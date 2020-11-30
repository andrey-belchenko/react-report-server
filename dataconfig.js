var getSql = function (name) {
  let fs = require('fs');
  var queryText = fs.readFileSync("./queries/" + name+".sql", 'utf8');
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
      report: {
        dataSource: "dataMart",
        procedure: "[report].[GetReportActualByMonth]"
      },
      list: {
        dataSource: "dataMart",
        procedure: "[report].[GetFilterProject]"
      },
      taskList: {
        dataSource: "dataMart",
        query: "select top 100 * from [data].[DimTask]"
      },
      projTaskList: {
        dataSource: "dataMart",
        query: getSql("projTaskList"),// "select  * from [data].[DimTask] where [ProjectUID]=@ProjectUID",
        paramsExample: {
          ProjectUID: ""
        }
      },
      year: { example: 0 },
      month: { example: 0 },
      ProjectUID: { example: "" }
    }
  }
};