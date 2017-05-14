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

const joinServer = (cb) => {
	
	const client = new mpact.Client(protocol);
	
	client.localServers((err, list) => {
		
		if (list.length < 1) {
			console.log('NO SERVERS FOUND!');
			cb();
		}
		
		client.open({ remote: list[0] }, () => {
			
			console.log(`CLIENT#${client.id} ONLINE.`);
			
			const game = new Game({ id: client.id });
			subscribe(client, game);
			
			cb();
			
		});
		
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

