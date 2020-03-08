function start(gl, canvas, program) {

    // 3. Calculate vertex data
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

    // 3.5. Calculate Transform Matrix
    var view_mat = mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );

    // 4. Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    // 5. Select shaders
    gl.useProgram( program );

    // 6. Load vertex data into the GPU
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

    // Assign uniform varaibles
    var u_mvp = gl.getUniformLocation(program, "u_mvp");
    var updateMVP = function() {
        var mvp_mat = view_mat;
        gl.uniformMatrix4fv(u_mvp, false, flatten(mvp_mat));
    };
    updateMVP();

    // 7. Regist Render work
    var render = function(){
        gl.clear( gl.COLOR_BUFFER_BIT );
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);

    // 8. Regist Events
    var vp = {
        DEGREE_PER_DIST: 0.1,
        CENTER_VEC: vec4(0, 0, 1, 0),
        old_view_mat: null,
        start_pos: null,
        is_dragging: false,
    };// view params, just a namespace

    canvas.addEventListener("mousedown", function(ev){
        vp.old_view_mat = view_mat;
        vp.start_pos = vec2(ev.offsetX, ev.offsetY);
        vp.is_dragging = true;
    });

    canvas.addEventListener("mousemove", function(ev){
        if(!vp.is_dragging)
            return;
        var now_pos = vec2(ev.offsetX, ev.offsetY);
        // Note, this delta_vec is in canva's axis system, instead of webgl's axis system
        // But since we only need its direction, that doesn't matter
        var delta_vec = subtract(now_pos, vp.start_pos);
        delta_vec = vec4(delta_vec[0], -delta_vec[1], 0, 0);
        var dist = length(delta_vec);
        var degree = dist * vp.DEGREE_PER_DIST;
        var axis_vec = cross(vp.CENTER_VEC, delta_vec);

        var added_view_mat = rotate(-degree, axis_vec);
        view_mat = mult(added_view_mat, vp.old_view_mat);
        updateMVP();
    });

    canvas.addEventListener("mouseup", function(ev){
        vp.is_dragging = false;
    });

    canvas.addEventListener("mouseleave", function(ev){
        vp.is_dragging = false;
    });
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
