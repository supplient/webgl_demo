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
    var view_rotate_mat = mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
    var view_translate_mat = mat4(
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
        var mvp_mat = mult(view_translate_mat, view_rotate_mat);
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

    // View
    // Input: canvas, view_mat, updateMVP
    var vp = {// view namespace, just a namespace
        DEGREE_PER_DIST: 0.1,
        CENTER_VEC: vec4(0, 0, 1, 0),

        INERTIA_DEGREE_FACTOR: 50,
        INERTIA_FADE_FACTOR: 0.924,
        INERTIA_THETA: 0.1,
        INERTIA_LAST_NUM: 4,
        INERTIA_MAX_DETLA_TIME: 300,

        WHEEL_FACTOR: 1/125/10,

        old_view_mat: null,
        start_pos: null,
        is_dragging: false,

        last_pos: [],
        last_time: [],
        inertia_axis: null,
        inertia_degree: null,

        z_delta: 0,


        pushLastPosAndTime: function(now_pos) {
            this.last_pos.push(now_pos);
            this.last_time.push(new Date().getTime());
            if(this.last_pos.length > this.INERTIA_LAST_NUM) {
                this.last_pos = this.last_pos.slice(0, 1);
                this.last_time = this.last_time.slice(0, 1);
            }
        },
        calDegreeAndAxis: function(now_pos, old_pos) {
            var delta_vec = subtract(now_pos, old_pos);
            delta_vec = vec4(delta_vec[0], -delta_vec[1], 0, 0);
            var dist = length(delta_vec);
            var degree = -dist * vp.DEGREE_PER_DIST;
            var axis_vec = cross(vp.CENTER_VEC, delta_vec);
            return [degree, axis_vec];
        },
        inertiaRotateFrame: function() {
            if(!vp.inertia_degree)
                return;
            var added_view_mat = rotate(vp.inertia_degree, vp.inertia_axis);
            view_rotate_mat = mult(added_view_mat, view_rotate_mat);
            updateMVP();

            vp.inertia_degree *= vp.INERTIA_FADE_FACTOR;
            if(Math.abs(vp.inertia_degree) < vp.INERTIA_THETA) {
                vp.inertia_axis = null;
                vp.inertia_degree = null;
            }
            else
                requestAnimationFrame(vp.inertiaRotateFrame);
        },


        onDown: function(now_pos) {
            // clear inertia
            vp.inertia_axis = null;
            vp.inertia_degree = null;
            vp.last_pos = [];
            vp.last_time = [];

            vp.old_view_mat = view_rotate_mat;
            vp.start_pos = now_pos;
            vp.pushLastPosAndTime(vp.start_pos);
            vp.is_dragging = true;
        },
        onMove: function(now_pos) {
            if(!vp.is_dragging)
                return;
            vp.pushLastPosAndTime(now_pos);

            var tmp = vp.calDegreeAndAxis(now_pos, vp.start_pos);
            var degree = tmp[0];
            var axis_vec = tmp[1];

            var added_view_mat = rotate(degree, axis_vec);
            view_rotate_mat = mult(added_view_mat, vp.old_view_mat);
            updateMVP();
        },
        onUp: function(now_pos) {
            if(!vp.is_dragging)
                return;
            vp.is_dragging = false;

            vp.pushLastPosAndTime(now_pos);

            // cal delta time
            var first_time = vp.last_time[0];
            var end_time = vp.last_time.pop();
            vp.last_time = [];
            var delta_time = end_time - first_time;

            if(delta_time == 0 || delta_time > vp.INERTIA_MAX_DETLA_TIME) {
                vp.last_pos = [];
                return;
            }

            // cal delta degree and rotate axis
            var first_pos = vp.last_pos[0];
            var end_pos = vp.last_pos.pop();
            vp.last_pos = [];
            var tmp = vp.calDegreeAndAxis(end_pos, first_pos);
            var degree = tmp[0];
            vp.inertia_axis = tmp[1];

            // cal inertia degree
            vp.inertia_degree = degree / delta_time * vp.INERTIA_DEGREE_FACTOR;

            requestAnimationFrame(vp.inertiaRotateFrame);
        },
        onCancel: function() {
            vp.is_dragging = false;
        },
        onScale: function(delta) {
            // This has no effect now, we need perspective projection matrix!
            vp.z_delta += delta;

            view_translate_mat = translate(0, 0, vp.z_delta);
            updateMVP();
        }
    };

    canvas.addEventListener("mousedown", function(ev){
        vp.onDown(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mousemove", function(ev){
        vp.onMove(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mouseup", function(ev){
        vp.onUp(vec2(ev.clientX, ev.clientY));
    });

    canvas.addEventListener("mouseleave", function(ev){
        vp.onCancel();
    });

    canvas.addEventListener("wheel", function(ev){
        vp.onScale(ev.deltaY * vp.WHEEL_FACTOR);
    });

    canvas.addEventListener("touchstart", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        vp.onDown(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchmove", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        vp.onMove(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchend", function(ev){
        if(ev.changedTouches.length < 1)
            return;
        var touch = ev.touches[0];
        vp.onUp(vec2(touch.clientX, touch.clientY));
    });

    canvas.addEventListener("touchcancel", function(ev){
        vp.onCancel();
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
