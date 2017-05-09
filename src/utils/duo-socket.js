'use strict';

const EventEmitter = require('events');

const Binary = require('./binary');


/**
 * Network server
 * @author Luis Blanco
 * @extends EventEmitter
 */
class DuoSocket extends EventEmitter {
	
	
	get name() { return this._name; }
	get received() { return this._received; }
	get sending() { return this._sending; }
	
	
	constructor(tcp) {
		
		super();
		
		this._tcp = tcp;
		this._name = this._tcp.remoteAddress + ':' + this._tcp.remotePort;
		
		this._pending = 0;
		this._received = new Binary();
		
		this._tcp.on('data', this._accumulate.bind(this));
		
	}
	
	
	_accumulate(data) {
		
		this._binary.accumulate(data);
		
		if (this._pending === 0) {
			this._pending = this._binary.pullUint16();
		}
		
		if (this._pending <= this._binary.size) {
			this.emit('packet', this._binary);
			this._binary.flush(this._pending);
			this._pending = 0;
		}
		
	}
	
	
	
	
}

module.exports = DuoSocket;
