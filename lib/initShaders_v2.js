/**
 * Load files asynchronously.
 * @param filename_list a list of files' names to load
 * @return a Promise. Its then will receive the list of file sources.
 */
function loadFileSource(filename_list) {
    var file_loaders = [];

    for(var i=0; i<filename_list.length; i++){
        var filename = filename_list[i];

        file_loaders.push(new Promise(function(resolve, reject){
            var request = new XMLHttpRequest();

            request.onreadystatechange = function() {
                if (request.readyState === 4 && request.status !== 404)
	                resolve(request.responseText); 
            }
            request.open('GET', filename, true); // Create a request to acquire the file
            request.send();                      // Send the request
        }));
    }

    return Promise.all(file_loaders);
}


/**
 * Load shaders' sources
 * @param gl WebGL context
 * @param vshaderfile a vertex shader file's name
 * @param fshaderfile a fragment shader file's name
 * @return a Promise. Its then will receive a program.
 */
async function loadProgram(gl, vshaderfile, fshaderfile) {
    const [vsrc, fsrc] = await loadFileSource([vshaderfile, fshaderfile]);
    var program = createProgram(gl, vsrc, fsrc);
    return program;
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