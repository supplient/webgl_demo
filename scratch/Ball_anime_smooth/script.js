

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
 * 遍历每个旧面上的每个顶点，该顶点与该面上的其他顶点相连的两条边的中点与该顶点构成一个新面。
 * 且每个旧面上三条边的中点构成一个新面。
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


var vert_index = 0;
class Vertex {
    constructor(p) {
        this.index = vert_index;
        this.p = p;

        vert_index++;
    }

}

class Face {
    constructor(verts) {
        this.verts = verts;
    }
}

function faces2Verts(faces) {
    // Build verts' array & normals' array
    var verts = [];
    var normals = [];
    for (const face of faces) {
        for(const vert of face.verts) {
            if(verts.indexOf(vert.p) != -1)
                continue;
            verts.push(vert.p);
            normals.push(vert.p);
        }
    }

    // Build indices' array
    var indices = [];
    for (const face of faces) {
        var points = [];
        for(const vert of face.verts)
            points.push(vert.p);
        if(!checkCounterClockwise(points)) {
            var temp = points[2];
            points[2] = points[1];
            points[1] = temp;
        }

        for(const point of points)
            indices.push(verts.indexOf(point));
    }

    return [verts, indices, normals];
}

function checkCounterClockwise(points) {
    var a = points[0];
    var b = points[1];
    var c = points[2];

    var b_a = subtract(b, a);
    var c_a = subtract(c, a);
    var Q = cross(b_a, c_a);
    
    return dot(Q, a)>0;
}

function genTetrahedron() {
    var r = 1;

    var verts = [
        new Vertex(vec3(0, 1, 0)),
        new Vertex(vec3(0, -1/3, 2 * Math.SQRT2 / 3)),
        new Vertex(vec3(Math.sqrt(2/3), -1/3, -Math.SQRT2/3)),
        new Vertex(vec3(-Math.sqrt(2/3), -1/3, -Math.SQRT2/3)),
    ];

    var indices = [
        0, 2, 1,
        0, 1, 3,
        0, 3, 2,
        2, 3, 1,
    ];

    var faces = []
    for(var i=0; i < indices.length; i+=3) {
        var x = verts[indices[i]];
        var y = verts[indices[i+1]];
        var z = verts[indices[i+2]];
        face = new Face([x, y, z]);
        faces.push(face);
    }
            
    return faces;
}

function copyPoint(p) {
    var np = [];
    for (const x of p) {
        np.push(x);
    }
    return np;
}

function* oneIter(faces, ITER_YIELD_INTERVAL) {
    function getLineKey(u, v) {
        if(u.index < v.index)
            return u.index.toString() + "_" + v.index.toString();
        else
            return v.index.toString() + "_" + u.index.toString();
    }
    var last_time = new Date().getTime();
    var do_check = true;
    function checkTime() {
        if(!do_check)
            return false;

        var now_time = new Date().getTime();
        if(now_time-last_time > ITER_YIELD_INTERVAL) {
            last_time = now_time;
            return true;
        }
        else
            return false;
    }

    // 计算边的中点
    var mid_v_dict = {};
    var norm_mid_v_dict = {};
    for (const face of faces) {
        for(var i=0; i<face.verts.length-1; i++){
            for(var j=i+1; j<face.verts.length; j++) {
                var u = face.verts[i];
                var v = face.verts[j];

                if(mid_v_dict.hasOwnProperty(getLineKey(u, v)))
                    continue;
                
                // 计算中点坐标
                var p = scale(0.5, add(u.p, v.p));
                var mid_v = new Vertex(p);
                var norm_p = copyPoint(p);
                normalize(norm_p);
                var norm_mid_v = new Vertex(norm_p);
                mid_v_dict[getLineKey(u, v)] = mid_v;
                norm_mid_v_dict[getLineKey(u, v)] = norm_mid_v;
            }
        }

        if(checkTime()) {
            do_check = yield null;
        }
    }

    var old_faces = []
    var new_faces = []
    for (const face of faces) {
        // 遍历旧面，对该面的每个顶点，找出该面中与它相连的两条边的中点，该顶点与两中点构成一个新面
        for (const u of face.verts) {
            var old_verts = [u];
            var new_verts = [u];
            for (const v of face.verts) {
                if(u == v)
                    continue;
                old_verts.push(mid_v_dict[getLineKey(u, v)]);
                new_verts.push(norm_mid_v_dict[getLineKey(u, v)]);
            }
            var old_face = new Face(old_verts);
            old_faces.push(old_face);
            var new_face = new Face(new_verts);
            new_faces.push(new_face);
        }

        // 遍历旧面，找出构成其的边的中点，并使这些中点构成一个新面
        var old_verts = [];
        var new_verts = [];
        for(var i=0; i<face.verts.length-1; i++) {
            for(var j=i+1; j<face.verts.length; j++) {
                var u = face.verts[i];
                var v = face.verts[j];
                old_verts.push(mid_v_dict[getLineKey(u, v)]);
                new_verts.push(norm_mid_v_dict[getLineKey(u, v)]);
            }
        }
        var old_face = new Face(old_verts);
        old_faces.push(old_face);
        var new_face = new Face(new_verts);
        new_faces.push(new_face);

        if(checkTime()) {
            do_check = yield null;
        }
    }

    yield [old_faces, new_faces];
}

function start(gl, canvas, program) {
    // This function is called after shaders are loaded

    // 1. Calculate vertex data
    var old_faces = genTetrahedron();
    var new_faces = old_faces;

    // 2. Calculate Transform Matrix

    // 3. Configure WebGL
    if(!gl.getExtension("OES_element_index_uint")){
        console.warn("UNSIGNED_INT unsupported.");
        return;
    }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    // 4. Select shaders
    gl.useProgram( program );

    // 5. Load vertex data into the GPU
    //  && Associate out shader variables with our data buffer
    var a_old_pos = gl.getAttribLocation( program, "a_old_pos" );
    var a_new_pos = gl.getAttribLocation( program, "a_new_pos" );
    var a_old_norm = gl.getAttribLocation(program, "a_old_norm");
    var a_new_norm = gl.getAttribLocation(program, "a_new_norm");

    var old_vert_buffer = gl.createBuffer();
    var new_vert_buffer = gl.createBuffer();
    var old_norm_buffer = gl.createBuffer();
    var new_norm_buffer = gl.createBuffer();
    var indice_buffer = gl.createBuffer();
    function updateVertBuffers(old_faces, new_faces) {
        var tmp = faces2Verts(old_faces);
        var old_verts = tmp[0];
        var indices = tmp[1];
        var old_normals = tmp[2];

        var tmp = faces2Verts(new_faces);
        var new_verts = tmp[0];
        // var new_indices = tmp[1]; // They share the same indice
        var new_normals = tmp[2];

        gl.bindBuffer( gl.ARRAY_BUFFER, old_vert_buffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(old_verts), gl.STATIC_DRAW);
        gl.vertexAttribPointer( a_old_pos, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( a_old_pos );

        gl.bindBuffer( gl.ARRAY_BUFFER, new_vert_buffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(new_verts), gl.STATIC_DRAW);
        gl.vertexAttribPointer( a_new_pos, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( a_new_pos );

        gl.bindBuffer( gl.ARRAY_BUFFER, old_norm_buffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(old_normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer( a_old_norm, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( a_old_norm );

        gl.bindBuffer( gl.ARRAY_BUFFER, new_norm_buffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(new_normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer( a_new_norm, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( a_new_norm );

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indice_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

        return indices.length;
    }

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
    var u_progress = gl.getUniformLocation(program, "u_progress");
    function updateProgress(progress) {
        progress = Math.min(1.0, progress);
        gl.uniform1f(u_progress, progress);
    }

    var ITER_YIELD_INTERVAL = 100; // ms
    var ONE_ITER_TIME = 4000; // ms
    var iter_start_time = 0; // ms
    var ITER_NUM = 4;
    var iter_count = -1;
    var vert_num = null;
    var next_iter_faces = null;
    var iter_gener = null;
    // 8. Regist Render work
    var render = function(){
        var now_time = new Date().getTime();
        // Check if one iter has completed
        if(now_time >= iter_start_time + ONE_ITER_TIME
            && 
            iter_count < ITER_NUM) {

            if(iter_gener) { // Check, because the first iter has no iter_gener at first.
                if(!next_iter_faces) {// Last iter's calculation has not been done
                    var iter_ret = iter_gener.next(false);
                    next_iter_faces = iter_ret.value;
                }

                // Swap to next iter's faces
                old_faces = next_iter_faces[0];
                new_faces = next_iter_faces[1];
                vert_num = updateVertBuffers(old_faces, new_faces);

                next_iter_faces = null;
                iter_count++;
                iter_start_time = new Date().getTime();
            }

            // Start calculate new iter
            iter_gener = oneIter(new_faces, ITER_YIELD_INTERVAL);
        }

        // Update progress
        updateProgress((now_time-iter_start_time)/ONE_ITER_TIME);

        // Push calculating next iter
        if(!next_iter_faces) {
            var iter_ret = iter_gener.next(true);
            if(iter_ret.value)
                next_iter_faces = iter_ret.value;
        }

        // Draw
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, vert_num, gl.UNSIGNED_INT, 0);
        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}

/**
 * 每一帧做的事情：
 *      检查是否跑完了一个迭代，若跑完了：
 *          检查是否存在下一迭代的计算，若存在：
 *              检查下一迭代的计算是否已经完成，若未完成：
 *                  停止计算函数中的时间检查，并反复调用，直至计算完成
 *              在计算完成后，用新迭代的数据更新顶点数组
 *              更新迭代开始时间
 *          开始再下一个迭代的计算
 *      更新进度
 *      推进计算
 *      绘制
 */