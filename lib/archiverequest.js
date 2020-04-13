import axios from "axios";
export default class ArchiveRequest {
	// Some handy regular expressions, to parse data out of the HTML pages
	parserDetailsRegExp = /<td valign="top" nowrap><b>(?<Type>[^<]*):<\/b><\/td><td>&nbsp;<\/td><td>(?<Value>[^<]*)<\/td>/gs;
	parserBuildThreadRegExp = /<a href="https:\/\/web.archive.org\/web\/\d+\/(?<Thread>[^"]+)">Main Build Thread<\/a>/s;
	parserImageRegExp = /<a href="[^"]+\/get_image\/(?<Image_ID>\d+)".*?title="(?<Image_Title>[^"]*)">/gs;
	
	// URLs for the wayback machine's CDX query engine.
	carListURL = "http://web.archive.org/cdx/search/cdx?url=www.diyelectriccar.com/garage/cars/&matchType=prefix&output=json&filter=statuscode:200&fastLatest=true&filter=original:.*\\\/\\d{1,}";
	imageListURL = "http://web.archive.org/cdx/search/cdx?url=www.diyelectriccar.com/garage/photos/get_image/&matchType=prefix&output=json&filter=statuscode:200&fastLatest=true&filter=original:.*\\\/\\d{1,}";
	imageThumbnailURL = "http://web.archive.org/cdx/search/cdx?url=www.diyelectriccar.com/garage/photos/get_thumbnail/&matchType=prefix&output=json&filter=statuscode:200&fastLatest=true&filter=original:.*\\\/\\d{1,}";
	async getCarList() {
		console.log("Getting car list", this.carListURL);
		try {
			const carList = await axios.get(this.carListURL);
			return carList.data;
		} catch (e) {
			console.error(e);
		}
	}
	async getImageList() {
		console.log("Getting image list", this.imageListURL);
		try {
			const imageList = await axios.get(this.imageListURL);
			return imageList.data;
		} catch (e) {
			console.error(e);
		}
	}
	async getThumbnailList() {
		console.log("Getting thumbnail list", this.imageThumbnailURL);
		try {
			const imageList = await axios.get(this.imageThumbnailURL);
			return imageList.data;
		} catch (e) {
			console.error(e);
		}
	}
	parseList(list) {
		// The capture list is JSON formatted, ish - It's an array where the first entry is the positions of the fields.
		let jsonList = list;
		// If we didn't get a JSON object, make one.
		if (typeof jsonList === "string" || jsonList instanceof String) jsonList = JSON.stringify(jsonList);
		// First item in the array is the key array.
		let key = jsonList[0];
		let output = [];
		// Note: starting from 1, so we skip over the key array.
		for (let i=1;i<jsonList.length;i++) {
			let out = {};
			for (let k=0;k<key.length;k++) {
				out[key[k]] = jsonList[i][k];
				// The "Original" field (the scraped-from URL) sometimes has the port number in it. We don't need that, so strip it out.
				if (key[k] == "original") {
					out.original = out.original.replace(":80","");
				}
			}
			// If we're not at the first entry, and the URL for this one is the same as the last one
			if (output.length >0 && output[output.length-1].original === out.original) {
				// Set the last value in the output array to this value, overwriting it, because this entry's newer.
				output[output.length-1] = out;
			} else {
				// This is a new value, that doesn't match the URL of the last one. So push it into the end of the output.
				output.push(out);
			}
		}
		return output;
	}
	getCarHTML(url, dateStamp) {
		return axios.get("https://web.archive.org/web/" + dateStamp + "/" + url, {json: false});
	}
	parseCarHTML(rawHTML) {
		const data = rawHTML.data.toString();
		let results = {};
		// Use the details Regular Expression to match each of the data values.
		const codeMatch = data.matchAll(this.parserDetailsRegExp);
		for (const found of codeMatch) {
			// Then throw them into the results object with some massaging to make them legal JSON keys
			results[found.groups.Type.replace(/\s/g,"_").replace("%","pct")] = found.groups.Value;
		}
		// Try and extract the build thread link - This might not be present.
		let threadMatch = data.match(this.parserBuildThreadRegExp);
		if (threadMatch) {
			results.buildThread = threadMatch.groups.Thread;
		}
		let images = [];
		// Try and find images
		const imageMatch = data.matchAll(this.parserImageRegExp);
		for (const found of imageMatch) {
			images.push({imageID: found.groups.Image_ID, imageTitle: found.groups.Image_Title});
		}
		// If we found any images, add those to the results object too.
		if (images.length > 0) {
			results.images = images;
		}
		return results;
	}
}