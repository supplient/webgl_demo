// Vertex shader program
var VSHADER_SOURCE = null;
// Fragment shader program
var FSHADER_SOURCE = null;

// Read shader from file
function readShaderFile(gl, fileName, shader) {
  var request = new XMLHttpRequest();

  request.onreadystatechange = function() {
    if (request.readyState === 4 && request.status !== 404) { 
	onReadShader(gl, request.responseText, shader); 
    }
  }
  request.open('GET', fileName, true); // Create a request to acquire the file
  request.send();                      // Send the request
}

// The shader is loaded from file
function onReadShader(gl, fileString, shader) {
  if (shader == 'v') { // Vertex shader
    VSHADER_SOURCE = fileString;
  } else 
  if (shader == 'f') { // Fragment shader
    FSHADER_SOURCE = fileString;
  }
  // When both are available, call start().
  if (VSHADER_SOURCE && FSHADER_SOURCE) start(gl);
}

function main() {
    var canvas = document.getElementById("webgl");

    var gl = getWebGLContext(canvas);
    if(!gl) {
        console.log("Failed to get the rendering context.");
        return;
    }

      // Read shader from file
    readShaderFile(gl, 'shader.vert', 'v');
    readShaderFile(gl, 'shader.frag', 'f');
}


function start(gl) {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the rectangle
  gl.drawArrays(gl.POINTS, 0, 1);
}