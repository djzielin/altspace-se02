/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import Knob from './knob';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Se02 {
	public ourInteractionAuth=AuthType.Moderators;
	public authorizedUser: MRE.User;

	public seScale=1.0;
	
	public showBackground=true;

	public sphereMesh: MRE.Mesh;
	public boxMesh: MRE.Mesh;
	public cylinderMesh: MRE.Mesh;


	private seGrabber: GrabButton=null;
	public seBackground: MRE.Actor=null;

	private allKnobs: Knob[]=[];
	private draggingKnobs: Map<MRE.User,Knob>=new Map();
	
	constructor(private ourApp: App) {

	}

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating se02 asyn items");

		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		this.cylinderMesh = this.ourApp.assets.createCylinderMesh('cylinder',1,0.5,"y",10);
		await this.cylinderMesh.created;

		const seMesh = this.ourApp.assets.createBoxMesh('boxMesh', 2.5, 0.05, 1.0);
		await seMesh.created;

		this.seGrabber=new GrabButton(this.ourApp);
		this.seGrabber.create(pos,rot);

		const filename = `${this.ourApp.baseUrl}/` + "se_flipped.png";
		const seTexture = this.ourApp.assets.createTexture("se", {
			uri: filename
		});

		const seMaterial = this.ourApp.assets.createMaterial('seMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: seTexture.id
		});

		this.seBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.seGrabber.getGUID(),
				name: "seBackground",
				appearance: {
					meshId: seMesh.id,
					materialId: seMaterial.id,
					enabled: this.showBackground
				},
				transform: {
					local: {
						position: new MRE.Vector3(-(this.seScale*2.5 * 0.5 + 0.5), 0, 0 ),
						scale: new MRE.Vector3(this.seScale, this.seScale, this.seScale)
					}
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Auto
					}
				}
			}
		});
	
		const buttonBehavior = this.seBackground.setBehavior(MRE.ButtonBehavior);		

		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				if (!this.draggingKnobs.has(user)) {


					const penPos = buttonData.targetedPoints[0].localSpacePoint;
					const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);

					let nearestKnob = 1000;
					let ourKnob = null;
					for (const knob of this.allKnobs) {
						const dist = knob.knobCenterPos.subtract(posVector3).length();
						if (dist < nearestKnob) {
							nearestKnob = dist;
							ourKnob = knob;
						}
					}

					this.ourApp.ourConsole.logMessage("user: " + user.name + " grabbed knob: " + ourKnob.ourName);

					ourKnob.userPressed(posVector3);
					this.draggingKnobs.set(user, ourKnob);
				}
			}
		});

		buttonBehavior.onButton("holding", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				if (this.draggingKnobs.has(user)) {
					const numPoints = buttonData.targetedPoints.length;
					const point = buttonData.targetedPoints[numPoints - 1];
					const penPos = point.localSpacePoint;
					const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
					
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is holding knob: " +ourKnob.ourName);

					ourKnob.userHolding(posVector3);
				}
			}
		});

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				if(this.draggingKnobs.has(user)){
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is releasing knob: " +ourKnob.ourName);

					ourKnob.userReleased();
					this.draggingKnobs.delete(user);
				}
			}
		});

		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				if(this.draggingKnobs.has(user)){
					const ourKnob=this.draggingKnobs.get(user);
					this.ourApp.ourConsole.logMessage("user: " + user.name + " is releasing knob: " +ourKnob.ourName);

					ourKnob.userReleased();
					this.draggingKnobs.delete(user);
				}
			}
		});	

		await this.seBackground.created();

		const cutoffKnob=new Knob(this.ourApp,this,"cutoff",74);
		await cutoffKnob.createAsyncItems(new MRE.Vector3(0.165,0,0.243),this.seBackground.id);
		this.allKnobs.push(cutoffKnob);

		const emphasisKnob=new Knob(this.ourApp,this,"emphasis",71);
		await emphasisKnob.createAsyncItems(new MRE.Vector3(0.33,0,0.243),this.seBackground.id);
		this.allKnobs.push(emphasisKnob);

		const filtA=new Knob(this.ourApp,this,"filt_attack",47);
		await filtA.createAsyncItems(new MRE.Vector3(0.165,0,0.082),this.seBackground.id);
		this.allKnobs.push(filtA);

		const filtD=new Knob(this.ourApp,this,"filt_decay",52);
		await filtD.createAsyncItems(new MRE.Vector3(0.33,0,0.082),this.seBackground.id);
		this.allKnobs.push(filtD);

		const filtS=new Knob(this.ourApp,this,"filt_sustain",53);
		await filtS.createAsyncItems(new MRE.Vector3(0.49,0,0.085),this.seBackground.id);
		this.allKnobs.push(filtS);

		const filtContour=new Knob(this.ourApp,this,"filt_contour",59);
		await filtContour.createAsyncItems(new MRE.Vector3(0.66,0,0.243),this.seBackground.id);
		this.allKnobs.push(filtContour);

		this.ourApp.ourConsole.logMessage("completed all se02 object creation");
	}
	
	private isAuthorized(user: MRE.User): boolean{
		if(this.ourInteractionAuth===AuthType.All){
			return true;
		}
		if(this.ourInteractionAuth===AuthType.Moderators){
			return this.ourApp.isAuthorized(user);
		}
		if(this.ourInteractionAuth===AuthType.SpecificUser){
			if(user===this.authorizedUser){
				return true;
			}
		}

		return false;
	}
}
