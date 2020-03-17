function main() {
    // This function is called when html page is loaded

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

function start(gl, canvas, program) {
    // This function is called after shaders are loaded

    // 1. Calculate vertex data
    var verts = [
        vec3(-0.5, -0.5, -0.5),// 0
        vec3(0.5, -0.5, -0.5),// 1
        vec3(-0.5, 0.5, -0.5),// 2
        vec3(-0.5, -0.5, 0.5),// 3
        vec3(-0.5, 0.5, 0.5),// 4
        vec3(0.5, -0.5, 0.5),// 5
        vec3(0.5, 0.5, -0.5),// 6
        vec3(0.5, 0.5, 0.5),// 7
    ];
    var indices = [
        0, 3, 2, // left
        2, 3, 4,
        4, 3, 5, // front
        4, 5, 7,
        4, 7, 6, // up
        4, 6, 2,
        2, 6, 0, // back
        0, 6, 1,
        0, 1, 3, // down
        3, 1, 5,
        5, 1, 7, // right
        7, 1, 6
    ];
    var colors = [
        vec3(0.0, 0.0, 0.0),// 0
        vec3(1.0, 0.0, 0.0),// 1
        vec3(0.0, 1.0, 0.0),// 2
        vec3(0.0, 0.0, 1.0),// 3
        vec3(0.0, 1.0, 1.0),// 4
        vec3(1.0, 0.0, 1.0),// 5
        vec3(1.0, 1.0, 0.0),// 6
        vec3(1.0, 1.0, 1.0),// 7
    ];

    // 2. Calculate Transform Matrix

    // 3. Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    // 4. Select shaders
    gl.useProgram( program );

    // 5. Load vertex data into the GPU
    //  && Associate out shader variables with our data buffer
    var a_pos = gl.getAttribLocation( program, "a_pos" );
    var a_color = gl.getAttribLocation(program, "a_color");

    var vertex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertex_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_pos, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_pos );

    var color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_color, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_color );

    var indice_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indice_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // 6. Assign MVP mat && Regist view
    var u_mvp = gl.getUniformLocation(program, "u_mvp");
    var onViewMatChange = function(view_mat) {
        var mvp_mat = view_mat;
        gl.uniformMatrix4fv(u_mvp, false, flatten(mvp_mat));
    };
    registView(canvas, onViewMatChange);

    // 7. Assign uniform varaibles

    // 8. Regist Render work
    var render = function(){
        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}