// Import externals
import ArchiveRequest from "./lib/archiverequest.js";
import { Vehicle, Image } from "./db/index.js";
import Path from "path";
import FS from "fs";
import Axios from "axios";
import Server from "./lib/web.js";
const archiveRequest = new ArchiveRequest();
const __dirname = Path.resolve();

// Some global variables to indicate if we're fetching anything right now...
let fetchingVehicles = false;
let fetchingImages = false;

async function main() {
	// Check how many vehicles are in the DB
	let vehicleCount = await Vehicle.count();
	console.log("We have",vehicleCount,"vehicles in the DB right now.");

	// Use the Wayback Machine's fancy CDX interface to get a list of captures we can use
	const carListRaw = await archiveRequest.getCarList();
	
	// Parse that list down to the most recent capture for each URL.
	const carList = archiveRequest.parseList(carListRaw);

	console.log("We can see", carList.length, "cars on the Wayback Machine's archive");

	if (vehicleCount < carList.length) {
		// Nope. Better scrape the wayback machine for what we can, then.
		console.log("Fetching missing vehicles");
		fetchingVehicles = true;
		await getVehicles(carList);
		fetchingVehicles = false;
	}

	// Do we have any images?
	let imageCount = FS.readdirSync(Path.resolve(__dirname, "images")).length
	console.log("We have", imageCount, "images in the filesystem right now.");
	// Use the Wayback machine's CDX query to get the images we can find
	const imageListRaw = await archiveRequest.getImageList();
	// Parse the JSON list we just got and pare down duplicates
	const imageList = archiveRequest.parseList(imageListRaw);
	const thumbListRaw = await archiveRequest.getThumbnailList();
	const thumbList = archiveRequest.parseList(thumbListRaw);
	let fullImageList = {};
	for (const image of thumbList) {
		const id = image.original.match(/(\d+)$/)[0];
		fullImageList[id] = { original: image.original, timestamp: image.timestamp };
	}
	for (const image of imageList) {
		const id = image.original.match(/(\d+$)/)[0];
		fullImageList[id] = { original: image.original, timestamp: image.timestamp };
	}
	const fullImageLength = Object.keys(fullImageList).length;
	console.log("We can see %s images on the Wayback Machine's archive (%s thumbnails, %s full images)", fullImageLength, imageList.length, thumbList.length);
	if (imageCount < fullImageLength) {
		console.log("Fetching Images");
		// Nope. Better fetch those from the wayback machine, at least what we can.
		fetchingImages = true;
		await getImages(fullImageList);
		fetchingImages = false;
	}
}
main().catch(e => console.error(e.stack));

async function getVehicles(carList) {

	// Now, for each vehicle capture we've found...
	for (const car of carList) {
		
		// Find it's ID...
		let id = car.original.match(/(\d+)$/)[0];
		
		// And check if we've got it or not.
		let veh = await Vehicle.findByPk(id);

		// If we don't...
		if (!veh) {
			// Fetch the HTML of the garage page
			const carHTML = await archiveRequest.getCarHTML(car.original, car.timestamp);
			// And parse it into a more code-oriented format
			const carJSON = archiveRequest.parseCarHTML(carHTML);
			// Then make a DB object for it, and populate it with the data we just parsed.
			const vehicle = Vehicle.build({
				vehicleName: carJSON.Vehicle_Name,
				builder: carJSON.Builder,
				started: carJSON.Started,
				estFinish: carJSON["Est._Finish"],
				buildDuration: carJSON.Build_Duration,
				buildHours: carJSON.Build_Hours,
				pctComplete: carJSON.pct_Complete,
				added: carJSON.Added,
				lastUpdated: carJSON.Last_Updated,
				donorVehicleYear: carJSON.Donor_Vehicle.split(" ",3)[0],
				donorVehicleMake: carJSON.Donor_Vehicle.split(" ",3)[1],
				donorVehicleModel: carJSON.Donor_Vehicle.split(" ",3)[2],
				donorCost: carJSON.Donor_Cost,
				conversionCost: carJSON.Conversion_Cost,
				totalCost: carJSON.Total_Cost,
				maxPower: carJSON.Max_Power,
				topSpeed: carJSON.Top_Speed,
				acceleration: carJSON.Acceleration,
				finalWeight: carJSON.Final_Weight,
				rangeAt30: carJSON.Range_at_30,
				rangeAt55: carJSON.Range_at_55,
				batteryType: carJSON.Battery_Type,
				batteryManufacturer: carJSON.Battery_Manufacturer,
				batteryConfiguration: carJSON.Battery_Configuration,
				batteryPackVoltage: carJSON.Battery_Pack_Voltage,
				charger: carJSON.Charger,
				chargeTime: carJSON.Charge_Time,
				controller: carJSON.Controller,
				motor: carJSON.Motor,
				dc2dcConverter: carJSON["DC-DC_Converter"],
				airConditioning: carJSON.Air_Conditioning,
				powerSteering: carJSON.Power_Steering,
				brakes: carJSON.Brakes,
				tires: carJSON.Tires,
				notes: carJSON.Other_Notes,
				id: id
			});
			// If there's a build thread link, add that too.
			if (carJSON.buildThread) vehicle.buildThread = carJSON.buildThread;
			await vehicle.save();
			if (carJSON.images) {
				for (let image of carJSON.images) {
					let [dbimage, created] = await Image.findOrCreate({ where: { id: image.imageID }});
					if (created) {
						dbimage.id = image.imageID;
						dbimage.title = image.imageTitle;
						dbimage.setVehicle(vehicle);
						await dbimage.save();
					}
				}
			}
			console.log("Saved vehicle",id);
		} else {
			console.log("Already got",id,", skipping");
		}
	}
	console.log("Vehicle fetching complete");
}
async function getImages(imageList) {
	// For each image
	for (const image in imageList) {
		// Extract it's ID
		const id = image;
		// Build a filename for it
		const fileName = Path.resolve(__dirname, "images", id + ".jpg");
		// And if that file doesn't exist
		console.log("Checking existence of file",fileName);
		if (!FS.existsSync(fileName)) {
			// Download the image.
			await pipeData("https://web.archive.org/web/" + imageList[image].timestamp + "/" + imageList[image].original, fileName);
		}
	}
}
async function pipeData(url, fileName) {
	// Create a write stream
	const writer = FS.createWriteStream(fileName);
	// Request the data from the server, as a stream
	console.log("Fetching image %s", url);
	const response = await Axios({
		url,
		method: "GET",
		responseType: "stream"
	});
	// Then pipe it into the write stream
	response.data.pipe(writer);
	// And when it's done, resolve this promise.
	return new Promise((resolve, reject) => {
		writer.on("finish", resolve);
		writer.on("error", reject);
	});
}