'use strict';

const crypto = require('crypto');


/**
 * Network identity carrier
 * @author Luis Blanco
 */
class Protocol {
	
	/**
	 * @constructs Protocol
	 * @desc Constructs Protocol with given options
	 * @arg {Object} opts options
	 * @arg {String} [opts.version] Protocol version
	 * @arg {Object} opts.actions type -> description
	 * @return {Protocol} instance
	 */
	constructor(opts) {
		
		this._version = '' + (opts.version || 'none');
		
		this._actionKeys = Object.keys(opts.actions).sort();
		this._actions = this._actionKeys.map((type, index) => {
			return {
				index,
				type,
				reliable: opts.actions[type].reliable && true || false,
				client  : opts.actions[type].client   && true || false,
			};
		});
		
		const hash = crypto.createHash('sha256');
		hash.update(this._version + JSON.stringify(this._actions));
		this._identity = hash.digest('hex');
		
		this.isClient = {};
		this.isReliable = {};
		this._index = {};
		this._actions.forEach(action => {
			this.isReliable[action.type] = action.reliable;
			this.isClient[action.type] = action.client;
			this._index[action.type] = action.index;
		});
		
		if (this._actions.length >> 8 === 0) {
			this._pushIndex = 'pushUint8';
			this._pullIndex = 'pullUint8';
		} else if (this._actions.length >> 16 === 0) {
			this._pushIndex = 'pushUint16';
			this._pullIndex = 'pullUint16';
		} else {
			this._pushIndex = 'pushUint32';
			this._pullIndex = 'pullUint32';
		}
		this.encodeIndex = function (binary, index) {
			binary[this._pushIndex](index);
		};
		this.decodeIndex = function (binary) {
			return binary[this._pullIndex]();
		};
		
	}
	
	
	/**
	 * Protocol identity version
	 * @return {String} version
	 */
	get version() { return this._version; }
	
	
	/**
	 * Protocol identity
	 * @return {String} identity
	 */
	get identity() { return this._identity; }
	
	
}

module.exports = Protocol;
