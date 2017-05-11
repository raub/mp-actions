'use strict';


const dgram = require('dgram');
const net   = require('net');

const Binary = require('./utils/binary');
const MpAct  = require('./mpact');


/**
 * Network client
 * @author Luis Blanco
 * @extends MpAct
 */
class Client extends MpAct {
	
	constructor(protocol) {
		
		super(protocol);
		
		// Prepare a binary buffer with client's identity
		this._respondBinary = new Binary();
		this._respondBinary.pushUint16(0);
		this._respondBinary.pushString(this.protocol.identity);
		this._respondBinary.pos = 0;
		this._respondBinary.pushUint16(this._respondBinary.size);
		console.log('RESSIZE', this._respondBinary.size);
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer(`mpact-bcast-ping-${this._protocol.identity}`);
		this._echoRegex = /^mpact\-bcast\-pong\-/;
		
		// Prepare echo socket
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echoPort = 27932;
		this._echoServers = [];
		
		this._echoActive  = null;
		this._echoPrev    = null;
		this._echoTimeout = 2000;
		this._echoTotal   = 10000;
		
		this._echoTotalTimer = null;
		this._echoTimeoutTimer = null;
		
		this._echo.on('message', (data, remote) => {
			
			console.log('CL GOT ECHO:', this._echoActive, data.toString());
			
			if ( ! this._echoActive ) {
				console.log('ECHO ALREADY INACTIVE!');
				return;
			}
			
			this._echoPrev = Date.now();
			
			const pong = data.toString();
			// Compare and respond only to the same protocol
			if (this._echoRegex.test(pong)) {
				const port = parseInt(pong.replace(this._echoRegex, ''));
				if (port) {
					
					const server = { host: remote.address, port };
					this._echoServers.push(server);
					this.emit('server', server);
					
				}
			}
			
		});
		
		this._echo.bind();
		this._echo.on('listening', () => this._echo.setBroadcast(true));
		
	}
	
	open(opts, cb) {
		
		if ( ! opts.remote ) {
			return;
		}
		
		this._remote = opts.remote;
		
		this._client = net.createConnection(this._remote, () => {
				
				this._port = this._client.address().port;
				this.initSocket(this._client);
				
				super.open(Object.assign({}, opts, { port: this._port }), cb);
				
			}
		);
		
	}
	
	
	handshake(socket, binary) {
		
		console.log('CL GOT HANDSHAKE:', socket.name);
		
		binary.pos = 0;
		const version = binary.pullString();
		
		// Version check
		if (version === this.protocol.version) {
			console.log('CL HANDSHAKE OK');
			this._client.writeTcp(this._respondBinary);
			
			// Next packet should contain an ID
			this._client.on('packet', (socket, binary) => {
				
				binary.pos = 0;
				socket.id = binary.pullUint8();
				console.log('CLIENT GOT ID:', socket.id);
				this.addSocket(socket);
				
			});
			
		}
		
	}
	
	
	close(cb) {
		super.close(cb);
	}
	
	_stopEcho(cb) {
		this._echoActive = true;
		this._echoPrev = Date.now();
		
		clearTimeout(this._echoTotalTimer);
		this._echoTotalTimer = null;
		
		clearInterval(this._echoTimeoutTimer);
		this._echoTimeoutTimer = null;
		
		cb(null, this._echoServers);
	}
	
	_checkEcho(cb) {
		if (Date.now() - this._echoPrev > this._echoTimeout) {
			this._stopEcho(cb);
		}
	}
	
	localServers(cb) {
		
		this._echoServers = [];
		this._echoActive = true;
		this._echoPrev = Date.now();
		
		console.log('CL SEND ECHO:', this._echoBuffer.toString());
		this._echo.send(this._echoBuffer, 0, this._echoBuffer.length, this._echoPort, '255.255.255.255');
		
		this._echoTotalTimer = setTimeout(this._stopEcho.bind(this, cb), this._echoTotal);
		this._echoTimeoutTimer = setInterval(this._checkEcho.bind(this, cb), this._echoTimeout);
		
		
	}
	
}

module.exports = Client;
