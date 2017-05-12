'use strict';

const EventEmitter = require('events');
const dgram = require('dgram');

const Binary    = require('./utils/binary');
const DuoSocket = require('./utils/duo-socket');


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
		
		this._udp = dgram.createSocket({type:'udp4'/*, reuseAddr: true*/});
		this._udp.on('message', this._receiveUdp.bind(this));
		
	}
	
	
	_receiveUdp(data, remote) {
		const socket = this._sockets[remote.address + ':' + (remote.port + 1)];
		if (socket) {
			socket.receiveUdp(data);
		}
	}
	
	
	dispatch(action) {
		
		const hash = this._protocol.hashers[action.type] && this._protocol.hashers[action.type](action);
		
		if (this._protocol.isReliable[action.type]) {
			
			if (hash) {
				if (this._resetTcpOutIdx[hash]) {
					this._tcpOutPacket[this._resetTcpOutIdx[hash]] = action;
				} else {
					this._resetTcpOutIdx[hash] = this._tcpOutPacket.length;
					this._tcpOutPacket.push(action);
				}
			} else {
				this._tcpOutPacket.push(action);
			}
			
		} else {
			
			if (hash) {
				if (this._resetUdpOutIdx[hash]) {
					// console.log('-SET', action, this._resetUdpOutIdx[hash], this._udpOutPacket[0]);
					this._udpOutPacket[this._resetUdpOutIdx[hash]] = action;
					// console.log('+SET', action, this._resetUdpOutIdx[hash], this._udpOutPacket[0]);
				} else {
					this._resetUdpOutIdx[hash] = this._udpOutPacket.length;
					this._udpOutPacket.push(action);
					// console.log('PUSH', action, this._udpOutPacket[0]);
				}
			} else {
				this._udpOutPacket.push(action);
				// console.log('ADD', action, this._udpOutPacket[0]);
			}
			
		}
		
	}
	
	
	initSocket(tcp) {
		
		const socket = new DuoSocket(tcp, this._udp);
		console.log('GOT NEW SOCKET:', socket.name);
		
		// Listen to handshake
		socket.once('packet', this.handshake.bind(this));
		this.greet(socket);
		
	}
	
	
	greet() {}
	
	
	handshake(binary, socket) {
		throw new Error('MpAct::handshake(socket, binary) is pure virtual.');
	}
	
	
	addSocket(socket) {
		
		this._socklist.push(socket);
		this._sockets[socket.name] = socket;
		
		this.emit('join', socket.id);
		
		socket.on('packet', this.emitActions.bind(this));
		
		// Remove the client from the list when it leaves
		socket.on('end', () => {
			console.log('SOCKET ENDED:', socket.name);
			this.emit('drop', socket.id);
			remSocket(socket);
		});
		
	}
	
	
	remSocket(socket) {
		this._freeId(socket.id);
		this._clist.splice(this._clients.indexOf(socket), 1);
		delete this._clients[socket.name];
	}
	
	
	/**
	 * Marks network entity as active, open
	 * @arg {function} cb
	 */
	open(opts, cb) {
		
		this._isOpen = true;
		this._frameTimer = setInterval(this._sendFrame.bind(this), 20);
		
		const udpAddress = {
			host: '0.0.0.0',
			port: (opts.port || 27000) + 1,
			exclusive: true,
		};
		this._udp.bind(udpAddress);
		this._udp.on('listening', () => cb());
		
	}
	
	
	/**
	 * Marks network entity as inactive, closed
	 * @arg {function} cb
	 */
	close(cb) {
		this._isOpen = false;
		clearInterval(this._frameTimer);
		this._frameTimer = null;
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
	
	
	
	_sendFrame() {
		
		if (this._tcpOutPacket.length > 0) {
			console.log('this._tcpOutPacket', this._tcpOutPacket);
			this._writePacket(this._tcpOut, this._tcpOutPacket);
			this._tcpOutPacket = [];
			this._resetTcpOutIdx = {};
			
			const buf = this._tcpOut.toBuffer();
			this._socklist.forEach(socket => socket.writeTcpRaw(buf));
			this._tcpOut.flush();
			
		}
		
		if (this._udpOutPacket.length > 0) {
			console.log('this._udpOutPacket', this._udpOutPacket[0]);
			this._writePacket(this._udpOut, this._udpOutPacket);
			this._udpOutPacket = [];
			this._resetUdpOutIdx = {};
			
			const buf = this._udpOut.toBuffer();
			this._socklist.forEach(socket => socket.writeUdpRaw(buf));
			this._udpOut.flush();
			
		}
		
	}
	
	
	emitActions(binary) {
		this._readPacket(binary).forEach(action => {
			this.emit('action', action);
		});
	}
	
	
	_readPacket(binary) {
		
		binary.pos = 2;
		const actionNum = binary.pullUint16();
		const actions = new Array(actionNum);
		console.log('ACNUMR', actionNum);
		for (let i = 0; i < actionNum; i++) {
			actions[i] = this._protocol.decode(binary);
		}
		
		return actions;
		
	}
	
	
	_writePacket(binary, actions) {
		
		binary.pos = 2;
		
		binary.pushUint16(actions.length);
		actions.forEach(action => this._protocol.encode(binary, action));
		
		binary.pos = 0;
		binary.pushUint16(binary.size);
		
	}
	
	
}


module.exports = MpAct;
