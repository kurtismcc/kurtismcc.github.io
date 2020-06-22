import { Delaunay, Voronoi } from 'https://unpkg.com/d3-delaunay?module';

let drawable = null;
let ctx = null;
let data = null;
let voronoi = null;

let simulationFactory = function()
{
	const numPlayers = 1000;
	const targetPopulation = 30;
	const numServers = Math.ceil(numPlayers / targetPopulation);
	let players = new Array(numPlayers);
	let serverInfos = new Array(numServers);
	
	for(let i = 0; i < numPlayers; ++i)
	{
		players[i] = { 
			x: Math.random(),
			y: Math.random(),
			direction: Math.random() * 2 * Math.PI,
			speed: Math.random(),
			group: Math.floor(Math.random() * numServers)
		};
	}
	
	for(let i = 0; i < numServers; i++)
	{
		serverInfos[i] = {
			centroidX: Math.random(),
			centroidY: Math.random(),
			count: 0
		};
	}
	
	const maxSpeed = 0.01;
	const maxTurnRate = 0.25*Math.PI;
	
	let transfersLastStep = 0;
	
	function assignPlayerGroup(player)
	{
		let currentDeltaX = player.x - serverInfos[0].centroidX;
		let currentDeltaY = player.y - serverInfos[0].centroidY;
		let closestDistanceSq = currentDeltaX * currentDeltaX + currentDeltaY * currentDeltaY;
		let closestServer = 0;
		for(let j = 1; j < numServers; ++j)
		{
			currentDeltaX = player.x - serverInfos[j].centroidX;
			currentDeltaY = player.y - serverInfos[j].centroidY;
			let currentDistanceSq = currentDeltaX * currentDeltaX + currentDeltaY * currentDeltaY;
			if(currentDistanceSq < closestDistanceSq)
			{
				closestDistanceSq = currentDistanceSq;
				closestServer = j;
			}
		}
		if(closestServer != player.group)
		{
			player.group = closestServer;
			transfersLastStep++;
		}
		serverInfos[player.group].count++;
	}

	function assignPlayerGroups()
	{
		for(let i = 0; i < numServers; ++i)
		{
			serverInfos[i].count = 0;
		}
		for(let i = 0; i < numPlayers; ++i)
		{
			assignPlayerGroup(players[i]);
		}
	}
	
	function adjustServerCentroidsStep()
	{
		for(let i = 0; i < numServers; ++i)
		{
			serverInfos[i].centroidX = 0;
			serverInfos[i].centroidY = 0;
			serverInfos[i].count = 0;
		}
		
		for(let i = 0; i < numPlayers; ++i)
		{
			serverInfos[players[i].group].centroidX += players[i].x;
			serverInfos[players[i].group].centroidY += players[i].y;
			serverInfos[players[i].group].count++;
		}
		
		for(let i = 0; i < numServers; ++i)
		{
			serverInfos[i].centroidX /= serverInfos[i].count;
			serverInfos[i].centroidY /= serverInfos[i].count;
		}
	};
	
	function adjustServerCentroids(iterations)
	{
		for(let i = 0; i < iterations; ++i)
		{
			assignPlayerGroups();
			adjustServerCentroidsStep();
		}
		transfersLastStep = 0;
		assignPlayerGroups();
	};
	
	function updateBoundaries()
	{
		let pointData = new Array(numServers*2);
		for(let i = 0; i < numServers; ++i)
		{
			pointData[i*2] = serverInfos[i].centroidX * drawable.width;
			pointData[i*2+1] = serverInfos[i].centroidY * drawable.height;
		}
		let delaunay = new Delaunay(pointData);
		voronoi = delaunay.voronoi([0, 0, drawable.width, drawable.height]);
	}

	adjustServerCentroids(100);
	updateBoundaries();

	return {
		step: function() {
			transfersLastStep = 0;
			for(let i = 0; i < numPlayers; ++i)
			{
				players[i].speed = Math.random() * maxSpeed;
				players[i].direction += Math.random() * maxTurnRate - (0.5*maxTurnRate);
				players[i].x += players[i].speed * Math.cos(players[i].direction);
				players[i].y += players[i].speed * Math.sin(players[i].direction);
				
				// push players away from walls
				let pushRatio = 0.8;
				if(players[i].x < pushRatio)
				{
					let ratio = (pushRatio - players[i].x) / pushRatio;
					players[i].x += ratio * ratio * maxSpeed * 0.5;
				}
				if(players[i].x > (1.0 - pushRatio))
				{
					let ratio = (players[i].x - (1.0 - pushRatio)) / pushRatio;
					players[i].x -= ratio * ratio * maxSpeed * 0.5;
				}
				if(players[i].y < pushRatio)
				{
					let ratio = (pushRatio - players[i].y) / pushRatio;
					players[i].y += ratio * ratio * maxSpeed * 0.5;
				}
				if(players[i].y > (1.0 - pushRatio))
				{
					let ratio = (players[i].y - (1.0 - pushRatio)) / pushRatio;
					players[i].y -= ratio * ratio * maxSpeed * 0.5;
				}
			}
			assignPlayerGroups();
		},
		adjust: function() {
			adjustServerCentroids(10);
			updateBoundaries();
		},
		draw: function() {
			ctx.clearRect(0, 0, drawable.width, drawable.height);
			//ctx.strokeStyle = "#d8d8d8";
			//ctx.beginPath();
			//voronoi.render(ctx);
			//ctx.stroke();
			
			let colors = new Array(numServers);
			let colorStep = 360 / numServers;
			for(let i = 0; i < numServers; ++i)
			{
				colors[i] = "hsl(" + (colorStep * i) + ",100%,50%)";
			}
			
			for(let i = 0; i < numPlayers; ++i)
			{
				ctx.fillStyle = colors[players[i].group];
				ctx.fillRect(players[i].x * drawable.width, players[i].y * drawable.height, 2, 2);
			}
			
			data.innerHTML = "";
			for(let i = 0; i < numServers; ++i)
			{
				data.innerHTML += "server " + i + ": " + serverInfos[i].count + "<br/>";
			}
			data.innerHTML += "transfers: " + transfersLastStep;
		},
	};
};

window.onload = function()
{
	drawable = document.getElementById('drawable');
	if(!drawable)
	{
		alert('no drawable surface found!');
	}	
	ctx = drawable.getContext('2d');
	data = document.getElementById('data');
	if(!data)
	{
		alert('no data div found');
	}
	
	let iteration = 0;
	let simulation = simulationFactory();
	window.setInterval(function() {
		iteration++;
		simulation.step();
		if(iteration == 100)
		{
			simulation.adjust();
			iteration = 0;
		}
		simulation.draw();
	}, 50);
};
