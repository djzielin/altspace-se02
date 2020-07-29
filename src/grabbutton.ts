/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
//import { MreArgumentError } from '../../mixed-reality-extension-sdk/packages/sdk/';
import Button from './button';

export default class GrabButton {
	private buttonActor: MRE.Actor = null;
	private lockButton: Button = null;
	private unLocked = false;
	
	constructor(private ourApp: App) {

	}

	public destroy() {
		this.buttonActor.destroy();
		this.lockButton.destroy();
	}

	public setUnlocked(b: boolean): void {
		this.unLocked=b;

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}else{
			this.buttonActor.grabbable=false;
		}
	}

	public getGUID(): MRE.Guid {
		return this.buttonActor.id;
	}

	public getPos(): MRE.Vector3{
		return this.buttonActor.transform.local.position;
	}
	public getRot(): MRE.Quaternion{
		return this.buttonActor.transform.local.rotation;
	}

	public create(pos: MRE.Vector3,rot=new MRE.Quaternion()) { //TODO: should this be async?

		this.buttonActor = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				name: "grabberButton",
				transform: {
					local: {
						position: pos,
						rotation: rot
					}
				},
				appearance: {
					meshId: this.ourApp.handMesh.id,
					materialId: this.ourApp.handMaterial.id
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Box
					},
					isTrigger: false
				},
				subscriptions: ["transform"]
			}
		});

		if(this.unLocked){
			this.buttonActor.grabbable=true;
		}

		this.lockButton=new Button(this.ourApp);
		this.lockButton.createAsync(new MRE.Vector3(0.0,0.0,-0.25),this.buttonActor.id,"unlocked","locked",
			this.unLocked, this.setUnlocked.bind(this),0.45);

		/*this.buttonActor.setBehavior(MRE.ButtonBehavior)
			.onButton("pressed", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {

					this.ourApp.ourConsole.logMessage("grab button pressed!");
					const ourUser = this.ourApp.findUserRecord(user.id);

					if (ourUser) {
						this.ourApp.ourConsole.logMessage("ourUser has enough permissions");
					}
				}
			})
			.onButton("released", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {

					this.ourApp.ourConsole.logMessage("grab button released!");
					//this.buttonActor.parentId=MRE.ZeroGuid; //is this how to unparent?
				}
			});*/
	}
}
