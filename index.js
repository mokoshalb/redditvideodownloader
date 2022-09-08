const express = require('express')
const cors = require('cors')
const app = express()
const fs = require('fs');
const request = require('request');
const ffmpeg = require("fluent-ffmpeg");
const proc = new ffmpeg();;
const fetch = require("node-fetch");
const _res = [1080, 720, 480, 360, 240, 140, 120, '2_4_M', '1_2_M'];

app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(cors())
var oneDownload = false;

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/:id', function(req, res){
	if(!req.params.id){
		return res.status(400).send({error: "Media ID missing"});
	}
	let mediaId = req.params.id;
	console.log('Hold on, Fetching the Best Quality');
	_res.forEach(res => {
    fetch(`https://v.redd.it/${mediaId}/DASH_${res}.mp4`)
      .then(response => {
        if(response.status === 200 && !oneDownload) {
          oneDownload = true;
          console.log('Downloading With : ' + res + ' Please Wait ...');
		  let filename =`temp/${mediaId}.mp4`
		  proc.addInput(`https://v.redd.it/${mediaId}/DASH_${res}`)
			.output(filename)
			.on("error", err => {
			  console.log("Error: " + err);
			})
			.on("end", () => {
				console.log("Download Completed");
				const stream = fs.createReadStream(filename);
				const formData = {'files[]': stream,};
				request.post({url:'https://pomf.lain.la/upload.php', formData: formData}, function optionalCallback(err, httpResponse, body) {
					if(err){
						return console.error('Upload Failed:', err);
					}
					let bodyJSON = JSON.parse(body);
					let mp4 = bodyJSON.files[0].url
					let size = bodyJSON.files[0].size
					if(size > 0){
						console.log(mp4)
						res.send(mp4);
					}
					fs.unlink(filename, function (err) {
						if (err) throw err;
						console.log('File deleted!');
					});
				});
			});
		  fetch(`https://v.redd.it/${mediaId}/DASH_audio.mp4`)
			.then(resp => {
			  if(resp.status === 200){
				console.log('Founded audio track...')
				proc.addInput(`https://v.redd.it/${mediaId}/DASH_audio.mp4`);
			  } else {
				console.log('No audio track...');
			  }
			  console.log('Downloading and converting...');
			  proc.run();
			});
        }
      });
	});
});

app.listen(process.env.PORT ||3000, () => console.log('server is running'))
