var myData = {};

function hasClientRectsFp() {
  return !!myData['clientRectsFp'];
}

function set_result(id, content) {
	myData[id] = content;
	if (id == 'nt_vc_output') {
		content = window.JSON.stringify(content, undefined, 2);
	}
	document.getElementById(id).innerHTML = content;
}

function set_message(msg) {
	document.getElementById('message').innerHTML = msg;
}

var fingerprints = 0;
var fingerprintsData = {};

function set_fingerprint_data(id, data) {
	if (data.length) {
	        fingerprints++;
		fingerprintsData[id] = data;

		var sha1 = CryptoJS.algo.SHA1.create();
		sha1.update(data);

		var hash = sha1.finalize();
		var fp = hash.toString(CryptoJS.enc.Hex);

		set_result(id, fp);
	} else {
		// create the key alone
		myData[id] = '';
	}

	// update the counter
	document.getElementById('counter').innerText = fingerprints.toString();
}

// called by the last audio test
function set_final_message() {
	// set generation timestamp
	myData["generatedOn"] = Date.now();

	var fp = '';
	if (fingerprints != 0) {
		// calculate the final fingerprint and identicon
		var sha1 = CryptoJS.algo.SHA1.create();
		for(var key in fingerprintsData) {
			sha1.update(fingerprintsData[key]);
		}

		var hash = sha1.finalize();
		fp = hash.toString(CryptoJS.enc.Hex);

		var identiconDataURI = new Identicon(fp, 48).toString();
		var ident = document.getElementById('identicon');
		ident.style.border = '1px solid navy';
		ident.src = "data:image/svg+xml;base64," + identiconDataURI;

		document.getElementById('cumulativeFp').innerText = fp;
		fingerprintData = null;
	}
	myData["cumulativeFp"] = fp;

	var dlBtn = document.getElementById('downloadButton');
	// make link visible
	dlBtn.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(myData)));
	dlBtn.setAttribute('download', 'fingerprints.json');
	dlBtn.style.visibility = 'visible';

	set_message('All readings complete');
}

var totalTests = 12 + 3;

function incProgress(testName) {
	console.log(testName, 'completed');
	document.getElementById('progress').value += 100/totalTests;
}

function ACTION() {
	document.getElementById('startButton').disabled = true;
	set_message('Audio test results should appear below in about 1 second.');
	// first run the audio context fingerprinting
	// a gesture is required since v70
	run_nt_vc_fp();
	incProgress('run_nt_vc_fp');

	// There may be weird interference effects if the
	// prints are run sequentially with no delay, hence
	// the interleaving.
	setTimeout(function() {
		run_pxi_fp();
		incProgress('run_pxi_fp');

		setTimeout(function() {
				run_cc_fp();
				incProgress('run_cc_fp');

				setTimeout(function() {
					run_hybrid_fp();
					incProgress('run_hybrid_fp');

					set_final_message();
				}, 100);
			}, 200);
	}, 250);

	set_result('timezone1', window.Intl.DateTimeFormat().resolvedOptions().timeZone);
	set_result('timezone2', (new Date()).toLocaleString('en-us',{timeZoneName:'long'}));

	set_result('navigatorPlatform', navigator.platform);
	set_result('userAgent', navigator.userAgent);
	incProgress('navigator/ua');

	var plugins = [];
	for (plugin of navigator.plugins) {
		plugins.push(plugin.name);
	}
	set_result('plugins', plugins);
	incProgress('plugins');

	// don't use onload to avoid calling it multiple times
	document.getElementById('rects-iframe').contentWindow.getRects();

	webGLBaseData();
	incProgress('webGL');
	webGLDebugData();
	incProgress('webGLDebug');

	var canvasDataURI = getCanvasDataURI();
	incProgress('canvas_data_uri');
	if (canvasDataURI) {
		if (canvasDataURI != "data:,") {
			var img = document.getElementById('canvasImg');
			img.src = canvasDataURI;
			img.style.border = '2px solid navy';

			set_fingerprint_data('canvasFpHash', canvasDataURI);
		} else {
			set_fingerprint_data('canvasFpHash', '');
		}
	} else {
		set_fingerprint_data('canvasFpHash', '');
	}
	incProgress('canvas_hash');

	var webGLImageData = createWebGLImageAndReturnData();
	if (webGLImageData == null) {
		set_fingerprint_data('webGLFpHash', '');
	} else {
		set_fingerprint_data('webGLFpHash', JSON.stringify(webGLImageData));
        }
        incProgress('webGL_hash');

	// start reading sensor data
	detectSensors();
}
