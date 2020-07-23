/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import Se02 from './se02';

export default class Knob {
	private startPos: MRE.Vector3;

	private cutoffKnob: MRE.Actor=null;
	public knobCenterPos: MRE.Vector3;
	private startAngle=0.0;
	private cutoffAngle=0.0;
	private ourLine: MRE.Actor=null;

	constructor(private ourApp: App, private ourSE: Se02, public ourName: string, public ourCC: number) {

	}

	private drawUserLine(startPos: MRE.Vector3, endPos: MRE.Vector3){

		const halfPos=(startPos.add(endPos)).multiply(new MRE.Vector3(0.5,0.5,0.5));	
		const length=(startPos.subtract(endPos)).length();

		const y=endPos.z-startPos.z;
		const x=endPos.x-startPos.x;

		//this.ourApp.ourConsole.logMessage(`hyp: ${length} opp: ${opposite}`);

		const tah=Math.atan2(y,x);
		this.ourApp.ourConsole.logMessage(`tah: ${tah}`);

		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=0.03;

		this.ourLine = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.ourSE.seBackground.id,
				name: "user_line",
				appearance: {
					meshId: this.ourApp.boxMesh.id,
					materialId: this.ourApp.redMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: halfPos,
						rotation: rot,
						scale: new MRE.Vector3(length,scale,scale)
					}
				}
			}
		});
	}

	private updateLine(startPos: MRE.Vector3, endPos: MRE.Vector3){
		const halfPos=(startPos.add(endPos)).multiply(new MRE.Vector3(0.5,0.5,0.5));	
		const length=(startPos.subtract(endPos)).length();

		const y=endPos.z-startPos.z;
		const x=endPos.x-startPos.x;

		//this.ourApp.ourConsole.logMessage(`hyp: ${length} opp: ${opposite}`);

		const tah=Math.atan2(y,x);
		this.ourApp.ourConsole.logMessage(`tah: ${tah}`);

		const rot=MRE.Quaternion.FromEulerAngles(0,-tah,0);
		const scale=0.03;

		this.ourLine.transform.local.position=halfPos;
		this.ourLine.transform.local.rotation=rot;
		this.ourLine.transform.local.scale= new MRE.Vector3(length,scale,scale);
	}

	private setCutoffRotation(){
		this.cutoffKnob.transform.local.rotation=
			MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(this.cutoffAngle), this.ourApp.degToRad(90));
			
		const value=(this.cutoffAngle+150)/300.0*127.0;
		this.ourApp.ourMidiSender.send('[176,'+this.ourCC.toFixed(0)+','+value.toFixed(0)+']');			

	}

	public calcQuandrant(angle: number): number{
		if(angle>=0 && angle<90){
			return 1;
		}
		if((angle>=90 && angle <180) || (angle>=-270 && angle < -180)){
			return 2;
		}
		if((angle>=-180 && angle< -90) || (angle>=180 && angle < 270)){
			return 3;
		}
		if(angle>=-90 && angle < 0){
			return 4;
		}
	}

	public userReleased(){
		this.cutoffKnob.appearance.materialId=this.ourApp.whiteMat.id;
	}

	public userPressed(pos: MRE.Vector3) {
		this.startPos = pos.clone();
		this.cutoffKnob.appearance.materialId = this.ourApp.redMat.id;

		const lineVec = this.startPos.subtract(this.knobCenterPos).normalize();
		this.startAngle = Math.atan2(lineVec.z, lineVec.x) * 180.0 / Math.PI;
	}

	public userHolding(pos: MRE.Vector3) {

		const posVector3 = pos.clone();

		posVector3.y = this.startPos.y; //hack to fix MRE bug

		const lineVec = posVector3.subtract(this.knobCenterPos).normalize();


		let endAngle = Math.atan2(lineVec.z, lineVec.x) * 180.0 / Math.PI;
		const rawAngle = endAngle;

		const sQuad = this.calcQuandrant(this.startAngle);
		const eQuad = this.calcQuandrant(endAngle);

		if (sQuad === 2 && eQuad === 3) { //deal with discontinuity 
			endAngle += 360;
		}
		if (sQuad === 3 && eQuad === 2) {
			endAngle -= 360;
		}

		let deltaAngle = this.startAngle - endAngle;

		this.cutoffAngle += deltaAngle;
		if (this.cutoffAngle > 150) {
			this.cutoffAngle = 150;
		}
		if (this.cutoffAngle < -150) {
			this.cutoffAngle = -150;
		}
		this.setCutoffRotation();

		this.startAngle = rawAngle;
		//this.updateLine(this.cutoffCenter,posVector3);
	}

	public async createAsyncItems(pos: MRE.Vector3, parentID: MRE.Guid) {
		this.ourApp.ourConsole.logMessage("creating staff asyn items");		
		this.knobCenterPos=pos;
	
		this.cutoffKnob = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: parentID,
				name: "knobCenter",
				appearance: {
					meshId: this.ourSE.cylinderMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: this.knobCenterPos,
						scale: new MRE.Vector3(0.1,0.060,0.060),
						rotation: MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(0), this.ourApp.degToRad(90))
					}
				}
			}
		});
		await this.cutoffKnob.created();

		const knobLine = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.cutoffKnob.id,
				name: "knob",
				appearance: {
					meshId: this.ourSE.boxMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0,0,0.5),
						scale: new MRE.Vector3(1.1,0.1,0.3),
						//rotation: MRE.Quaternion.FromEulerAngles(0, 0, this.ourApp.degToRad(90))
					}
				}				
			}
		});
		await knobLine.created();


		const knobOuter = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.cutoffKnob.id,
				name: "knobCenter",
				appearance: {
					meshId: this.ourSE.cylinderMesh.id,
					materialId: this.ourApp.blackMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0, 0, 0.0),
						scale: new MRE.Vector3(0.9, 1.2, 1.2)
					}
				}
			}
		});
		await knobOuter.created();

		this.setCutoffRotation();

		this.ourApp.ourConsole.logMessage("completed all knob object creation");
	}
}
