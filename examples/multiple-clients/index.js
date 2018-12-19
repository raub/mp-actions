'use strict';

const mpact = require('../.');
const protocol = require('../protocol');
const Game = require('./game');


const subscribe = (mpact, game) => {
	mpact.on( 'action', game.dispatch.bind(game)   );
	game.on(  'action', mpact.dispatch.bind(mpact) );
	game.on(  'quit'  , mpact.close.bind(mpact)    );
	mpact.on( 'join'  , game.join.bind(game)       );
	mpact.on( 'drop'  , game.drop.bind(game)       );
};

const createServer = () => {
	
	const server = new mpact.Server(protocol);
	
	return server.open({port: 27999}).then(() => {
		
		console.log('SERVER ONLINE.');
		
		const game = new Game();
		subscribe(server, game);
		
	});
	
};

const joinServer = () => {
	
	const client = new mpact.Client(protocol);
	
	return client.localServers().then(list => {
		
		if (list.length < 1) {
			return console.log('NO SERVERS FOUND!');
		}
		
		return client.open({ remote: list[0] });
		
	}).then(() => {
		
		console.log(`CLIENT#${client.id} ONLINE.`);
		
		const game = new Game({ id: client.id });
		subscribe(client, game);
		
	});
	
}

createServer()
	.then(joinServer)
	.then(joinServer)
	.then(joinServer)
	.then(() => console.log('DONE.'))
	.catch(err => console.log('Error:', err))

