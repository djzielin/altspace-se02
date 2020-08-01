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
	private activeCell=-1;

	constructor(private ourSequencer: Sequencer) {

	}

	public async createAsyncItems(height: number, startPos: MRE.Vector3, incAmount: MRE.Vector3, parentID: MRE.Guid) {
		for (let i = 0; i < height; i++) {
			const singleButton = MRE.Actor.Create(this.ourSequencer.ourApp.context, {
				actor: {
					parentId: parentID,
					name: "SEQ_button",
					appearance: {
						meshId: this.ourSequencer.ourApp.boxMesh.id,
						materialId: this.ourSequencer.ourApp.grayMat.id
					},
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: {
							position: startPos.add(incAmount.multiplyByFloats(i, i, i)),
							scale: new MRE.Vector3(0.1, 0.1, 0.1)
						}
					}
				}
			});

			await singleButton.created();
			this.allNotes.push(singleButton);

			singleButton.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.ourSequencer.isAuthorized(user)) {
						if (this.activeCell === i) {
							this.allNotes[i].appearance.materialId = this.ourSequencer.ourApp.grayMat.id;
							this.activeCell = -1;

						} else {
							if (this.activeCell >= 0) {
								this.allNotes[this.activeCell].appearance.materialId =
									this.ourSequencer.ourApp.grayMat.id;
							}
							this.allNotes[i].appearance.materialId = this.ourSequencer.ourApp.greenMat.id;
							this.activeCell = i;
						}
						//TODO: send values to sequencer
					}
				});

			//TODO: add physics collision to activate as well. 
		}
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
