(function () {
    var width = 500;
    var height = 0;

    var streaming = false;

    var video = null;
    var canvas = null;
    var canvasSquares = null;
    var photo = null;
    var startbutton = null;
    var data = null;
    var ctx = null;

    //On window load, get the page elements, start the 
    //getUserMedia function and set attributes height.
    function startup() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        canvasSquares = document.getElementById("faceDetectedCanvas");
        photo = document.getElementById('photo');
        startbutton = document.getElementById('startbutton');
        ctx = canvasSquares.getContext("2d");

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(function (stream) {
                video.srcObject = stream;
                video.play();
            })
            .catch(function (err) {
                console.log("An error occurred: " + err);
            });

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);

                if (isNaN(height)) {
                    height = width / (4 / 3);
                }

                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                photo.setAttribute('width', width);
                photo.setAttribute('height', height);
                canvasSquares.setAttribute('width', width);
                canvasSquares.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        startbutton.addEventListener('click', function (ev) {
            takepicture();
            ev.preventDefault();
        }, false);

        clearphoto();
    }

    // While the user didn't click to capture a picture, show a grey placeholder
    function clearphoto() {
        var context = canvas.getContext('2d');
        context.fillStyle = "#717171";
        context.fillRect(0, 0, canvas.width, canvas.height);

        data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    // Capture a photo by fetching the current contents of the video
    // and drawing it into a canvas, then converting that to a PNG
    // format data URL. By drawing it on an offscreen canvas and then
    // drawing that to the screen, we can change its size and/or apply
    // other changes before drawing it.
    function takepicture() {
        var context = canvas.getContext('2d');
        if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            //clear the squares in the canvasSquares canvas
            ctx.clearRect(0, 0, canvasSquares.width, canvasSquares.height);
            ctx.beginPath();

            //This line saves the base64 version of the image on data
            data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
            sendDataToApi();
        } else {
            clearphoto();
        }
    }

    //This function get the data, that contains the base64 image and send it to the 
    //Google Vision API using AJAX
    function sendDataToApi() {
        var imageBase64 = data.replace('data:image/png;base64,', '');
        const Data = {
            "requests": [{
                "features": [{
                    "type": "FACE_DETECTION"
                }],
                "image": {
                    "content": imageBase64
                }
            }]
        }

        $.ajax({
            method: "POST",
            url: "https://vision.googleapis.com/v1/images:annotate?key=YourApiKeyHere",
            contentType: 'application/json',
            data: JSON.stringify(Data),
            processData: false,
            success: function (result) {
                countFaces(result);
            },
            error: function (error) {
                console.log(`Error ${error}`);
                alert("An error ocurred. Please refresh the page and try again!");
            }
        })
    }

    //This functions is called when there's a response from the API. 
    //It check if any faces were detected and if none are found, show an alert.
    function countFaces(result) {
        try {
            var faces = result.responses[0];
            drawFaces(faces);

        } catch (error) {
            alert("No faces in this picture!");
        }
    }

    //This function draw a square in the canvas placed on top of the image for each face found
    function drawFaces(faces) {
        ctx.strokeStyle = "#9400D3";
        ctx.lineWidth = 5;
        for (i = 0; i < faces.faceAnnotations.length; i++) {
            face = faces.faceAnnotations[i].boundingPoly.vertices;
            // Check if all 4 vertices are returned (we need 4 to draw a square :D )
            if (face[0].hasOwnProperty("x") && face[0].hasOwnProperty("y") &&
                face[1].hasOwnProperty("x") && face[1].hasOwnProperty("y") &&
                face[2].hasOwnProperty("x") && face[2].hasOwnProperty("y") &&
                face[3].hasOwnProperty("x") && face[3].hasOwnProperty("y")) {
                for (var a = 0; a < face.length; a++) {

                    if (a < 3) {
                        ctx.moveTo(face[a].x, face[a].y);
                        ctx.lineTo(face[a + 1].x, face[a + 1].y);
                        ctx.stroke();
                    } else {
                        ctx.moveTo(face[a].x, face[a].y);
                        ctx.lineTo(face[0].x, face[0].y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    // Set up our event listener to run the startup process
    // once loading is complete.
    window.addEventListener('load', startup, false);
})();