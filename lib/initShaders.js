/**
 * Load files asynchronously.
 * @param filename_list a list of files' names to load
 * @param callback a function which canbe called as 'callback(src_list)', will be called after the files' sources are loaded.
 * @return no return
 */
function loadFileSource(filename_list, callback) {
    var src_list = [];
    var load_count = 0;
    var file_num = filename_list.length;

    // Called when file is loaded
    function onReadFile(fileString, index) {
      src_list[index] = fileString;
      load_count++;
      // When all files are available, call callback().
      if(load_count >= file_num)
        callback(src_list);
    }

    // Read file by http request
    function readFile(fileName, index) {
        var request = new XMLHttpRequest();

        request.onreadystatechange = function() {
            if (request.readyState === 4 && request.status !== 404) { 
	            onReadFile(request.responseText, index); 
            }
        }
        request.open('GET', fileName, true); // Create a request to acquire the file
        request.send();                      // Send the request
    }

    for(var i=0; i<filename_list.length; i++)
      readFile(filename_list[i], i);
}


/**
 * Load shaders' sources
 * @param vshaderfile a vertex shader file's name
 * @param fshaderfile a fragment shader file's name
 * @param callback a function which canbe called as 'callback(vshadersrc, fshadersrc)', will be called after the shaders' sources are loaded.
 * @return no return
 */
function loadShaderSource(vshaderfile, fshaderfile, callback) {
  loadFileSource(
    [vshaderfile, fshaderfile],
    function(src_list) {
      callback(src_list[0], src_list[1]);
    }
  );
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