'use strict';

const EventEmitter = require('events');

const Binary = require('./binary');

/**
 * Mpact networking entity
 * @note This class is not for use on it's own
 * @author Luis Blanco
 * @extends EventEmitter
 */
class MpAct extends EventEmitter {
	
	
	/**
	 * @constructs MpAct
	 * @desc Constructs MpAct, with some optional parameters.
	 * @arg {Protocol} protocol The network identity
	 * @return {MpAct} instance
	 */
	constructor(protocol) {
		
		super();
		
		this._isOpen   = false;
		this._protocol = protocol;
		
		this._protocol = protocol;
		this._socklist = [];
		this._sockets  = {};
		
		this._tcpOut = new Binary();
		this._tcpOut.pushUint16(0);
		this._udpOut = new Binary();
		this._udpOut.pushUint16(0);
		
		this._resetTcpOutIdx = {};
		this._resetUdpOutIdx = {};
		this._tcpOutPacket   = [];
		this._udpOutPacket   = [];
		
	}
	
	dispatch(action) {
		
		if (this._protocol.isReliable[action.type]) {
			if (this._protocol.isReset[action.type]) {
				if (this._resetTcpOutIdx[action.type]) {
					this._tcpOutPacket[this._resetTcpOutIdx[action.type]] = action;
				} else {
					this._resetTcpOutIdx[action.type] = this._tcpOutPacket.length;
					this._tcpOutPacket.push(action.type);
				}
			} else {
				this._tcpOutPacket.push(action.type);
			}
			// this._protocol.encode(this._channel.tcpOut, action);
		} else {
			// this._protocol.encode(this._channel.udpOut, action);
			if (this._protocol.isReset[action.type]) {
				if (this._resetTcpOutIdx[action.type]) {
					this._tcpOutPacket[this._resetTcpOutIdx[action.type]] = action;
				} else {
					this._resetTcpOutIdx[action.type] = this._tcpOutPacket.length;
					this._tcpOutPacket.push(action.type);
				}
			} else {
				this._tcpOutPacket.push(action.type);
			}
		}
		
	}
	
	
	pushSocket(socket) {
		
		// Put this new client in the list
		this._socklist.push(socket);
		this._sockets[socket.name] = socket;
		
		socket.on('packet', this._readPacket.bind(this));
		
		// Remove the client from the list when it leaves
		socket.on('end', () => {
			console.log('SOCKET ENDED:', socket.name);
			this._clist.splice(this._clients.indexOf(socket), 1);
			delete this._clients[socket.name];
		});
		
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
	 * Network entity state
	 * @return {Boolean} network entity state
	 */
	get isOpen() { return this._isOpen; }
	
	
	/**
	 * Network protocol identity
	 * @return {Protocol} network protocol identity
	 */
	get protocol() { return this._protocol; }
	
	
	
	send() {
		
		if (this._tcpOutPacket.length > 0) {
			
			this._tcpOutPacket.forEach(action => {
				this._protocol.encode(this._tcpOut, action);
			});
			this._tcpOutPacket = [];
			
			this._tcpOut.pos = 0;
			this._tcpOut.pushUint16(this._tcpOut.size);
			
			this._socklist.forEach(socket => {
				socket.writeTcp(this._tcpOut);
			});
			
			this._tcpOut.flush();
			this._tcpOut.pushUint16(0);
			
		}
		
		if (this._udpOutPacket.length > 0) {
			
			this._tcpOutPacket.forEach(action => {
				this._protocol.encode(this._tcpOut, action);
			});
			this._tcpOutPacket = [];
			
			this._udpOut.pos = 0;
			this._udpOut.pushUint16(this._udpOut.size);
			
			this._socklist.forEach(socket => {
				socket.writeUdp(this._udpOut);
			});
			
			this._udpOut.flush();
			this._udpOut.pushUint16(0);
			
		}
		
	}
	
	
	emitActions(binary) {
		this._readPacket(binary).forEach(action => {
			this.emit('action', action);
		});
	}
	
	
	_readPacket(binary) {
		
		const actionNum = binary.pullUint16();
		const actions = new Array(actionNum);
		
		for (let i = 0; i < actionNum; i++) {
			actions[i] = this._protocol.decode(binary);
		}
		
		return actions;
		
	}
	
	
	_writePacket(binary, actions) {
		
		binary.pushUint16(actions.length);
		
		actions.forEach(action => {
			this._protocol.encode(binary, action);
		});
		
	}
	
	
}


module.exports = MpAct;
