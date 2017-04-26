'use strict';

/**
 * Network identity
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
		
		this._version = '' + (opts.version || opts.v || 'none');
		this._dict = {};
		
		this._tcp = [];
		this._udp = [];
		
		Object.keys(opts.dict).forEach((key) => {
			
			this._dict[key] = opts.dict[key] === 'udp' ? 'udp' : 'tcp';
			this['_' + this._dict[key]].push(key);
			
		});
		
		this._identity = this._version + JSON.stringify(this._dict);
		
	}
	
	
	/**
	 * Decides a channel for the given message id
	 * @return {String} id Message name
	 */
	getChannel(id) {
		return this._dict[id] || 'tcp';
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
