'use strict';

const mpact = require('../.');
const protocol = require('./protocol');
const Game = require('./game');


const createServer = (cb) => {
	
	const server = new mpact.Server(protocol);
	
	server.open({port: 27999}, () => {
		
		console.log('SERVER ONLINE.');
		
		const svTest = new Game(server);
		server.on('action', svTest.dispatch.bind(svTest));
		svTest.on('action', server.dispatch.bind(server));
		
		cb();
		
	});
	
};

const joinServer = (cb) => {
	
	const client = new mpact.Client(protocol);
	
	client.localServers(list => {
		
		if (list.length === 1) {
			
			client.open(list[0], () => {
				
				const clTest = new Game(client);
				client.on('action', clTest.dispatch.bind(clTest));
				clTest.on('action', client.dispatch.bind(client));
				
				console.log('CLIENT#1 ONLINE.');
				
				const client2 = new mpact.Client(protocol);
				client2.open(list[0], () => {
					
					console.log('CLIENT#2 ONLINE.');
					const clTest = new Game(client2);
					client2.on('action', clTest.dispatch.bind(clTest));
					clTest.on('action', client2.dispatch.bind(client2));
					
					cb();
					
				});
				
			});
			
		}
	});
	
}

createServer(() => {
	console.log('SERVER ONLINE.');
	joinServer(() => console.log('CLIENT ONLINE.'));
});
