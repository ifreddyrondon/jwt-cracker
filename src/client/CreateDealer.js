/**
 * Created by freddyrondon on 11/5/16.
 */

'use strict';

const generator = require('indexed-string-variation').generator;

const ProcessBatch = require('./ProcessBatch');


/**
 *
 * @param batchSocket: the ZeroMQ socket used to implement the dealer part of the router/dealer pattern.
 * @param exit: a function to end the process (it will generally be process.exit ).
 * @param logger: a logger object (the console or a winston logger instance).
 * @returns {function(*)}
 * @constructor
 */
const CreateDealer = (batchSocket, exit, logger) => {

    let id;
    let variations;
    let token;

    return rawMessage => {
        const msg = JSON.parse(rawMessage.toString());

        const start = mgs => {
            id = mgs.id;
            variations = generator(msg.alphabet);
            token = msg['token'];
            logger.info(`client attached, got id "${id}"`)
        };

        const batch = msg => {
            logger.info(`recived batch: ${msg['batch'][0]}-${msg['batch'][1]}`);
            ProcessBatch(token, variations, msg['batch'], (pwd, index) => {
                if (typeof pwd === 'undefined') {
                    // request next batch
                    logger.info('password not found, requesting new batch');
                    batchSocket.send(JSON.stringify({type: 'next'}));
                } else {
                    logger.info(`found password "${pwd}" (index: ${index}), exiting now`);
                    batchSocket.send(JSON.stringify({type: 'success', password: pwd, index}));
                    exit(0);
                }
            })
        };

        switch (msg.type) {
            case 'start':
                start(msg);
                batch(msg);
                break;

            case 'batch':
                batch(msg);
                break;

            default:
                logger.error('invalid message received form server', rawMessage.toString());
        }
    };

};

module.exports = CreateDealer;
