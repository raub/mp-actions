'use strict';

const mpact = require('../.');
const protocol = require('./protocol');
const Game = require('./game');


const createServer = (cb) => {
	
	const server = new mpact.Server(protocol);
	
	server.open({port: 27999}, () => {
		
		const svTest = new Game(server);
		server.on('action', svTest.dispatch.bind(svTest));
		svTest.on('action', server.dispatch.bind(server));
		
		cb();
		
	});
	
};

const joinServer = (cb) => {
	
	const client = new mpact.Client(protocol);
	
	client.localServers(() => {
		
		if (client.serverList.length === 1) {
			
			client.open(client.serverList[0], () => {
				
				const clTest = new Game(client);
				client.on('action', clTest.dispatch.bind(clTest));
				clTest.on('action', client.dispatch.bind(client));
				
				cb();
				
			});
		}
	});
	
}

createServer(() => {
	console.log('SERVER ONLINE.');
	joinServer(() => console.log('CLIENT ONLINE.'));
});
