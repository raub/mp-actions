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
		
		this._tcp.setNoDelay();
		
		this._name = this._tcp.remoteAddress + ':' + this._tcp.remotePort;
		
		this._pending = 0;
		this._receivedTcp = new Binary();
		
		this._receivedUdp = new Binary();
		
		this._tcp.on('data', this._accumulate.bind(this));
		
	}
	
	
	_accumulate(data) {
		
		this._receivedTcp.accumulate(data);
		console.log(this.name, 'ACCUM', data.length);
		if (this._pending === 0) {
			this._receivedTcp.pos = 0;
			this._pending = this._receivedTcp.pullUint16();
			this._receivedTcp.pos = this._receivedTcp.size;
			console.log(this.name, 'PEND', this._pending);
		}
		
		console.log(this.name, 'CHECK SIZE', this._pending, this._receivedTcp.size);
		if (this._pending <= this._receivedTcp.size) {
			this.emit('packet', this._receivedTcp);
			this._receivedTcp.flush(this._pending);
			this._pending = 0;
		}
		
	}
	
	
	receiveUdp(data) {
		
		this._receivedUdp.accumulate(data);
		this._receivedUdp.pos = 0;
		
		const pending = this._receivedUdp.pullUint16();
		
		if (pending === this._receivedUdp.size) {
			this.emit('packet', this._receivedUdp);
			this._receivedUdp.flush(this._pending);
		}
		
	}
	
	
	writeTcp(binary) {
		
		const buffer = binary.toBuffer();
		this._tcp.write(buffer);
		console.log(this.name, 'TCP SENT:', buffer.length);
		
	}
	
	
	writeUdp(binary) {
		
		const buffer = binary.toBuffer();
		this._udp.send(buffer, 0, buffer.length, this._tcp.remotePort + 1, this._tcp.remoteAddress);
		
	}
	
	
}

module.exports = DuoSocket;
