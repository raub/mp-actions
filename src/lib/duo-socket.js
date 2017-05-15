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
	get time() { return this._time; }
	
	
	constructor(tcp, udp) {
		
		super();
		
		this._tcp = tcp;
		this._udp = udp;
		
		this._tcp.setNoDelay();
		
		this._name = this._tcp.remoteAddress + ':' + this._tcp.remotePort;
		
		this._pending = 0;
		this._receivedTcp = new Binary();
		
		this._receivedUdp = new Binary();
		
		this._tcp.on('data', this._accumulate.bind(this));
		
		this._time = 0;
		
	}
	
	
	timeCAS(newTime) {
		if (newTime >= this._time || this._time - newTime > 0x0FFF) {
			// console.log('CAS', this._time, '<', newTime);
			this._time = newTime;
			return true;
		}
		return false;
	}
	
	
	_accumulate(data) {
		
		this._receivedTcp.accumulate(data);
		
		if (this._pending === 0) {
			
			if (this._receivedTcp.size < 2) {
				return;
			}
			
			this._receivedTcp.pos = 0;
			this._pending = this._receivedTcp.pullUint16();
			this._receivedTcp.pos = this._receivedTcp.size;
			
			// console.log(this.name, 'PEND', this._pending, 'of', this._receivedTcp.size);
			
		}
		
		// console.log(this.name, 'CHECK', this._pending, 'of', this._receivedTcp.size);
		while (this._pending > 0 && this._pending <= this._receivedTcp.size) {
			
			// console.log(this.name, 'TCP PACK', this._pending);
			
			this._receivedTcp.pos = 2;
			this._receivedTcp.pushUint16(this._time);
			
			this.emit('packet', this._receivedTcp, this);
			this._receivedTcp.flush(this._pending);
			
			// console.log(this.name, 'LOOKAT', this._receivedTcp.size);
			if (this._receivedTcp.size > 1) {
				this._pending = this._receivedTcp.pullUint16();
			} else {
				// console.log(this.name, 'NEXT', this._receivedTcp.size);
				this._receivedTcp.pos = this._receivedTcp.size;
				this._pending = 0;
			}
			
		}
		
	}
	
	
	receiveUdp(data) {
		
		this._receivedUdp.accumulate(data);
		this._receivedUdp.pos = 0;
		
		const pending = this._receivedUdp.pullUint16();
		// console.log('UDP PACK', pending);
		if (pending === this._receivedUdp.size) {
			this.emit('packet', this._receivedUdp, this);
		} else {
			console.warn('A faulty udp packet received!');
		}
		this._receivedUdp.flush(this._pending);
		
	}
	
	
	writeTcp(binary) {
		
		const buffer = binary.toBuffer();
		this._tcp.write(buffer);
		// console.log(this.name, 'TCP SENT:', buffer.length);
		
	}
	
	
	writeUdp(binary) {
		
		const buffer = binary.toBuffer();
		this._udp.send(buffer, 0, buffer.length, this._tcp.remotePort + 1, this._tcp.remoteAddress);
		
	}
	
	
	writeTcpRaw(buffer) {
		
		this._tcp.write(buffer);
		// console.log(this.name, 'TCP SENT:', buffer.length);
		
	}
	
	
	writeUdpRaw(buffer) {
		// console.log('1',this._udp);
		// console.log(this.name, 'UDP SENT:', buffer.length, this._tcp.remotePort + 1, this._tcp.remoteAddress);
		this._udp.send(buffer, 0, buffer.length, this._tcp.remotePort + 1, this._tcp.remoteAddress);
		
	}
	
	
}

module.exports = DuoSocket;
