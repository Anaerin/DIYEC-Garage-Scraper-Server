import express from "express";
import path from "path";
import { Vehicle, Image } from "../db/index.js";
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));
app.use("/css", express.static("css"));
app.use("/images", express.static("images"));
const server = app.listen(8000, () => {
	const host = server.address().address;
	const port = server.address().port;
	console.log("Server listening at http://%s:%s", host, port);
});

app.get("/", async (req, res) => {
	const vehCount = await Vehicle.count();
	let pageCount = Math.trunc(vehCount/20);
	if ((vehCount/20) != Math.trunc(vehCount/20)) pageCount++;
	const vehs = await Vehicle.findAndCountAll({ limit: 20, include: [ Image ]});
	res.render("vehicleList", {
		vehicles: vehs,
		page: 1,
		pageCount: pageCount
	});

});
app.get("/:page(\\d+)", async (req, res) => {
	const vehCount = await Vehicle.count();
	let pageCount = Math.trunc(vehCount/20);
	if ((vehCount/20) != Math.trunc(vehCount/20)) pageCount++;
	const vehs = await Vehicle.findAll({ limit: 20, offset: req.params.page*20, include: [ Image ] });
	res.render("vehicleList", {
		vehicles: vehs,
		page: req.params.page,
		pageCount: pageCount
	});
});
app.get("/vehicle/:vehicle(\\d+)", async (req, res) => {
	const vehCount = await Vehicle.count();
	let pageCount = Math.trunc(vehCount/20);
	if ((vehCount/20) != Math.trunc(vehCount/20)) pageCount++;
	const veh = await Vehicle.findByPk(req.params.vehicle, { include: [ Image ] });
	res.render("vehicle", {
		vehicle: veh,
		page: 0,
		pageCount: pageCount
	});
});

export default server;