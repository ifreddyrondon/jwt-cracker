/**
 * Created by freddyrondon on 11/5/16.
 */

'use strict';

const zmq = require('zmq');
const indexedStringVariation = require('indexed-string-variation');
const yargs = require('yargs');
const jwt = require('jsonwebtoken');
const bigInt = require('big-integer');

const CreateRouter = require('./factories/CreateRouter');
const logger = require('./../loggers/Logger');


const argv = yargs
    .usage('Usage: $0 <token> [options]')
    .example('$0 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ')
    .demand(1)
    .number('port')
    .default('port', 9900)
    .alias('p', 'port')
    .describe('port', 'The port used to accept incoming connections')
    .number('pubPort')
    .default('pubPort', 9901)
    .alias('P', 'pubPort')
    .describe('pubPort', 'The port used to publish signals to all the workers')
    .string('alphabet')
    .default('alphabet', indexedStringVariation.defaultAlphabet)
    .alias('a', 'alphabet')
    .describe('alphabet', 'The alphabet used to generate the passwords')
    .number('batchSize')
    .default('batchSize', 1000000)
    .alias('b', 'batchSize')
    .describe('batchSize', 'The number of attempts assigned to every client in a batch')
    .number('start')
    .default('start', 0)
    .alias('s', 'start')
    .describe('start', 'The index from where to start the search')
    .help()
    .version()
    .check(args => {
        const token = jwt.decode(args._[0], {complete: true});
        if (!token) {
            throw new Error('Invalid JWT token: cannot decode token');
        }

        if (!(token.header.alg === 'HS256' && token.header.typ === 'JWT')) {
            throw new Error('Invalid JWT token: only HS256 JWT tokens supported');
        }

        return true
    })
    .argv;

const token = argv._[0];
const port = argv.port;
const pubPort = argv.pubPort;
const alphabet = argv.alphabet;
const batchSize = bigInt(String(argv.batchSize));
const start = argv.start;
const batchSocket = zmq.socket('router');
const signalSocket = zmq.socket('pub');
const router = CreateRouter(
    batchSocket,
    signalSocket,
    token,
    alphabet,
    batchSize,
    start,
    logger,
    process.exit
);

batchSocket.on('message', router);

batchSocket.bindSync(`tcp://*:${port}`);
signalSocket.bindSync(`tcp://*:${pubPort}`);
logger.info(`Server listening on port ${port}, signal publish on port ${pubPort}`);
