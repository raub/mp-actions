'use strict';


const use = require('use');
const RauApp = use('lib/rau/app');
const net = use('lib/rau/net');
const base64 = use('lib/rau/base64');


class App extends RauApp {
	
	
	get gui() { return this._gui; }
	
	
	constructor() {
		
		super({});
		
		// GPU codes are from 'gpu' folder and processed with Scope. App injected
		const gpu = use('gpu/index');
		const app = this;
		gpu.App = {get() { return app; }};
		this.gpu = this.scope(gpu);
		this.gpu.go();
		
		this._gui = new this.Gui({ screen: this.screen });
		
		const OrbitControls = use('three-orbit-controls')(this.three);
		const controls = new OrbitControls(this.screen.camera, this.canvas);
		controls.zoomSpeed = 2.0;
		
		this.protocol = new net.Protocol({
			version: '0.1',
			dict: {
				hi: 'tcp',
				lol: 'udp',
			},
		});
		
		this.createServer(() => {
			this.joinServer();
		});
		
	}
	
	
	createServer(cb) {
		
		var sv = new net.Server(this.protocol);
		
		sv.open({port: 27999}, cb);
		
	}
	
	
	joinServer() {
		
		var cl = new net.Client(this.protocol);
		
		cl.listServers(() => {
			console.log('CB!');
			if (cl.serverList.length === 1) {
				console.log('JOIN', cl.serverList[0]);
				cl.open(cl.serverList[0], () => {
					
					
					
					setInterval(() => {
						
						this.gpu.Core.el.arrs.pos.d2h();
						this.gpu.Food.el.arrs.pos.d2h();
						
						cl.send('hi', {
							core  : base64.write.f32(
								this.gpu.Core.el.arrs.pos.host,
								this.gpu.Core.el.count
							),
							food  : base64.write.f32(
								this.gpu.Food.el.arrs.pos.host,
								this.gpu.Food.el.count
							),
							coreNum: this.gpu.Core.el.count,
							foodNum: this.gpu.Food.el.count,
						});
						
					}, 2000);
						
				});
			}
		});
		
	}
	
	
	draw() {
		
		this.gpu.tick();
		
		this._gui.draw();
		super.draw();
		
	}
	
}

new App();

