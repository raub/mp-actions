'use strict';

const dgram = require('dgram');
const net   = require('net');

const Channel = require('./lib/channel');
const Binary  = require('./lib/binary');


/**
 * Network server
 * @author Luis Blanco
 * @extends Channel
 */
class Server extends Channel {
	
	
	constructor(protocol) {
		
		super(protocol);
		
		// Prepare a binary buffer with server's greeting
		this._greetBinary = new Binary();
		
		this._greetBinary.pos = 4;
		this._greetBinary.pushString(this.protocol.version);
		this._greetBinary.pos = 0;
		this._greetBinary.pushUint16(this._greetBinary.size);
		// console.log('GREETSIZE', this._greetBinary.size, this._greetBinary.toBuffer());
		
		// Prepare a binary buffer for socket ids
		this._idBinary = new Binary();
		
		// Create TCP server
		this._server = net.createServer(tcp => this.initSocket(tcp));
		this._server.on('error', err => console.error('Error', err));
		
		// Prepare echo socket
		this._echoPort = 27932;
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echo.on('message', (data, remote) => {
			
			// console.log('SV GOT ECHO:', data.toString());
			
			// Compare and respond only to the same protocol
			if (data.toString() === this._pingString) {
				// console.log('SV SEND ECHO', this._echoBuffer.toString());
				this._echo.send(
					this._echoBuffer,
					0,
					this._echoBuffer.length,
					remote.port,
					remote.address
				);
			}
			
		});
		
		
		this._ids = new Array(256);
		for (let i = 0; i < 256; i++) {
			this._ids[i] = i;
		}
		
	}
	
	
	// Propagate an action through the network
	dispatch(action) {
		
		// Only non-client actions are allowed to be sent by the server
		if ( ! this._protocol.isClient[action.type]) {
			super.dispatch(action);
		}
		
	}
	
	
	// Actions that came from the network
	emitActions(binary, socket) {
		
		this._readPacket(binary, socket).forEach(action => {
			
			if (action.type === '__SVC') {
				// console.log('SV GOT SVC:', action.data);
				return this._execService(action.data, socket);
			}
			
			// Only "client" actions can be consumed by the server
			if ( this._protocol.isClient[action.type] ) {
				action.clid = socket.id;
				this.emit('action', action);
			}
			
		});
		
	}
	
	
	_execService(data, socket) {
		switch(data.e) {
			
			case 'pong':
				// console.log('GOT PONG',socket.id, data);
				this._users[socket.id].ping = Math.max(0, Math.min(999, Date.now() - data.t));
				// console.log('SET PING', Date.now(), '-', data.t, '->', this._users[socket.id].ping);
				break;
				
			default: break;
			
		}
	}
	
	
	// Say hello upon client connection
	_greet(socket) {
		this._greetBinary.pos = 2;
		this._greetBinary.pushUint16(this.getTime());
		socket.writeTcp(this._greetBinary);
	}
	
	
	// Expect client identity to decide if let through
	handshake(binary, socket) {
		
		console.log('SV GOT HANDSHAKE:', socket.name);
		
		binary.pos = 4;
		const identity = binary.pullString();
		
		// Check protocol identity
		if (identity === this._protocol.identity) {
			this.addSocket(socket);
		} else {
			console.log('SV CLIENT REJECTED!');
			socket.close();
		}
		
	}
	
	
	getTime() {
		return Date.now() & 0xFFFF;
	}
	
	
	_nextId() {
		return this._ids.shift();
	}
	
	
	_freeId(id) {
		this._ids.push(id);
	}
	
	
	
	initSocket(tcp) {
		
		const socket = super.initSocket(tcp);
		this._greet(socket);
		
	}
	
	addSocket(socket) {
		
		socket.id = this._nextId();
		
		this._idBinary.flush();
		this._idBinary.pos = 2;
		this._idBinary.pushUint16(this.getTime());
		this._idBinary.pushUint8(socket.id);
		this._idBinary.pos = 0;
		this._idBinary.pushUint16(this._idBinary.size);
		
		// console.log('SERVER GIVES ID:', socket.id);
		
		socket.writeTcp(this._idBinary);
		// console.log('IDBIN>>');
		
		super.addSocket(socket);
		
		const user = this.initUser(socket.id);
		this.addUser(user);
		this.emit('join', user);
		
		this._sendPings(true);
		// this._tcpOutPacket.push({ type: '__SVC', data: { e: 'join', i: user.id } });
		
	}
	
	
	remSocket(socket) {
		
		const user = this._ulist[socket.id];
		
		// this._tcpOutPacket.push({ type: '__SVC', data: { e: 'drop', i: user.id } });
		this.remUser(user);
		this._sendPings(true);
		
		this._freeId(socket.id);
		super.remSocket(socket);
	}
	
	
	// Start listening to the network
	open(opts) {
		
		this._address = {
			host     : '0.0.0.0',
			port     : opts.port || 27000,
			exclusive: true,
		};
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer('mpact-bcast-pong-' + this._address.port);
		this._pingString = `mpact-bcast-ping-${this._protocol.identity}`;
		
		return Promise.all([
			
			new Promise((res, rej) => {
				this._server.once('listening', res);
				this._server.once('error', rej);
				this._server.listen(this._address);
			}),
			
			new Promise((res, rej) => {
				this._echo.once('listening', res);
				this._echo.once('error', rej);
				this._echo.bind({ host:'0.0.0.0', port: this._echoPort, exclusive: false });
			}),
			
			super.open(opts),
			
		]).then(() => this._pingTimer = setInterval(this._sendPings.bind(this), 200));
		
	}
	
	
	_sendPings(reliable) {
		(reliable ? this._tcpOutPacket : this._udpOutPacket).push({
			type: '__SVC',
			data: {
				e: 'ping',
				t: Date.now(),
				p: this._ulist.map( u=>({i:u.id, p:u.ping}) ),
			},
		});
	}
	
	
	// Stop listenning to the network
	close() {
		
		return super.close();
		
	}
	
	
}

module.exports = Server;
