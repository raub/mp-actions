'use strict';

const dgram = require('dgram');
const Address = require('./address');
const DuoSocket = require('./duo-socket');
const MpAct = require('./mpact');
const net = require('net');


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
		this._greetBinary.pushString(this.protocol.version);
		
		// Create TCP server
		this._server = net.createServer(tcp => this.initSocket(tcp));
		this._server.on('error', err => console.error('Error', err));
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer('mpact-bcast-pong-' + this._address.port);
		this._pingString = `mpact-bcast-ping-${this._protocol.identity}`;
		
		// Prepare echo socket
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echo.on('message', (data, remote) => {
			// Compare and respond only to the same protocol
			if (data.toString() === this._pingString) {
				this._echo.send(
					this._echoBuffer,
					0,
					this._echoBuffer.length,
					remote.port,
					remote.address
				);
			}
		});
		this._echo.bind({ host: '0.0.0.0' });
		
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
		socket.writeTcp(this._greetBinary);
	}
	
	
	// Expect client identity to decide if let through
	handshake(socket, binary) {
		console.log('SV GOT HANDSHAKE:', socket.name);
		
		const identity = binary.pullString();
		
		// Check protocol identity
		if (identity === this._protocol.identity) {
			console.log('SV CLIENT ACCEPTED!');
			
			this.addSocket(socket);
			
		} else {
			socket.destroy();
		}
		
	}
	
	
	// Start listening to the network
	open(opts, cb) {
		
		this._address = {
			host     : '0.0.0.0',
			port     : opts.port || 27000,
			exclusive: true,
		};
		
		async.parallel(
			[
				cb => this._server.listen(this._address, () => cb()),
				cb => this._echo.on('listening', () => cb()),
				cb => super.open(opts, cb),
			],
			cb
		);
		
		this._echo.bind({ host:'0.0.0.0' });
		
	}
	
	
	// Stop listenning to the network
	close(cb) {
		
		super.close(cb);
		
	}
	
	
}

module.exports = Server;
