'use strict';

const mpact = require('mpact-raub');
const protocol = require('../protocol');
const Game = require('./game');


const subscribe = (mpact, game) => {
	mpact.on( 'action', game.dispatch.bind(game)   );
	game.on(  'action', mpact.dispatch.bind(mpact) );
	game.on(  'quit'  , mpact.close.bind(mpact)    );
	mpact.on( 'join'  , game.join.bind(game)       );
	mpact.on( 'drop'  , game.drop.bind(game)       );
};


const createServer = async (opts) => {
	
	const server = new mpact.Server(protocol);
	
	await server.open({port: 27999});
	
	console.log('SERVER ONLINE.');
	
	const game = new Game(opts);
	subscribe(server, game);
	
};

const joinServer = async (opts) => {
	
	const client = new mpact.Client(protocol);
	
	const list = await client.localServers();
	
	if (list.length < 1) {
		console.log('NO SERVERS FOUND!');
		return;
	}
	
	await client.open({ remote: list[0] });
	
	console.log(`CLIENT#${client.id} ONLINE.`);
	
	const game = new Game({ id: client.id, ...opts });
	subscribe(client, game);
	
}


(async () => {
	try {
		
		await createServer({ headless: true });
		
		await joinServer();
		await joinServer({ headless: true });
		// await joinServer({ headless: true });
		
		console.log('DONE.');
		
	} catch (e) {
		console.log('Error:', e)
	}
})();
