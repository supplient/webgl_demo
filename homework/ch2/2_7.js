function start(gl, canvas, program) {

    // 3. Calculate vertex data
    const N = 30;
    const M = N;

    // Support functions
    function calKey(x, y) {
        return x.toString() + "_" + y.toString();
    }
    function calAdajAreas(line) {
        var cord = line[0];
        var toward = line[1];

        var area1 = calKey(cord[0], cord[1]);
        var area2 = null;
        if(toward[0] == 0) 
            area2 = calKey(cord[0]-1, cord[1]);
        else
            area2 = calKey(cord[0], cord[1]-1);
        return [area1, area2];
    }

    // Build areas
    var areas = {};
    var area_count = 0;
    for(var x=0; x<N; x++) {
        for(var y=0; y<M; y++) {
            var key = calKey(x, y);
            areas[key] = [area_count, [key]];
            area_count++;
        }
    }

    // Build lines
    var lines = [];
    var up_forward = [0, 1];
    var right_forward = [1, 0];
    for(var x=0; x<N; x++) {
        for(var y=0; y<M; y++) {
            var cord = [x, y];
            // if-statements are for removing bounds
            if(y!=0)
                lines.push([cord, right_forward]);
            if(x!=0)
                lines.push([cord, up_forward]);
        }
    }

    // Randomly Remove lines until there is only one area
    while(area_count > 1) {
        // Randomly select line which is between two areas
        while(true) {
            var rand_i = Math.floor(Math.random()*lines.length);
            var adaj_areas = calAdajAreas(lines[rand_i]);
            var area1 = areas[adaj_areas[0]];
            var area2 = areas[adaj_areas[1]];
            if(area1[0] == area2[0])
                continue; // The line is in one area
            
            // Remove the line
            lines[rand_i] = lines[lines.length-1];
            lines.pop();

            // Merge two areas
            for(var i=0; i<area2[1].length; i++) {
                var area_key = area2[1][i];
                areas[area_key] = area1;
                area1[1].push(area_key);
            }
            area_count--;
            break;
        }
    }

    // Add bounds
    var bound_lines = []
    for(var x=0; x<N; x++) {
        // Add bound along x axis
        bound_lines.push([
            [x, 0],
            right_forward
        ]);
        bound_lines.push([
            [x, N],
            right_forward
        ]);
    }
    for(var y=0; y<M; y++) {
        // Add bound along x axis
        bound_lines.push([
            [0, y],
            up_forward
        ]);
        bound_lines.push([
            [M, y],
            up_forward
        ]);
    }

    // Remove two random bound
    for(var i=0; i<2; i++) {
        var rand_i = Math.floor(Math.random()*bound_lines.length);
        bound_lines[rand_i] = bound_lines[bound_lines.length -1];
        bound_lines.pop();
    }

    // Merge bound_lines & lines
    lines = lines.concat(bound_lines);

    // Generate vertices
    var verts = [];

    for(var i; i<lines.length; i++) {
        var line = lines[i];
        var start_cord = line[0];
        var forward_cord = line[1];
        var start = vec2(start_cord[0], start_cord[1]);
        var forward = vec2(forward_cord[0], forward_cord[1]);
        var end = add(start, forward);

        // scale
        function scale_xy(v) {
            return vec2(v[0]/N * 2, v[1]/M * 2);
        }
        start = scale_xy(start);
        end = scale_xy(end);

        // transform
        var offset = vec2(-1, -1);
        start = add(start, offset);
        end = add(end, offset);

        verts.push(start);
        verts.push(end);
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
    gl.drawArrays( gl.LINES, 0, verts.length );
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
