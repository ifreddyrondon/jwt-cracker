/**
 * Created by freddyrondon on 11/5/16.
 */

'use strict';

/**
 *
 * @param subSocket: the ZeroMQ socket used for the publish/subscriber messages.
 * @param batchSocket: the ZeroMQ socket used for the router/dealer message exchange (as we saw in the CreateDealer module).
 * @param exit: a function to end the process (it will generally be process.exit ).
 * @param logger: a logger object (the console or a winston logger instance).
 * @returns {function(*, *)}
 * @constructor
 */
const CreateSubscriber = (subSocket, batchSocket, exit, logger) => {
    return (topic, rawMessage) => {
        if (topic.toString() === 'exit') {
            logger.info(`received exit signal, ${rawMessage.toString()}`);
            batchSocket.close();
            subSocket.close();
            exit(0);
        }
    }
};

module.exports = CreateSubscriber;

