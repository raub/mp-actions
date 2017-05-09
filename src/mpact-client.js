'use strict';


const dgram = require('dgram');
const Address = require('./address');
const Base = require('./base');
const net = require('net');

/**
 * Network client
 * @author Luis Blanco
 * @extends Base
 * @memberof RauNet
 */
class Client extends Base {
	
	constructor(protocol) {
		
		super(protocol);
		
		this._servers = [];
		
		this._frame = [];
		
	}
	
	open(opts, cb) {
		
		this._remoteAddress = opts.address || new Address(opts.host, opts.port);
		
		this.udpClient = dgram.createSocket({type:'udp4', reuseAddr: true});
		
		this.tcpClient = net.createConnection(
			{
				port: this._remoteAddress.port,
				host: this._remoteAddress.host,
				// localPort: 27321,
			},
			() => {
				
				
				
				console.log('TCP client-listener:', this.tcpClient.address());
				const addr = this.tcpClient.address();
				this._localAddress = new Address(addr.address, addr.port);
				
				super.open(cb);
				
				this.udpClient.on('listening', () => {
					// var address = this.udpClient.address();
					console.log('UDP client:', this._localAddress.host, this._localAddress.port+1);
					
				});
				
				this.udpClient.on('message', (data, remote) => {
					
					if (
							this._remoteAddress.host === remote.address &&
							(this._remoteAddress.port + 1) === remote.port
						) {
						console.log('CL UDP msg from:', this._remoteAddress);
						
						this.process(this.decode(data));
						
					} else {
						console.log('CL UDP unknown:' + remote.address + ":" + remote.port,
							'vs', this._remoteAddress, data.toString());
					}
					
					
				});
				
				this.udpClient.bind({ port: this._localAddress.port + 1, host: '0.0.0.0', exclusive: true });
				
				
			}
		);
		
		
		// Listen to version
		this.tcpClient.once('data', (data) => { this.handshake(data); });
		
		
		this.tcpClient.on('end', () => {
			console.log('TCP client disconnected.');
		});
		
		
		
	}
	
	
	handshake(data) {
		console.log('CL GOT VERSION:', this.tcpClient.address(), data.toString());
		
		
		this.decode(data, (err, msg) => {
			// Version check
			if (msg.version === this.protocol.version) {
				
				this.tcpClient.on('data', (data) => {
					
					this.decode(data, (err, msg) => {
						this.process(msg);
					});
					
				});
				
				this.encode({identity: this.protocol.identity}, (err, data) => {
					this.tcpClient.write(data);
				});
				
			}
		});
		
		
	}
	
	
	process(packet) {
		console.log('CL PROCESS MSG AT:', this.tcpClient.address());
	}
	
	
	close(cb) {
		super.close(cb);
	}
	
	
	weak() {
		
		if ( ! this._frame.length ) {
			return;
		}
		
		this.encode(this._frame, (err, data) => {
			this.udpClient.send(data, 0, data.length, this._address.port + 1, this._address.ip);
		});
		this._frame = [];
		
	}
	
	
	strong(msg) {
		this.encode(msg, (err, data) => {
			this.tcpClient.write(data);
		});
	}
	
	
	send(id, msg) {
		if (this.protocol.getChannel(id) === 'tcp') {
			this.strong(msg);
		} else {
			this._frame[id] = msg;
		}
	}
	
	
	get serverList() {
		return this._servers;
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

module.exports = Client;
