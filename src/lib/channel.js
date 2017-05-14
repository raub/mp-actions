'use strict';

const EventEmitter = require('events');
const dgram = require('dgram');

const Binary    = require('./binary');
const DuoSocket = require('./duo-socket');
const Protocol  = require('./protocol');
const User      = require('./user');


/**
 * Network channel
 * @author Luis Blanco
 * @extends EventEmitter
 */
class Channel extends EventEmitter {
	
	
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
	
	
	/**
	 * @constructs Channel
	 * @desc Constructs Channel, with some optional parameters.
	 * @arg {Protocol} protocol The network identity
	 * @return {MpAct} instance
	 */
	constructor(protocol) {
		
		super();
		
		this._isOpen   = false;
		this._protocol = new Protocol(protocol);
		
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
		
		this._ulist = [];
		this._users = {};
		
	}
	
	
	emitActions(binary, socket) {
		this._readPacket(binary, socket).forEach(action => {
			this.emit('action', action);
		});
	}
	
	
	dispatch(action) {
		
		if (action.type === '__SVC') {
			return console.warn('Application is forbidden to send __SVC!');
		}
		
		const hash = this._protocol.hashers[action.type] && this._protocol.hashers[action.type](action);
		
		if (this._protocol.isReliable[action.type]) {
			
			if (hash) {
				if (this._resetTcpOutIdx[hash] !== undefined) {
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
				// console.log('HASH', hash, this._resetUdpOutIdx, this._resetUdpOutIdx[hash]);
				if (this._resetUdpOutIdx[hash] !== undefined) {
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
	
	
	handshake() { throw new Error('MpAct::handshake(socket, binary) is pure virtual.'); }
	getTime() {
		return Date.now() & 0xFFFF;
	}
	
	
	initSocket(tcp) {
		
		const socket = new DuoSocket(tcp, this._udp);
		console.log('GOT NEW SOCKET:', socket.name);
		
		// Listen to handshake
		socket.once('packet', this.handshake.bind(this));
		
		return socket;
		
	}
	
	
	addSocket(socket) {
		
		this._socklist.push(socket);
		this._sockets[socket.name] = socket;
		
		socket.on('packet', this.emitActions.bind(this));
		
		// Remove the client from the list when it leaves
		socket.on('end', () => {
			console.log('SOCKET ENDED:', socket.name);
			this.emit('drop', socket.id);
			this.remSocket(socket);
		});
		
	}
	
	
	remSocket(socket) {
		this._freeId(socket.id);
		this._socklist.splice(this._socklist.indexOf(socket), 1);
		delete this._sockets[socket.name];
	}
	
	
	initUser(id) {
		
		const user = new User(id);
		console.log('GOT NEW USER:', user.id);
		return user;
		
	}
	
	addUser(user) {
		
		this._ulist.push(user);
		this._users[user.id] = user;
		
	}
	
	
	remUser(user) {
		this._ulist.splice(this._ulist.indexOf(user), 1);
		delete this._users[user.id];
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
	
	
	_sendFrame() {
		
		if (this._tcpOutPacket.length > 0) {
			// console.log(this.constructor, '#TCP', this._tcpOutPacket);
			this._writePacket(this._tcpOut, this._tcpOutPacket);
			this._tcpOutPacket = [];
			this._resetTcpOutIdx = {};
			
			const buf = this._tcpOut.toBuffer();
			this._socklist.forEach(socket => socket.writeTcpRaw(buf));
			this._tcpOut.flush();
			
		}
		
		if (this._udpOutPacket.length > 0) {
			// console.log(this.constructor, '#UDP', this._udpOutPacket);
			this._writePacket(this._udpOut, this._udpOutPacket);
			this._udpOutPacket = [];
			this._resetUdpOutIdx = {};
			
			const buf = this._udpOut.toBuffer();
			this._socklist.forEach(socket => socket.writeUdpRaw(buf));
			this._udpOut.flush();
			
		}
		
	}
	
	
	_receiveUdp(data, remote) {
		// console.log('UDP!', remote.address + ':' + (remote.port - 1));
		const socket = this._sockets[remote.address + ':' + (remote.port - 1)];
		if (socket) {
			socket.receiveUdp(data);
		}
	}
	
	
	_readPacket(binary, socket) {
		
		binary.pos = 2;
		
		// // Prevent obsolete packets
		// const time = binary.pullUint16();
		// console.log('GOT time', time);
		// if ( ! socket.timeCAS(time) ) {
		// 	console.log('BAD time');
		// 	return [];
		// }
		
		const actionNum = binary.pullUint16();
		const actions = new Array(actionNum);
		
		for (let i = 0; i < actionNum; i++) {
			actions[i] = this._protocol.decode(binary);
		}
		
		return actions;
		
	}
	
	
	_writePacket(binary, actions) {
		
		binary.pos = 2;
		
		// const time = this.getTime();
		// console.log('SEND time', time);
		// binary.pushUint16(time);
		
		binary.pushUint16(actions.length);
		actions.forEach(action => this._protocol.encode(binary, action));
		
		binary.pos = 0;
		binary.pushUint16(binary.size);
		
	}
	
	
}


module.exports = Channel;
