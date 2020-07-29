/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import Sequencer from './sequencer';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class SequencerColumn {
	public ourInteractionAuth=AuthType.All;
	public authorizedUser: MRE.User;
	
	public showBackground=true;

	public sphereMesh: MRE.Mesh;
	public boxMesh: MRE.Mesh;
	public cylinderMesh: MRE.Mesh;


	private seGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;

	private allNotes: MRE.Actor[]=[];
	
	constructor(private ourSequencer: Sequencer) {

	}

	public async createAsyncItems(startPos: MRE.Vector3, parentID: MRE.Guid) {

		const buttonActor = MRE.Actor.Create(this.ourSequencer.ourApp.context, {
			actor: {
				parentId: parentID,
				name: "toggleButton",
				appearance: {
					meshId: this.ourSequencer.ourApp.boxMesh.id,
					materialId: this.ourSequencer.ourApp.greenMat.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: 0, y: 0.00, z: 0.0 },
						scale: new MRE.Vector3(0.1, 0.1, 0.1)
					}
				}
			}
		});

		await buttonActor.created();

		/*

		this.buttonText = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourHolder.id,
				name: 'label',
				text: {
					contents: "",
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: {
						position: { x: 0, y: 0.051, z: 0.0 },
						rotation: MRE.Quaternion.FromEulerAngles(this.ourApp.degToRad(90), 0, 0)
					}
				}
			}
		});
		await this.buttonText.created();
	
		this.updateDisplayValue();
	
		// Set a click handler on the button.
		this.buttonActor.setBehavior(MRE.ButtonBehavior)
			.onButton("released", (user: MRE.User) => {
				const ourRoles = user.properties["altspacevr-roles"];
				if (ourRoles.includes("moderator") ||
					ourRoles.includes("presenter") || ourRoles.includes("terraformer")) {
	
					if (this.ourValue) {
						this.ourValue=false;
					} else {
						this.ourValue=true;
					}
	
					if(this.doVisualUpdates){
						this.updateDisplayValue();
					}
					callback(this.ourValue);
				}
			});
	}
	
	
	for(int x=0;x<16;x++){
		

	}
*/


		this.ourSequencer.ourApp.ourConsole.logMessage("completed all column object creation");
	}

	private isAuthorized(user: MRE.User): boolean {
		if (this.ourInteractionAuth === AuthType.All) {
			return true;
		}
		if (this.ourInteractionAuth === AuthType.Moderators) {
			return this.ourSequencer.ourApp.isAuthorized(user);
		}
		if (this.ourInteractionAuth === AuthType.SpecificUser) {
			if (user === this.authorizedUser) {
				return true;
			}
		}

		return false;
	}
}
