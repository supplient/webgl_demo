function start(gl, canvas, program) {

    // 3. Calculate vertex data
    var verts = [
        vec2( -0.5, -0.5 ),
        vec2(  0,  0.5 ),
        vec2(  0.5, -0.5 )
    ];

    var flag = true;
    for(var i=0; i<10; i++) {
        var start_vert = verts.pop();
        var new_verts = [start_vert];
        var last_vert = new_verts[0];

        function make(last_vert, now_vert) {
            /*
                           z
                           .
                          / \
                         /   \
                        /     \ 
                       /       \
            .---------.         .---------.
            last_vert x         y         now_vert
            */
            var delta_vert = subtract(now_vert, last_vert);

            var x = add(last_vert, scale(1/3, delta_vert));
            var y = add(last_vert, scale(2/3, delta_vert));

            var z = scale(0.5, add(x, y));
            var delta = subtract(y, x);
            // 这里需要判定凸性，我不会，所以取了一边，但不清楚效果
            var w = vec2(-delta[1], delta[0]);
            if(flag)
                var w = vec2(delta[1], -delta[0]);
            z = add(z, scale(Math.sqrt(3)/2, w));

            new_verts.push(x);
            new_verts.push(z);
            new_verts.push(y);
            new_verts.push(now_vert);
        }

        while(verts.length > 0) {
            var now_vert = verts.pop();
            make(last_vert, now_vert);
            last_vert = now_vert;
        }
        make(last_vert, start_vert);

        verts = new_verts;
        
        if(flag)
            flag = false;
        else
            flag = true;
    }

    // 4. Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // 5. Select shaders
    gl.useProgram( program );

    // 6. Load vertex data into the GPU
    var vertex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertex_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);

    // 7. Associate out shader variables with our data buffer
    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );

    // 8. Do Render work
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.POINTS, 0, verts.length );
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
        "2_1.vert", "2_1.frag", 
        function(vshadersrc, fshadersrc) {
            program = createProgram(gl, vshadersrc, fshadersrc);
            start(gl, canvas, program)
        }
    );
};
