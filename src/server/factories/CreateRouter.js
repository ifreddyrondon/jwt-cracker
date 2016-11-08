/**
 * Created by freddyrondon on 11/5/16.
 */

'use strict';

const bigInt = require('big-integer');

/**
 *
 * @param batchSocket: is the ZeroMQ socket used to send the batch request to the clients.
 * @param signalSocket: is the ZeroMQ socket to publish the exit signal to all the clients.
 * @param token: the string containing the current token.
 * @param alphabet: the alphabet ised to build the strings in the solution space.
 * @param batchSize: the number of strings in every batch
 * @param start: the index from which to start the first batch (generally '0').
 * @param logger: an instance of the logger.
 * @param exit: a function to be called to shut down the application (usually process.exit).
 * @returns {function(*=, *)}
 * @constructor
 */
const CreateRouter = (batchSocket, signalSocket, token, alphabet, batchSize, start, logger, exit) => {
    let cursor = bigInt(String(start));
    const clients = new Map();

    const assignNextBatch = client => {
        const from = cursor;
        const to = cursor.add(batchSize).minus(bigInt.one);
        const batch = [from.toString(), to.toString()];
        cursor = cursor.add(batchSize);
        client.currentBatch = batch;
        client.currentBatchStartedAt = new Date();

        return batch;
    };

    const addClient = channel => {
        const id = channel.toString('hex');
        const client = {id, channel, joinedAt: new Date()};
        assignNextBatch(client);
        clients.set(id, client);

        return client
    };

    const router = (channel, rawMessage) => {
        const msg = JSON.parse(rawMessage.toString());

        switch (msg.type) {
            case 'join': {
                const client = addClient(channel);
                const response = {
                    type: 'start',
                    id: client.id,
                    batch: client.currentBatch,
                    alphabet,
                    token
                };
                batchSocket.send([channel, JSON.stringify(response)]);
                logger.info(`${client.id} joined (batch: ${client.currentBatch[0]}-${client.currentBatch[1]})`);
                break;
            }
            case 'next': {
                const batch = assignNextBatch(clients.get(channel.toString('hex')));
                batchSocket.send([channel, JSON.stringify({type: 'batch', batch})]);
                logger.info(`client ${channel.toString('hex')} requested new batch, sending ${batch[0]}-${batch[1]}`);
                break;
            }
            case 'success': {
                const pwd = msg.password;
                logger.info(`client ${channel.toString('hex')} found password "${pwd}"`);
                // publish exit signal and closes the app
                signalSocket.send(['exit', JSON.stringify({password: pwd, client: channel.toString('hex')})], 0, () => {
                    batchSocket.close();
                    signalSocket.close();
                    exit(0);
                });
                break;
            }

            default: {
                logger.error('invalid message received from channel', channel.toString('hex'), rawMessage.toString());
            }
        }
    };

    router.getClients = () => clients;

    return router;
};

module.exports = CreateRouter
