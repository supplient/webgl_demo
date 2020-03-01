var points;

var NumPoints = 500000;

function start(gl, canvas, program) {

    // 3. Calculate vertex data
    // First, initialize the corners of our gasket with three points.
    var vertices = [
        vec2( -1, -1 ),
        vec2(  0,  1 ),
        vec2(  1, -1 )
    ];

    // Next, generate the rest of the points, by first finding a random point
    //  within our gasket boundary.  We use Barycentric coordinates
    //  (simply the weighted average of the corners) to find the point

    var coeffs = vec3( Math.random(), Math.random(), Math.random() );
    coeffs = normalize( coeffs );

    var a = scale( coeffs[0], vertices[0] );
    var b = scale( coeffs[1], vertices[1] );
    var c = scale( coeffs[2], vertices[2] );

    var p = add( a, add(b, c) );

    // Add our randomly chosen point into our array of points
    points = [ p ];

    for ( var i = 0; points.length < NumPoints; ++i ) {
        var j = Math.floor(Math.random() * 3);

        p = add( points[i], vertices[j] );
        p = scale( 0.5, p );

        // var dx = (Math.random()*2-1) * 0.1
        // var dy = (Math.random()*2-1) * 0.1
        // p[0] += dx
        // p[1] += dy

        points.push( p );
    }

    // 4. Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // 5. Select shaders
    gl.useProgram( program );

    // 6. Load vertex data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // 7. Associate out shader variables with our data buffer
    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );

    // 8. Do Render work
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.POINTS, 0, points.length );
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
