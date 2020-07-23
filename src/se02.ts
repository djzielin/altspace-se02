/*!
 * Licensed under the MIT License.
 */

//import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import { listenerCount } from 'process';
import { equal } from 'assert';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Se02 {
	public ourInteractionAuth=AuthType.Moderators;
	public authorizedUser: MRE.User;

	public spawnerScale=2.0;
	
	public showBackground=true;

	private sphereMesh: MRE.Mesh;
	private boxMesh: MRE.Mesh;

	private staffGrabber: GrabButton=null;

	public staffBackground: MRE.Actor=null;
	private staffRootTime=-1;

	private isDragging=false;
	private startPos: MRE.Vector3;

	private cutoffKnob: MRE.Actor=null;
	private cutoffCenter: MRE.Vector3=new MRE.Vector3(0.165,0,0.24);
	private startAngle=0.0;
	private cutoffAngle=0.0;

	constructor(private ourApp: App) {

	}

	private setCutoffRotation(){
		this.cutoffKnob.transform.local.rotation=
			MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(this.cutoffAngle), this.ourApp.degToRad(90));
			
		const value=(this.cutoffAngle+150)/300.0*127.0;
		this.ourApp.ourMidiSender.send('[176,74,'+value.toFixed(0)+']');			

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

	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating staff asyn items");

		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		const cylinderMesh = this.ourApp.assets.createCylinderMesh('cylinder',1,0.5,"y",10);

		const seMesh = this.ourApp.assets.createBoxMesh('boxMesh', 2.5, 0.05, 1.0);
		await seMesh.created;

		this.staffGrabber=new GrabButton(this.ourApp);
		this.staffGrabber.create(pos,rot);

		const consoleMat = this.ourApp.assets.createMaterial('consolemat', {
			color: new MRE.Color3(1.0,1.0,1.0) //TODO move material over to app
		});
		await consoleMat.created;

		const filename = `${this.ourApp.baseUrl}/` + "se_flipped.png";
		const seTexture = this.ourApp.assets.createTexture("se", {
			uri: filename
		});

		const seMaterial = this.ourApp.assets.createMaterial('seMat', {
			color: new MRE.Color4(1, 1, 1),
			mainTextureId: seTexture.id
		});


		this.staffBackground = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.staffGrabber.getGUID(),
				name: "staffBackground",
				appearance: {
					meshId: seMesh.id,
					materialId: seMaterial.id,
					enabled: this.showBackground
				},
				transform: {
					local: {
						position: new MRE.Vector3(-(this.spawnerScale*2.5 * 0.5 + 0.5), 0, 0 ),
						scale: new MRE.Vector3(this.spawnerScale, this.spawnerScale, this.spawnerScale)
					}
				},
				collider: {
					geometry: {
						shape: MRE.ColliderType.Auto
					}
				}
			}
		});

		//this.updateStaffWidth();
		
		const buttonBehavior = this.staffBackground.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onHover("exit", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
				this.ourApp.ourConsole.logMessage("user hover has ended at: " + posVector3);

				if(this.isDragging){
					this.isDragging=false;
					this.cutoffKnob.appearance.materialId=this.ourApp.whiteMat.id;

				}
			}
		});

		buttonBehavior.onButton("pressed", (user: MRE.User, buttonData: MRE.ButtonEventData) => {

			if (this.ourApp.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);

				this.ourApp.ourConsole.logMessage("user pressed on staff at: " + posVector3);
				this.startPos=posVector3;
				this.cutoffKnob.appearance.materialId=this.ourApp.redMat.id;
				this.isDragging=true;

				const lineVec=this.startPos.subtract(this.cutoffCenter).normalize();
				this.startAngle=Math.atan2(lineVec.z,lineVec.x)*180.0/Math.PI;
				
				this.ourApp.ourConsole.logMessage("computed startAngle: " + this.startAngle);

			}
		});

		buttonBehavior.onButton("holding", (user: MRE.User, buttonData: MRE.ButtonEventData) => {

			if (this.ourApp.isAuthorized(user)) {

				if (this.isDragging) {
					this.ourApp.ourConsole.logMessage("----------------------------");
					this.ourApp.ourConsole.logMessage("user is holding ");
					//this.ourApp.ourConsole.logMessage("number of points: " + buttonData.targetedPoints.length);

					const numPoints=buttonData.targetedPoints.length;

					const point = buttonData.targetedPoints[numPoints-1];
					const penPos = point.localSpacePoint;
					const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
					
					posVector3.y=this.startPos.y; //hack to fix MRE bug

					//const line1=this.startPos.subtract(this.cutoffCenter).normalize();
					const lineVec=posVector3.subtract(this.cutoffCenter).normalize();
					//const angleBetween=Math.acos(MRE.Vector3.Dot(line1,line2));
					//const degrees=angleBetween*180.0/Math.PI;

					let endAngle=Math.atan2(lineVec.z,lineVec.x)*180.0/Math.PI;
					const rawAngle=endAngle;

					const sQuad=this.calcQuandrant(this.startAngle);
					const eQuad=this.calcQuandrant(endAngle);

					if(sQuad===2 && eQuad===3){
						endAngle+=360;
					}
					if(sQuad===3 && eQuad===2){
						endAngle-=360;
					}					

					let deltaAngle=this.startAngle-endAngle;

					this.cutoffAngle+=deltaAngle;
					if(this.cutoffAngle>150){
						this.cutoffAngle=150;
					}
					if(this.cutoffAngle<-150){
						this.cutoffAngle=-150;
					}
					this.setCutoffRotation();

					this.ourApp.ourConsole.logMessage("startAngle: " + this.startAngle + " endAngle: " + endAngle);
					this.ourApp.ourConsole.logMessage("start quad: " + sQuad + " end quad: " + eQuad);
					this.ourApp.ourConsole.logMessage("delta: " + deltaAngle);
					this.ourApp.ourConsole.logMessage("cutoff angle: " + this.cutoffAngle);


					this.startAngle=rawAngle;
				}
			}
		});

		buttonBehavior.onButton("released", (user: MRE.User, buttonData: MRE.ButtonEventData) => {
			if (this.ourApp.isAuthorized(user)) {
				const penPos = buttonData.targetedPoints[0].localSpacePoint;
				const posVector3 = new MRE.Vector3(penPos.x, penPos.y, penPos.z);
				this.ourApp.ourConsole.logMessage("user released on staff at: " + posVector3);

				if(this.isDragging){
					this.cutoffKnob.appearance.materialId=this.ourApp.whiteMat.id;
					this.isDragging=false;
				}
			}
		});
		

		await this.staffBackground.created();

		this.cutoffKnob = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.staffBackground.id,
				name: "knobCenter",
				appearance: {
					meshId: cylinderMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: this.cutoffCenter,
						scale: new MRE.Vector3(0.1,0.055,0.055),
						rotation: MRE.Quaternion.FromEulerAngles(0, this.ourApp.degToRad(0), this.ourApp.degToRad(90))
					}
				}
			}
		});

		const knobLine = MRE.Actor.Create(this.ourApp.context, {
			actor: {
				parentId: this.cutoffKnob.id,
				name: "knob",
				appearance: {
					meshId: this.boxMesh.id,
					materialId: this.ourApp.whiteMat.id,
					enabled: true
				},
				transform: {
					local: {
						position: new MRE.Vector3(0.0,0,0.5),
						scale: new MRE.Vector3(1.0,0.1,0.2),
						//rotation: MRE.Quaternion.FromEulerAngles(0, 0, this.ourApp.degToRad(90))
					}
				}				
			}
		});

		this.setCutoffRotation();

		this.ourApp.ourConsole.logMessage("completed all staff object creation");
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
