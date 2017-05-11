'use strict';

const async = require('async');
const dgram = require('dgram');
const net   = require('net');

const MpAct  = require('./mpact');
const Binary = require('./utils/binary');


/**
 * Network server
 * @author Luis Blanco
 * @extends MpAct
 */
class Server extends MpAct {
	
	
	constructor(protocol) {
		
		super(protocol);
		
		// Prepare a binary buffer with server's greeting
		this._greetBinary = new Binary();
		this._greetBinary.pushUint16(0);
		this._greetBinary.pushString(this.protocol.version);
		this._greetBinary.pos = 0;
		this._greetBinary.pushUint16(this._greetBinary.size);
		console.log('GREETSIZE', this._greetBinary.size);
		
		// Prepare a binary buffer for socket ids
		this._idBinary = new Binary();
		
		// Create TCP server
		this._server = net.createServer(tcp => this.initSocket(tcp));
		this._server.on('error', err => console.error('Error', err));
		
		// Prepare echo socket
		this._echoPort = 27932;
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echo.on('message', (data, remote) => {
			
			console.log('SV GOT ECHO:', data.toString());
			
			// Compare and respond only to the same protocol
			if (data.toString() === this._pingString) {
				console.log('SV SEND ECHO', this._echoBuffer.toString());
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
	emitActions(binary) {
		
		this._readPacket(binary).forEach(action => {
			// Only "client" actions can be consumed by the server
			if ( this._protocol.isClient[action.type] ) {
				this.emit('action', action);
			}
		});
		
	}
	
	
	// Say hello upon client connection
	greet(socket) {
		console.log('SV GREET');
		socket.writeTcp(this._greetBinary);
	}
	
	
	// Expect client identity to decide if let through
	handshake(socket, binary) {
		
		console.log('SV GOT HANDSHAKE:', socket.name);
		
		binary.pos = 0;
		const identity = binary.pullString();
		
		// Check protocol identity
		if (identity === this._protocol.identity) {
			console.log('SV CLIENT ACCEPTED!');
			this.addSocket(socket);
		} else {
			console.log('SV CLIENT REJECTED!');
			socket.destroy();
		}
		
	}
	
	
	_nextId() {
		return this._ids.shift();
	}
	
	
	_freeId(id) {
		this._ids.push(id);
	}
	
	
	addSocket(socket) {
		
		socket.id = this._nextId();
		
		this._idBinary.flush();
		this._idBinary.pushUint16(0);
		this._idBinary.pushUint8(socket.id);
		this._idBinary.pos = 0;
		this._idBinary.pushUint16(this._idBinary.size);
		
		console.log('SERVER GIVE ID:', socket.id);
		
		socket.writeTcp(this._idBinary);
		
		super.addSocket(socket);
		
	}
	
	
	remSocket(socket) {
		this._freeId(socket.id);
		super.remSocket(socket);
	}
	
	
	// Start listening to the network
	open(opts, cb) {
		
		this._address = {
			host     : '0.0.0.0',
			port     : opts.port || 27000,
			exclusive: true,
		};
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer('mpact-bcast-pong-' + this._address.port);
		this._pingString = `mpact-bcast-ping-${this._protocol.identity}`;
		
		async.parallel(
			[
				cb => this._server.listen(this._address, () => cb()),
				cb => this._echo.on('listening', () => cb()),
				cb => super.open(opts, cb),
			],
			cb
		);
		
		this._echo.bind({ host:'0.0.0.0', port: this._echoPort, exclusive: false });
		
	}
	
	
	// Stop listenning to the network
	close(cb) {
		
		super.close(cb);
		
	}
	
	
}

module.exports = Server;
