function start(gl, canvas, program) {

    // 3. Calculate vertex data
    var verts = [
        vec2(-0.5, -0.5),
        vec2(0.5, -0.5),
        vec2(0, Math.sqrt(3)/2 - 0.5)
    ];
    var colors = [
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0)
    ];


    // 4. Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // 5. Select shaders
    gl.useProgram( program );

    // 6. Load vertex data into the GPU
    //  && Associate out shader variables with our data buffer
    var a_pos = gl.getAttribLocation( program, "a_pos" );
    var a_color = gl.getAttribLocation(program, "a_color");

    var vertex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertex_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_pos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_pos );

    var color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_color, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_color );

    // 7. Do Render work
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, verts.length );
}

function main() {
    // 1. Get WebGL context
    var canvas = document.getElementById( "webgl" );

    var gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) {
        console.log("Failed to get the rendering context.");
        return;
    }

    // 2. Load & Init shaders
    loadShaderSource(
        "shader.vert", "shader.frag", 
        function(vshadersrc, fshadersrc) {
            program = createProgram(gl, vshadersrc, fshadersrc);
            start(gl, canvas, program)
        }
    );
};
