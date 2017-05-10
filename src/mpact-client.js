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
		
		this._servers = [];
		
		// Prepare a binary buffer with server's greeting
		this._respondBinary = new Binary();
		this._respondBinary.pushString(this.protocol.identity);
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer(`mpact-bcast-ping-${this._protocol.identity}`);
		this._pongRegex = /^mpact\-bcast\-pong\-/;
		
		// Prepare echo socket
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echo.on('message', (data, remote) => {
			const pong = data.toString();
			// Compare and respond only to the same protocol
			if (this._pongRegex.test(pong)) {
				const port = parseInt(pong.replace(this._pongRegex, ''));
				if (port) {
					this._servers.push({ host: remote.address, port });
				}
			}
		});
		this._echo.bind({ host: '0.0.0.0' });
		
	}
	
	open(opts, cb) {
		
		this._remote = opts.remote;
		
		this._client = net.createConnection(this._remote, () => {
				
				this._port = this.tcpClient.address().port;
				super.open(Object.assign({}, opts, { port: this._port}), cb);
				
			}
		);
		
		this.initSocket(this._client);
		
	}
	
	
	handshake(socket, binary) {
		console.log('CL GOT VERSION:', socket.name);
		
		const version = binary.pullString();
		
		// Version check
		if (version === this.protocol.version) {
			
			this.tcpClient.on('packet', (data) => {
				
				
				
			});
			
			this.encode({identity: this.protocol.identity}, (err, data) => {
				this.tcpClient.write(data);
			});
			
		}
		
	}
	
	
	close(cb) {
		super.close(cb);
	}
	
	
	localServers(cb) {
		
		if ( ! this.udpBcaster ) {
			
			this._echoString = 'mpact-bcast-ping-';
			this._echoBuffer = new Buffer(`${this._echoString}${this._protocol.identity}`);
			
			this._echo = dgram.createSocket({type:'udp4', reuseAddr: false});
			
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

module.exports = Client;
