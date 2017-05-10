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
	
	
	constructor(tcp, udp) {
		
		super();
		
		this._tcp = tcp;
		this._udp = tcp;
		
		this._name = this._tcp.remoteAddress + ':' + this._tcp.remotePort;
		
		this._pending = 0;
		this._receivedTcp = new Binary();
		
		this._receivedUdp = new Binary();
		
		this._tcp.on('data', this._accumulate.bind(this));
		
	}
	
	
	_accumulate(data) {
		
		this._receivedTcp.accumulate(data);
		
		if (this._pending === 0) {
			this._pending = this._receivedTcp.pullUint16();
		}
		
		if (this._pending <= this._receivedTcp.size) {
			this.emit('packet', this._receivedTcp);
			this._receivedTcp.flush(this._pending);
			this._pending = 0;
		}
		
	}
	
	
	receiveUdp(data) {
		
		this._receivedTcp.accumulate(data);
		
		const pending = this._receivedUdp.pullUint16();
		
		if (pending === this._receivedUdp.size) {
			this.emit('packet', this._receivedUdp);
			this._receivedUdp.flush(this._pending);
		}
		
	}
	
	
	writeTcp(binary) {
		
		this._tcp.write(binary.toBuffer());
		
	}
	
	
	writeUdp(binary) {
		
		const buffer = binary.toBuffer();
		this._udp.send(buffer, 0, buffer.length, this._tcp.remotePort + 1, this._tcp.remoteAddress);
		
	}
	
	
}

module.exports = DuoSocket;
