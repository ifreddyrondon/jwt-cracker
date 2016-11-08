/**
 * Created by freddyrondon on 11/5/16.
 */

'use strict';

const bigInt = require('big-integer');
const jwt = require('jsonwebtoken');

const constants = require('./constants');
const chunkSize = bigInt(constants.CHUNK_SIZE);

/**
 *
 * @param token: The current JWT token.
 * @param variations: An instance of "indexed-string-variations" already initialized with the current alphabet.
 * @param batch: An array containing two strings representing the segment of the solution space where we search for the
 * password (e.g ['22', '150']).
 * @param cb: A callback function that will be invoked on completion. If the password is found in the current index as
 * argument. Otherwise, it will be called without arguments.
 */
const ProcessBatch = (token, variations, batch, cb) => {

    const processChunk = (from, to) => {
        let pwd;

        for (let i = from; i.lesser(to); i = i.add(bigInt.one)) {
            pwd = variations(i);
            try {
                jwt.verify(token, pwd, {ignoreExpiration: true, ignoreNotBefore: true});
                return cb(pwd, i.toString())
            } catch (e) {

            }
        }

        // prepare next chunck
        from = to;
        to = bigInt.min(batchEnd, from.add(chunkSize));

        if (from === to) {
            // finished, password not found
            return cb();
        }

        // process next chunk
        setImmediate(() => processChunk(from, to))
    };

    const batchStart = bigInt(batch[0]);
    const batchEnd = bigInt(batch[1]);

    const firstChunkStart = batchStart;
    const firstChuckEnd = bigInt.min(batchEnd, batchStart.add(chunkSize));

    setImmediate(() => processChunk(firstChunkStart, firstChuckEnd))
};

module.exports = ProcessBatch;
