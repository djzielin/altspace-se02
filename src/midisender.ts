/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';

import WebSocket from 'ws';

interface RCallback {
	(note: number, vel: number): void;
}

export default class MidiSender {
	public ourCallback: RCallback = null;
	private wss: WebSocket.Server
	private oscRemotes: WebSocket[] = [];

	constructor() {
		const wss: WebSocket.Server = new WebSocket.Server({ port: 3904 });

		wss.on('connection', (ws: WebSocket) => {
			MRE.log.info("app", 'a remote midi forwarder has connected');
			this.oscRemotes.push(ws);

			ws.on('close', (code: number, reason: string) => {
				const index = this.oscRemotes.indexOf(ws);
				if (index > -1) {
					this.oscRemotes.splice(index, 1);
				}
			});
		});
	}

	public send(message: string) {
		MRE.log.info("app", 'requested to send midi message to local device: ' + message);

		for (const ws of this.oscRemotes) { 
			ws.send(message);
		}
	}
}
