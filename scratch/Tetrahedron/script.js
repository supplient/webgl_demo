

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

/**
 * 由四面体生成球算法：
 * 
 * 计算每条边的中点，称其为“新顶点”，称这些边的顶点为“旧顶点”
 * 遍历每个旧顶点，将每个旧顶点连接的三条边的中点找出来，这些中点构成一个新面
 * 遍历每个旧面，将每个旧面的三条边的中点找出来，这些中点也构成一个新面
 * 上述两步构成的新面构成新的多面体
 * 
 * 逆时针判定：设一个面由P1,P2,P3构成
 *      选择P1，计算P2-P1与P3-P1的叉积Q，再计算Q与P1的点积，
 *      若点积大于0，则P1P2P3为逆时针顺序，否则P1P3P2为逆时针顺序
 * 
 * 需要哪些操作：
 * 遍历边
 * 由边获知其连接的顶点
 * 由顶点获知连接其的边
 * 遍历面
 * 由面获知构成其的边
 */

function genTetrahedron() {
    var r = 1;

    var verts = [
        vec3(0, 1, 0),
        vec3(0, -1/3, 2 * Math.SQRT2 / 3),
        vec3(Math.sqrt(2/3), -1/3, -Math.SQRT2/3),
        vec3(-Math.sqrt(2/3), -1/3, -Math.SQRT2/3)
    ];

    var indices = [
        0, 2, 1,
        0, 1, 3,
        0, 3, 2,
        2, 3, 1,
    ];

    var normals = []; // Since it is a ball, its normal == its cordination
    for (const vert of verts) {
        normals.push(vert);
    }
            
    return [verts, indices, normals];
}

function start(gl, canvas, program) {
    // This function is called after shaders are loaded

    // 1. Calculate vertex data
    var tmp = genTetrahedron();
    var verts = tmp[0];
    var indices = tmp[1];
    var normals = tmp[2];

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
    var a_norm = gl.getAttribLocation(program, "a_norm");

    var vertex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertex_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_pos, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_pos );

    var normal_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, normal_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer( a_norm, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_norm );

    var indice_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indice_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // 6. Assign MVP mat && Regist view
    var u_mvp_mat = gl.getUniformLocation(program, "u_mvp_mat");
    var u_norm_mat = gl.getUniformLocation(program, "u_norm_mat");
    var onViewMatChange = function(view_mat) {
        var mvp_mat = view_mat;
        gl.uniformMatrix4fv(u_mvp_mat, false, flatten(mvp_mat));

        var norm_mat = mat3(0);
        for(var i=0; i<3; i++) {
            for(var j=0; j<3; j++)
                norm_mat[i][j] = mvp_mat[i][j];
        }
        norm_mat = inverse3(transpose(norm_mat));
        gl.uniformMatrix3fv(u_norm_mat, false, flatten(norm_mat));
    };
    registView(canvas, onViewMatChange);

    // 7. Assign uniform varaibles

    // 8. Regist Render work
    var render = function(){
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}