'use strict';

/**
 * Network address IP+port
 * @author Luis Blanco
 * @memberof RauNet
 */
class Address {
	
	/**
	 * @constructs Address
	 * @desc Constructs Address, with given ip and port
	 * @arg {String} host Address IP
	 * @arg {Number} port Address port
	 * @return {Address} instance
	 */
	constructor(host, port) {
		
		this._host = host || 'localhost';
		this._port = port || 27666;
		
	}
	
	
	/**
	 * IP address
	 * @return {String} ip address
	 */
	get ip() { return this._host; }
	
	
	/**
	 * IP address
	 * @return {String} ip address
	 */
	get host() { return this._host; }
	
	
	/**
	 * Port number
	 * @return {Number} port number
	 */
	get port() { return this._port; }
	
	
	/**
	 * Stringifies the address
	 * @return {String} stringified address
	 */
	toString() {
		return this._host + ':' + this._port;
	}
	
	/**
	 * Stringified address
	 * @return {String} stringified address
	 */
	get inline() { return this.toString(); }
	
	/**
	 * Stringified address
	 * @return {String} stringified address
	 */
	get asString() { return this.toString(); }
	
	/**
	 * Stringified address
	 * @return {String} stringified address
	 */
	get stringified() { return this.toString(); }
	
}

module.exports = Address;
