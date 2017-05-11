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
		
		if (opts.actions.__SVC) {
			console.warn('Action name "__SVC" is forbidden.');
			delete opts.actions.__SVC;
		}
		
		this._actionKeys = Object.keys(opts.actions).sort();
		this._actions = this._actionKeys.map((type, index) => {
			return {
				index   : index + 1,
				type    : type,
				reliable: opts.actions[type].reliable && true || false,
				client  : opts.actions[type].client   && true || false,
				reset   : opts.actions[type].reset    && true || false,
			};
		});
		
		this._actionKeys.unshift('__SVC');
		this._actions.unshift({
			index   : 0,
			type    : '__SVC',
			reliable: true,
			client  : false,
			reset   : false,
		});
		
		const hash = crypto.createHash('sha256');
		hash.update(this._version + JSON.stringify(this._actions));
		this._identity = hash.digest('hex');
		
		this.isClient   = {};
		this.isReliable = {};
		this.isReset    = {};
		
		this._index    = {};
		this._encoders = {};
		this._decoders = {};
		
		this._actions.forEach(action => {
			
			this.isReliable[action.type] = action.reliable;
			this.isClient[action.type]   = action.client;
			this.isReset[action.type]    = action.reset;
			this._index[action.type]     = action.index;
			
			this._encoders[action.type] = opts.actions[action.type] && opts.actions[action.type].encode || this.encodeDefault;
			this._decoders[action.type] = opts.actions[action.type] && opts.actions[action.type].decode || this.decodeDefault;
			
		});
		
		// Plus 1 system action #0 accounted
		const lastId = this._actions.length;
		if (lastId >> 8 === 0) {
			this._pushIndex = 'pushUint8';
			this._pullIndex = 'pullUint8';
		} else if (lastId >> 16 === 0) {
			this._pushIndex = 'pushUint16';
			this._pullIndex = 'pullUint16';
		} else {
			this._pushIndex = 'pushUint32';
			this._pullIndex = 'pullUint32';
		}
		
	}
	
	
	/**
	 * Decodes network message
	 * @arg {data} data compressed network message
	 * @arg {function} cb
	 */
	decodeDefault(binary) {
		
		const str = binary.readString();
		
		let data;
		try {
			data = (JSON.parse(str))[0];
		} catch (err) {
			return null;
		}
		
		return data;
		
	}
	
	
	/**
	 * Encodes network message, the default way
	 * @arg {Object} msg Object to be compressed
	 * @arg {function} cb
	 */
	encodeDefault(binary, data) {
		
		let str;
		try {
			str = JSON.stringify([data]);
		} catch (err) {
			return binary.writeString('[null]');
		}
		binary.writeString(str);
		
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
	
	
	encode(binary, action) {
		
		binary[this._pushIndex](this._index[action.type]);
		this._encoders[action.type](binary, action.data);
		
	}
	
	
	decode(binary) {
		
		const index = binary[this._pullIndex]();
		const type = this._actionKeys[index];
		const data = this._decoders[type](binary);
		return { type, data };
		
	}
	
	
}

module.exports = Protocol;
