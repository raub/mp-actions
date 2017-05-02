'use strict';


class Control {
	
	constructor() {
		this.left  = false;
		this.right = false;
	}
	
	fetch() {
		const secTime = Math.floor(Date.now() * 0.001);
		this.left = (secTime % 2) > 0;
		this.right = (1 - (secTime % 2)) > 0;
	}
	
	toArray() {
		return [
			this.left  ? 1 : 0,
			this.right ? 1 : 0,
		];
	}
	
	fromArray(a) {
		this.left  = a[0] > 0;
		this.right = a[1] > 0;
	}
	
}

module.exports = Control;
