/*!
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
//import * as MRE from '../../mixed-reality-extension-sdk/packages/sdk/';
import App from './app';
import GrabButton from './grabbutton';
import Knob from './knob';
import Button from './button';

enum AuthType {
	Moderators=0,
	All=1,
	SpecificUser=2
  }


export default class Sequencer {
	public ourInteractionAuth=AuthType.All;
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
	
	constructor(public ourApp: App) {

	}

	
	public async createAsyncItems(pos: MRE.Vector3, rot=new MRE.Quaternion()) {
		this.ourApp.ourConsole.logMessage("creating se02 asyn items");

		this.boxMesh = this.ourApp.assets.createBoxMesh('boxMesh', 1.0, 1.0, 1.0);
		await this.boxMesh.created;

		this.sphereMesh = this.ourApp.assets.createSphereMesh('sphereMesh',0.5,10,10);
		await this.sphereMesh.created;

		this.cylinderMesh = this.ourApp.assets.createCylinderMesh('cylinder',1.0,0.5,'y',10);
		await this.cylinderMesh.created;

		const seMesh = this.ourApp.assets.createBoxMesh('boxMesh', 2.5, 0.05, 1.0);
		await seMesh.created;

		this.seGrabber=new GrabButton(this.ourApp);
		this.seGrabber.create(pos,rot);
		
		/*for(let x=0;x<16;x++){
			

		}
*/


		this.ourApp.ourConsole.logMessage("completed all sequencer object creation");
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
