'use strict';

const EventEmitter = require('events');
const zlib = require('zlib');


/**
 * Base networking entity
 * @note This class is not for use on it's own
 * @author Luis Blanco
 * @extends EventEmitter
 * @memberof RauNet
 */
class Base extends EventEmitter {
	
	
	/**
	 * @constructs Base
	 * @desc Constructs Base, with some optional parameters.
	 * @arg {Protocol} protocol The network identity
	 * @return {Base} instance
	 */
	constructor(protocol) {
		
		super();
		
		this._isOpen   = false;
		this._protocol = protocol;
		
	}
	
	
	/**
	 * Marks network entity as active, open
	 * @arg {function} cb
	 */
	open(cb) {
		this._isOpen = true;
		cb();
	}
	
	
	/**
	 * Marks network entity as inactive, closed
	 * @arg {function} cb
	 */
	close(cb) {
		this._isOpen = false;
		cb();
	}
	
	
	/**
	 * Decodes network message
	 * @arg {data} data compressed network message
	 * @arg {function} cb
	 */
	decode(data, cb) {
		zlib.unzip(data, (err, buffer) => cb(err, err ? null : JSON.parse(buffer)));
	}
	
	
	/**
	 * Encodes network message
	 * @arg {Object} msg Object to be compressed
	 * @arg {function} cb
	 */
	encode(msg, cb) {
		const data = JSON.stringify(msg);
		
		zlib.deflate(data, (err, buffer) => {
			if ( ! err ) {
				cb(null, buffer);
			} else {
				// handle error
				cb(err);
			}
		});
	}
	
	
	/**
	 * Network entity state
	 * @return {Boolean} network entity state
	 */
	get isOpen() { return this._isOpen; }
	
	
	/**
	 * Network protocol identity
	 * @return {Protocol} network protocol identity
	 */
	get protocol() { return this._protocol; }
	
	
}


module.exports = Base;
