'use strict';

const mpact = require('../.');

module.exports = new mpact.Protocol({
	
	version: '1.0',
	
	actions: {
		
		
		SET_CTL: {
			
			reliable: false,
			client  : true,
			
			encode(binary, data) { binary.pushBits(data); },
			decode(binary) { return binary.pullBits(); },
			
		},
		
		
		SET_X: {
			
			reliable: false,
			client  : false,
			
			encode(binary, data) {
				binary.writeUint8(data.id);
				binary.writeFloat(data.x);
			},
			decode(binary) {
				const id = binary.readUint8();
				const x = binary.readFloat();
				return { id, x };
			},
			
		},
		
		
	},
	
});
