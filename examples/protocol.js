'use strict';


module.exports = {
	
	version: '1.0',
	
	actions: {
		
		
		CL_CONTROL: {
			
			client: true,
			
			hash(action) {
				return action.type;
			},
			
			encode(binary, data) { binary.pushBits(data); },
			decode(binary) { return binary.pullBits(); },
			
		},
		
		
		SV_CONTROL: {
			
			hash(action) {
				return action.type + action.data.id;
			},
			
			encode(binary, data) {
				// console.log('data', data);
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
			
			hash(action) {
				return action.type + action.data.id;
			},
			
			encode(binary, data) {
				binary.pushUint8(data.id);
				binary.pushFloat(data.x);
			},
			decode(binary) {
				const id = binary.pullUint8();
				const x = binary.pullFloat();
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
	
};
