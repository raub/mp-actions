'use strict';

const async = require('async');

const mpact = require('../.');
const protocol = require('./protocol');
const Game = require('./game');


const subscribe = (mpact, game) => {
	mpact.on( 'action', game.dispatch.bind(game)   );
	game.on(  'action', mpact.dispatch.bind(mpact) );
	game.on(  'quit'  , mpact.close.bind(mpact)    );
	mpact.on( 'join'  , game.join.bind(game)       );
	mpact.on( 'drop'  , game.drop.bind(game)       );
};

const createServer = (cb) => {
	
	const server = new mpact.Server(protocol);
	
	server.open({port: 27999}, () => {
		
		console.log('SERVER ONLINE.');
		
		const game = new Game();
		subscribe(server, game);
		
		cb();
		
	});
	
};

let numClients = 0;
const joinServer = (cb) => {
	
	const client = new mpact.Client(protocol);
	
	client.localServers(list => {
		
		if (list.length === 1) {
			
			client.open(list[0], () => {
				
				console.log(`CLIENT#${++numClients} ONLINE.`);
				
				const game = new Game(client.id);
				subscribe(client, game);
				
				cb();
				
			});
			
		}
	});
	
}

async.series(
	
	[
		cb => createServer(cb),
		cb => joinServer(cb),
		cb => joinServer(cb),
		cb => joinServer(cb),
	],
	
	err => {
		console.log('DONE.', err);
	}
	
);

