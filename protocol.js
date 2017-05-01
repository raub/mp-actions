'use strict';

const crypto = require('crypto');


/**
 * Network identity carrier
 * @author Luis Blanco
 * @memberof RauNet
 */
class Protocol {
	
	/**
	 * @constructs Protocol
	 * @desc Constructs Protocol, with given options
	 * @arg {Object} opts options
	 * @arg {String} [opts.version] Protocol version
	 * @arg {String} [opts.v] same as opts.version
	 * @arg {Object} opts.dict messageName->channelName
	 * @return {Protocol} instance
	 */
	constructor(opts) {
		
		this._version = '' + (opts.version || 'none');
		this._actions = opts.actions;
		
		
		
		const hash = crypto.createHash('sha256');
		hash.update(this._version + JSON.stringify(this._actions));
		this._identity = hash.digest('hex');
		
	}
	
	
	/**
	 * Decides a channel for the given message id
	 * @return {String} id Message name
	 */
	getChannel(action) {
		return this._actions[action].reliable && 'tcp' || 'udp';
	}
	
	/**
	 * Protocol identity version
	 * @return {String} version
	 */
	get version() { return this._version; }
	/**
	 * Protocol identity version
	 * @return {String} version
	 */
	get v() { return this._version; }
	
	
	/**
	 * Protocol identity
	 * @return {String} identity
	 */
	get identity() { return this._identity; }
	
	
}

module.exports = Protocol;
