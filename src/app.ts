/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
//import { Session } from '../../mixed-reality-extension-sdk/packages/sdk/built/internal/adapters/multipeer'

import {PianoReceiver, RCallback} from './receiver'
import Piano from './piano'
import OscSender from './oscsender';
import Console from './console';
import Button from './button';
import GrabButton from './grabbutton';
import PianoGui from './piano_gui';
import MidiSender from './midisender';
import Se02 from './se02';

/**
 * The main class of this app. All the logic goes here.
 */

interface UserProperties {
	name: string;
	user: MRE.User;
	userID: MRE.Guid;
	clientId: MRE.Guid;
	authButton: Button;
	handButton: Button;
	lHand: MRE.Actor;
	rHand: MRE.Actor;
	isModerator: boolean;
}

export default class App {
	public assets: MRE.AssetContainer;

	public ourPiano: Piano = null;
	public ourPianoGui: PianoGui = null;
	public ourSE: Se02 = null;

	public ourConsole: Console = null;
	public menuGrabber: GrabButton=null;

	public boxMesh: MRE.Mesh;
	public redMat: MRE.Material;
	public greenMat: MRE.Material;
	public whiteMat: MRE.Material;
	public blackMat: MRE.Material;
	public grayMat: MRE.Material;
	
	public handMesh: MRE.Mesh = null;
	public handTexture: MRE.Texture = null;
	public handMaterial: MRE.Material = null;
	
	public allUsers: UserProperties[] = [];
	public moderatorUsers: string[] = [];

	private receiverCallback: RCallback;

	//public allHands: MRE.Actor[] = [];

	/*
		https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript	
	*/	
	public pad(value: number, maxWidth: number, padChar: string) {
		const n = value.toString();
		return n.length >= maxWidth ? n : new Array(maxWidth - n.length + 1).join(padChar) + n;
	}
	
	constructor(public context: MRE.Context, public baseUrl: string, public baseDir: string,
		public ourReceiver: PianoReceiver, public ourOscSender: OscSender, public ourMidiSender: MidiSender) {
		this.ourConsole=new Console(this);

		this.assets = new MRE.AssetContainer(context);
		this.boxMesh = this.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		
		this.redMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(1, 0, 0)
		});

		this.greenMat = this.assets.createMaterial('redmat', {
			color: new MRE.Color4(0, 1, 0)
		});
		this.blackMat = this.assets.createMaterial('blackMat', {
			color: new MRE.Color4(0, 0, 0)
		});
		this.whiteMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(1, 1, 1)
		});
		this.grayMat = this.assets.createMaterial('whiteMat', {
			color: new MRE.Color4(0.5,0.5,0.5)
		});

		const filename = `${this.baseUrl}/` + "hand_grey.png";
		this.handTexture = this.assets.createTexture("hand", {
			uri: filename
		});

		this.handMaterial = this.assets.createMaterial('handMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: this.handTexture.id
		});

		this.handMesh = this.assets.createBoxMesh('boxMesh', 0.25, 0.1, 0.25);


		this.menuGrabber=new GrabButton(this);
		this.menuGrabber.create(new MRE.Vector3(1, 0.1, 0));

		this.context.onStarted(() => this.started());
		this.context.onStopped(() => this.stopped());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));
	}	

	//from functional-tests / user-test.ts
	/*private formatProperties(props: { [key: string]: string }): string {
		let output = "";
		for (const k in props) {
			if (Object.prototype.hasOwnProperty.call(props, k)) {
				output += `\n   ${k}: ${props[k]}`;
			}
		}
		return output;
	}*/

	public isAuthorized(user: MRE.User): boolean {
		const ourRoles = user.properties["altspacevr-roles"];

		if (ourRoles.includes("moderator") || ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {
			return true;
		}

		return false;
	}

	public isAuthorizedString(user: string): boolean {
		if(this.moderatorUsers.includes(user)){
			//this.ourConsole.logMessage("user is moderator based on GUID");
			return true;
		}

		//this.ourConsole.logMessage("user is NOT moderator based on GUID");
		return false;
	}


	private userJoined(user: MRE.User) {
		this.ourConsole.logMessage("user joined. name: " + user.name + " id: " + user.id);

		let isModerator=false

		if (this.isAuthorized(user)){
			isModerator=true;
		}

		const rHand: MRE.Actor = null;
		const lHand: MRE.Actor = null;
		
		/*let id = MRE.ZeroGuid;
		const clients = this.session.clients;
		for (const client of clients) {
			if (client.userId === user.id) {
				id = client.id;
				break;
			}
		}*/	

		const ourUser = {
			name: user.name,
			user: user,
			userID: user.id,
			clientId: user.id,
			authButton: null as Button,
			handButton: null as Button,
			rHand: rHand,
			lHand: lHand,
			isModerator: isModerator
		}
		this.allUsers.push(ourUser);

		if(isModerator){
			this.moderatorUsers.push(user.id.toString());
		}

		this.addHands(ourUser);
		//this.updateUserButtons();

		/*const particleActor = MRE.Actor.CreateFromLibrary(this.context, {
			resourceId: "artifact:1520871632212591055",
			actor: {
				name: 'particle burst',
				//parentId: this.staffGrabber.getGUID(),
				transform: {
					local: {
						scale: new MRE.Vector3(0.1,0.1,0.1)
					}
				},
				attachment: {
					attachPoint: 'right-hand',
					userId: user.id
				},
				Appearance:{
					enabled: true
				}
			}
		});*/
	}

	public findUserRecord(userID: MRE.Guid): UserProperties{
		for(let i=0;i<this.allUsers.length;i++){
			const ourUser=this.allUsers[i];
			if(ourUser.userID===userID){
				return ourUser;
			}
		}

		this.ourConsole.logMessage("ERROR: can't find userID: " + userID);
		return null;
	}


	private addHands(ourUser: UserProperties){
		this.ourConsole.logMessage("creating hands for: " + ourUser.name);
	
		ourUser.rHand = this.createHand('right-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.03, 0.03, 0.14));
		ourUser.lHand = this.createHand('left-hand', ourUser.userID, new MRE.Vector3(0, 0, 0.1),
			new MRE.Vector3(0.03, 0.03, 0.14));
	}


	
	private userLeft(user: MRE.User) {
		this.ourConsole.logMessage("user left. name: " + user.name + " id: " + user.id);
		this.ourConsole.logMessage("  user array pre-deletion is size: " + this.allUsers.length);

		for (let i = 0; i < this.allUsers.length; i++) {
			const ourUser = this.allUsers[i];

			if (ourUser.userID === user.id) {
				if (ourUser.authButton) {
					ourUser.authButton.destroy();
				}
				if (ourUser.handButton) {
					ourUser.handButton.destroy();
				}
				this.allUsers.splice(i, 1);
				
				if(ourUser.isModerator){
					const userString=user.id.toString();

					const index=this.moderatorUsers.indexOf(userString);
					if(index!==-1){
						this.moderatorUsers.splice(index, 1);
						this.ourConsole.logMessage("removed user from moderator string list");
					}	
				}

				//this.removeHands(ourUser);

				break;
			}
		}

		this.ourConsole.logMessage("  user array is now size: " + this.allUsers.length);
	}

	private PianoReceiveCallback(note: number, vel: number): void {
		this.ourConsole.logMessage(`App received - note: ${note} vel: ${vel}`);

		if (vel > 0) {
			//if(this.ourWavPlayer){
			//	this.ourWavPlayer.playSound(note,127,new MRE.Vector3(0,0,0), 20.0);
			//}
			if (this.ourPiano) {
				this.ourPiano.keyPressed(note, vel);
			}
		} else {
			//this.ourPiano.stopSound(note);
			if (this.ourPiano) {
				this.ourPiano.keyReleased(note);
			}
		}
	}

	private createHand(aPoint: string, userID: MRE.Guid, handPos: MRE.Vector3, handScale: MRE.Vector3) {
		const hand = MRE.Actor.Create(this.context, {
			actor: {
				name: 'SpawnerUserHand_'+userID.toString(),
				transform: {
					local: {
						position: handPos,
						scale: handScale
					}
				},
				attachment: {
					attachPoint: aPoint as MRE.AttachPoint,
					userId: userID
				},
				appearance:
				{
					meshId: this.boxMesh.id,
					enabled: false
				}
			}
		});

		hand.setCollider(MRE.ColliderType.Box, false);
		hand.enableRigidBody({
			enabled: true,
			isKinematic: true,
			useGravity: false//,
			//collisionDetectionMode: MRE.CollisionDetectionMode.Discrete
			//collisionDetectionMode: MRE.CollisionDetectionMode.Continuous
			//collisionDetectionMode: MRE.CollisionDetectionMode.ContinuousDynamic
		});

		//hand.subscribe('transform');
		//hand.subscribe('rigidbody');
		//hand.subscribe('collider');

		return hand;
	}

	public degToRad(degrees: number) {
		const pi = Math.PI;
		return degrees * (pi / 180);
	}	
	private doReset(){
		process.exit(0);
	}

	public vector2String(v: MRE.Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}
	
	private async loadAsyncItems() {
		this.ourConsole.logMessage("creating console");
		await this.ourConsole.createAsyncItems(this.menuGrabber.getGUID());

		this.ourConsole.logMessage("Creating Reset Button ");
		const button=new Button(this);
		await button.createAsync(new MRE.Vector3(-0.7,0,0.5),this.menuGrabber.getGUID(),"Reset","Reset",
			false, this.doReset.bind(this));

		

		this.ourConsole.logMessage("creating piano keys"); 
		this.ourPiano = new Piano(this);
		await this.ourPiano.createAllKeys(new MRE.Vector3(2, 1, 0),
			MRE.Quaternion.FromEulerAngles(-30* Math.PI / 180,0,0));

		let xPos = -2.75;

		this.ourPianoGui = new PianoGui(this, this.ourPiano);
		await this.ourPianoGui.createAsync(new MRE.Vector3(xPos, 0.1, 0), "Main Piano")
		xPos -= 1.75;	

		this.ourConsole.logMessage("Loading staff items");
		this.ourSE = new Se02(this);
		await this.ourSE.createAsyncItems(new MRE.Vector3(2, 1.75, 0.5),
			MRE.Quaternion.FromEulerAngles(-90 * Math.PI / 180, 0, 0));
	}
	private stopped(){
		MRE.log.info("app", "stopped callback has been called");
		this.ourReceiver.removeReceiver(this.receiverCallback);
	}

	private started() {
		this.ourConsole.logMessage("started callback has begun");

		this.loadAsyncItems().then(() => {
			this.ourConsole.logMessage("all async items created/loaded!");
			this.receiverCallback=this.PianoReceiveCallback.bind(this)
			this.ourReceiver.addReceiver(this.receiverCallback);
		});
	}
}
