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
		
		// Prepare a binary buffer for socket ids
		this._socketIdBuffer = Buffer.allocUnsafe(1);
		
		this._tcpOut = new Binary();
		this._tcpOut.pushUint16(0);
		this._udpOut = new Binary();
		this._udpOut.pushUint16(0);
		
		this._resetTcpOutIdx = {};
		this._resetUdpOutIdx = {};
		this._tcpOutPacket   = [];
		this._udpOutPacket   = [];
		
		this._ids = new Array(256);
		for (let i = 0; i < 256; i++) {
			this._ids[i] = i;
		}
		
		this._udp  = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._udp.on('message', this._receiveUdp.bind(this));
		
	}
	
	
	_receiveUdp(data, remote) {
		const socket = this._sockets[remote.address + ':' + (remote.port + 1)];
		if (socket) {
			socket.receiveUdp(data);
		}
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
			
		} else {
			
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
	
	
	initSocket(tcp) {
		
		const socket = new DuoSocket(tcp, this._udp);
		console.log('GOT NEW SOCKET:', socket.name);
		
		// Listen to handshake
		socket.once('packet', binary => this.handshake(socket, binary));
		greet(socket);
		
	}
	
	
	greet() {}
	
	
	handshake(socket, binary) {
		throw new Error('MpAct::handshake(socket, binary) is pure virtual.');
	}
	
	
	_nextId() {
		return this._ids.shift();
	}
	
	
	_freeId(id) {
		this._ids.push(id);
	}
	
	
	addSocket(socket) {
		
		socket.id = this._nextId();
		
		this._socketIdBuffer.writeUInt8(socket.id, 0);
		socket.writeTcpRaw(this._socketIdBuffer);
		
		this._socklist.push(socket);
		this._sockets[socket.name] = socket;
		
		socket.on('packet', this._readPacket.bind(this));
		
		// Remove the client from the list when it leaves
		socket.on('end', () => {
			console.log('SOCKET ENDED:', socket.name);
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
	
	
	listServers(cb) {
		
		if ( ! this.udpBcaster ) {
			
			this.bcastMsg = new Buffer('bcast-ping');
			
			this.udpBcaster = dgram.createSocket({type:'udp4', reuseAddr: true});
			
			this.udpBcaster.on('listening', () => {
				var address = this.udpBcaster.address();
				console.log('UDP bcast-client:' + address.address + ":" + address.port);
				this.udpBcaster.setBroadcast(true);
				
			});
			
			this.udpBcaster.on('message', (message, remote) => {
				const msgString = message.toString();
				console.log('UDP bcast-res:', remote.address + ':' + remote.port, msgString);
				console.log(/^bcast\-pong/.test(msgString), (msgString.replace(/^bcast\-pong/,'') >> 0));
				
				if (
						/^bcast\-pong/.test(msgString) &&
						(msgString.replace(/^bcast\-pong/, '') >> 0)
					) {
					console.log('SV!');
					this._servers.push(new Address(remote.address, msgString.replace(/^bcast\-pong/,'') >> 0));
					cb();
				}
				
			});
			
			this.udpBcaster.bind({ port: 27931, host: '0.0.0.0' });
			
		}
		
		this._servers = [];
		
		this.udpBcaster.send(this.bcastMsg, 0, this.bcastMsg.length, 27932, '255.255.255.255');
		
	}
	
	
}


module.exports = MpAct;
