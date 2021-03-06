/* eslint-disable @typescript-eslint/no-var-requires */
const { readFileSync } = require('fs');
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const csv = require('csvtojson');
const multer = require('multer');
const { startMongo } = require('./mongo-server');
const { createProxyMiddleware } = require('http-proxy-middleware');

const meow = require('meow');
const upload = multer();

function _loadData(data, config, client, onsuccess, onerror, collname = null) {
  client.connect(function(err) {
    assertIsConnected(client, err);
    const db = client.db(config.dbname);
    collname = collname || config.defaultCollection;
    const collection = db.collection(collname);
    collection.deleteMany({}, function(err) {
      if (err) {
        onerror(err);
      } else {
        collection.insertMany(data, function(err) {
          if (err) {
            onerror(err);
          } else {
            onsuccess({
              collection: collname,
            });
          }
        });
      }
    });
  });
}

/**
 *
 * @param filepath path to CSV file
 * @param config database config
 * @param client mongo client
 * @param onsuccess callback to call on success
 * @param onerror callback to call on error
 */
function loadCSVInDatabaseFromFile(filepath, config, client, onsuccess, onerror) {
  csv({ checkType: true })
    .fromFile(filepath)
    .then(data => _loadData(data, config, client, onsuccess, onerror));
}

function loadCSVInDatabase(data, collname, config, client, onsuccess, onerror) {
  csv({
    checkType: true,
    ignoreEmpty: true,
    output: 'json',
  })
    .fromString(data)
    .then(data => _loadData(data, config, client, onsuccess, onerror, collname));
}

/**
 * assert client is actually connected to a mongo backend and crash otherwise.
 *
 * @param client mongo client
 * @param err mongo error, if any
 */
function assertIsConnected(client, err) {
  if (err || !client.isConnected()) {
    let msg = 'Failed to connect to database';
    if (err) {
      msg += `becase ${err}`;
    }
    throw new Error(msg);
  }
}

/**
 * Transform an aggregation query into a `$facet` one so that we can get in a single
 * query both total query count (independently of `$limit` or `$skip` operators) and
 * the query results.
 *
 * @param {Array} query the initial aggregation query
 * @return the transformed `$facet` query
 */
function facetize(query, limit, skip) {
  if (!query.length) {
    query.push({
      $match: {},
    });
  }
  return [
    ...query,
    {
      $facet: {
        stage1: [{
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
          },
        }, ],
        stage2: [{
          $skip: skip,
        },
        {
          $limit: limit,
        },
        ],
        stage3: [{
          $skip: skip,
        }, {
          $limit: limit,
        },
        {
          $group: {
            _id: null,
            _vqbAppArray: {
              $push: '$$ROOT'
            }
          }
        },
        {
          $unwind: {
            path: "$_vqbAppArray",
            includeArrayIndex: "_vqbAppIndex"
          }
        },
        {
          $project: {
            _vqbAppArray: {
              $objectToArray: '$_vqbAppArray',
            },
            _vqbAppIndex: 1
          },
        },
        {
          $unwind: '$_vqbAppArray',
        },
        {
          $project: {
            column: '$_vqbAppArray.k',
            type: {
              $type: '$_vqbAppArray.v',
            },
            _vqbAppIndex: 1
          },
        },
        {
          $group: {
            _id: '$_vqbAppIndex',
            _vqbAppArray: {
              $addToSet: {
                column: '$column',
                type: '$type',
              },
            },
          },
        },
        {
          $project: {
            _vqbAppTmpObj: {
              $arrayToObject: {
                $zip: {
                  inputs: ['$_vqbAppArray.column', '$_vqbAppArray.type'],
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$_vqbAppTmpObj',
          },
        },
        ],
      },
    },

    {
      $unwind: '$stage1',
    },

    //output projection
    {
      $project: {
        count: '$stage1.count',
        data: '$stage2',
        types: '$stage3',
      },
    },
  ];
}

/**
 * execute `query` on `collectionName` inside the mongodatabase
 *
 * @param config database config
 * @param client mongo client
 * @param collectionName the name of the collection to query
 * @param query the mongo query
 * @param onsuccess callback to call on success with results
 * @param onerror callback to call on error
 */
function executeQuery(config, client, collectionName, query, limit, skip, onsuccess, onerror) {
  client.connect(function(err) {
    assertIsConnected(client, err);
    const db = client.db(config.dbname);
    const collection = db.collection(collectionName);
    try {
      collection.aggregate(facetize(query, limit, skip)).toArray(function(err, docs) {
        if (err) {
          onerror(err);
        } else {
          if (docs.length) {
            onsuccess(docs);
          } else {
            onsuccess([{ count: 0, data: 0 }])
          }
        }
      });
    } catch (err) {
      onerror(err);
    }
  });
}

/**
 * list collections in mongo database
 *
 * @param config database config
 * @param client mongo client
 * @param onsuccess callback to call on success with the list of collections
 * @param onerror callback to call on error
 */
function listCollections(config, client, onsuccess, onerror) {
  client.connect(function(err) {
    assertIsConnected(client, err);
    const db = client.db(config.dbname);
    db.listCollections().toArray((err, results) => {
      if (err) {
        onerror(err);
      } else {
        onsuccess(results.map(collectionInfos => collectionInfos.name).sort());
      }
    });
  });
}

function _testConnection(client) {
  client.connect(function() {});
}

function setupApp(config) {
  const client = new MongoClient(config.dburi, { useNewUrlParser: true, useUnifiedTopology: true });
  _testConnection(client);
  if (config.reset) {
    loadCSVInDatabaseFromFile(config.defaultDataset, config, client, console.error);
  }
  const app = express();

  // Reverse proxy to pandas backend
  // Should be done *before* applying the bodyparser
  app.use(createProxyMiddleware('/pandas-backend', {
    target: 'http://localhost:5000',
    pathRewrite: {'^/pandas-backend': ''},
  }));

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));
  // parse application/json
  app.use(bodyParser.json());

  app.post('/query', (req, res) => {
    executeQuery(
      config,
      client,
      req.body.collection,
      req.body.query,
      req.body.limit,
      req.body.skip,
      res.json.bind(res),
      function(err) {
        res.status(400).send(err);
        console.error(err);
      },
    );
  });

  app.post('/load', upload.single('file'), (req, res) => {
    const csvString = req.file.buffer.toString('utf8');
    const newConfig = { ...config };
    loadCSVInDatabase(
      csvString,
      req.file.filename || req.file.originalname,
      newConfig,
      client,
      res.json.bind(res),
      console.error,
    );
  });

  app.get('/collections', (req, res) => {
    listCollections(config, client, res.json.bind(res), console.error);
  });

  app.use(express.static(__dirname + '/dist'));
  return app;
}

function parseCommandLine() {
  const cli = meow(
    `
  Usage
    $ node server.js [options]

  where options are:
    --configfile         path to configuration file,
                         default is ${__dirname}/playground.config.json

    --dburi               override "dburi" option from config file,
                          default is "mongodb://localhost:27107"

    --dbname              override "dbname" option from config file,
                          default is "playground-db"

    --defaultCollection   override "defaultCollection" option from config file,
                          default is "sales"

    --reset               reset default collection, override "reset" option from config file,
                          default is false

    --automongo           download (only the first time) and execute a local, ephemeral,
                          mongo server. If present, "--dburi" is ignored.

    --defaultDataset      path to dataset to load in database
                          default is ${__dirname}/datastore/sales.csv

    --httpPort / -p       override "httpPort" option from config file,
                          default is 3000
  `,
    {
      flags: {
        configfile: {
          type: 'string',
          alias: 'c',
          default: `${__dirname}/playground.config.json`,
        },
        dburi: {
          type: 'string',
          default: null,
        },
        dbname: {
          type: 'string',
          default: null,
        },
        httpPort: {
          type: 'string',
          alias: 'p',
          default: null,
        },
        defaultCollection: {
          type: 'string',
          alias: 'C',
          default: null,
        },
        reset: {
          type: 'boolean',
          default: false,
        },
        automongo: {
          type: 'boolean',
          default: false,
        },
        defaultDataset: {
          type: 'string',
          alias: 'D',
          default: `${__dirname}/datastore/sales.csv`,
        },
      },
    },
  );
  const config = {
    ...JSON.parse(readFileSync(cli.flags.configfile).toString()),
  };
  for (const opt of [
    'dburi',
    'dbname',
    'httpPort',
    'dburi',
    'defaultCollection',
    'reset',
    'automongo',
    'defaultDataset',
  ]) {
    const envVar = `VQB_PLAYGROUND_${opt.toUpperCase()}`;
    if (cli.flags[opt]) {
      config[opt] = cli.flags[opt];
    } else if (process.env[envVar]) {
      config[opt] = process.env[envVar];
    }
  }
  return config;
}

function start(config) {
  setupApp(config).listen(process.env.PORT || config.httpPort, function() {
    console.log(`VQB playground app listening on port ${config.httpPort}!`);
  });
}

const config = parseCommandLine();
if (config.automongo) {
  startMongo(config).then(({ tmpdir }) => {
    process.on('exit', () => {
      tmpdir.removeCallback();
    });
    start(config);
  });
} else {
  start(config);
}
