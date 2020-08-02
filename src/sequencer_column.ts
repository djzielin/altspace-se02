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

	private ourCells: MRE.Actor[]=[];
	private activeCell=-1;
	private prevNote=-1;

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
			this.ourCells.push(singleButton);

			singleButton.setBehavior(MRE.ButtonBehavior)
				.onButton("released", (user: MRE.User) => {
					if (this.ourSequencer.isAuthorized(user)) {
						if (this.activeCell === i) {
							this.ourCells[i].appearance.materialId = this.ourSequencer.ourApp.grayMat.id;
							this.activeCell = -1;

						} else {
							if (this.activeCell >= 0) {
								this.ourCells[this.activeCell].appearance.materialId =
									this.ourSequencer.ourApp.grayMat.id;
							}
							this.ourCells[i].appearance.materialId = this.ourSequencer.ourApp.greenMat.id;
							this.activeCell = i;
						}
						//TODO: send values to sequencer
					}
				});

			//TODO: add physics collision to activate as well. 
		}
	}

	public resetHeight(){
		for(const ourCell of this.ourCells){
			ourCell.transform.local.position.y=0;
		}
	}

	public noteOff(){
		if(this.prevNote>-1){
			this.ourSequencer.ourApp.ourMidiSender.send(`[128,${this.prevNote},0]`)
		}
		this.prevNote=-1;
	}

	public noteOn(note: number, vel: number){
		this.ourSequencer.ourApp.ourMidiSender.send(`[144,${note},${vel}]`)
		this.prevNote=note;
	}

	public bumpHeight(){
		let oneNoteOn=false;

		for(let i=0;i<this.ourCells.length;i++){
			const ourCell=this.ourCells[i];
			if(this.activeCell===i){
				ourCell.transform.local.position.y=0.2;
				const note=((this.ourCells.length-1)-this.activeCell)+this.ourSequencer.baseNote;
				this.noteOff();
				this.noteOn(note,127);
				oneNoteOn=true;
			} else{
				ourCell.transform.local.position.y=0.05;
			}
		}

		if(!oneNoteOn){
			this.noteOff();
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
