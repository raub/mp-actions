'use strict';

const mpact = require('../.');

module.exports = new mpact.Protocol({
	
	version: '1.0',
	
	actions: {
		
		
		CL_CONTROL: {
			
			client: true,
			reset : true,
			
			encode(binary, data) { binary.pushBits(data); },
			decode(binary) { return binary.pullBits(); },
			
		},
		
		
		SV_CONTROL: {
			
			encode(binary, data) {
				binary.pushUint8(data.id);
				binary.pushBits(data.control);
			},
			decode(binary) {
				const id = binary.pullUint8();
				const control = binary.pullBits();
				return { id, control };
			},
			
		},
		
		
		SV_X: {
			
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
		
		
		CL_CHAT: {
			
			reliable: true,
			client  : true,
			
			encode(binary, data) { binary.pushString(data); },
			decode(binary) { return binary.pullString(); },
			
		},
		
		
		SV_CHAT: {
			
			reliable: true,
			
			encode(binary, data) {
				binary.pushUint8(data.id);
				binary.pushString(data.text);
			},
			decode(binary) {
				const id = binary.pullUint8();
				const text = binary.pullString();
				return { id, text };
			},
			
		},
		
		
	},
	
});
