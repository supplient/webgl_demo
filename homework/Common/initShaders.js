/**
 * Create the linked program object
 * @param vshaderfile a vertex shader file's name
 * @param fshaderfile a fragment shader file's name
 * @param callback a function which canbe called as 'callback(vshadersrc, fshadersrc)', will be called after the shaders' sources are loaded.
 * @return no return
 */
function loadShaderSource(vshaderfile, fshaderfile, callback) {
    var VSHADER_SOURCE = null;
    var FSHADER_SOURCE = null;

    // The shader is loaded from file
    function onReadShader(fileString, type) {
        if (type == 'v') { // Vertex shader
            VSHADER_SOURCE = fileString;
        } else 
        if (type == 'f') { // Fragment shader
            FSHADER_SOURCE = fileString;
        }
        // When both are available, call start().
        if (VSHADER_SOURCE && FSHADER_SOURCE) 
            callback(VSHADER_SOURCE, FSHADER_SOURCE);
    }

    // Read shader from file
    function readShaderFile(fileName, type) {
        var request = new XMLHttpRequest();

        request.onreadystatechange = function() {
            if (request.readyState === 4 && request.status !== 404) { 
	            onReadShader(request.responseText, type); 
            }
        }
        request.open('GET', fileName, true); // Create a request to acquire the file
        request.send();                      // Send the request
    }

    readShaderFile(vshaderfile, 'v')
    readShaderFile(fshaderfile, 'f')
}


/**
 * Create the linked program object
 * @param gl GL context
 * @param vshader a vertex shader program (string)
 * @param fshader a fragment shader program (string)
 * @return created program object, or null if the creation has failed
 */
function createProgram(gl, vshader, fshader) {
  // Create shader object
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vshader);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fshader);
  if (!vertexShader || !fragmentShader) {
    return null;
  }
  
  // Create a program object
  var program = gl.createProgram();
  if (!program) {
    return null;
  }
  
  // Attach the shader objects
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  
  // Link the program object
  gl.linkProgram(program);
  
  // Check the result of linking
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    var error = gl.getProgramInfoLog(program);
    console.log('Failed to link program: ' + error);
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return null;
  }
  return program;
}
  
/**
 * Create a shader object
 * @param gl GL context
 * @param type the type of the shader object to be created
 * @param source shader program (string)
 * @return created shader object, or null if the creation has failed.
 */
function createShader(gl, type, source) {
  // Create shader object
  var shader = gl.createShader(type);
  if (shader == null) {
    console.log('unable to create shader');
    return null;
  }
  
  // Set the shader program
  gl.shaderSource(shader, source);
  
  // Compile the shader
  gl.compileShader(shader);
  
  // Check the result of compilation
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    var error = gl.getShaderInfoLog(shader);
    console.log('Failed to compile shader: ' + error);
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}