

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


var vert_index = 0;
class Vertex {
    constructor(p) {
        this.index = vert_index;
        this.p = p;
        this.linked_verts = [];

        vert_index++;

        this.addLinkedVert = function(u) {
            if(this.linked_verts.indexOf(u) != -1)
                return;
            if(this == u)
                return;
            this.linked_verts.push(u);
        }
    }

}

class Face {
    constructor(verts) {
        this.verts = verts;
        for(var u of this.verts){
            for(var v of this.verts) {
                u.addLinkedVert(v);
                v.addLinkedVert(u);
            }
        }

    }
}

function oneIter(faces) {
    function getLineKey(u, v) {
        if(u.index < v.index)
            return u.index.toString() + "_" + v.index.toString();
        else
            return v.index.toString() + "_" + u.index.toString();
    }

    // 计算边的中点，并统计所有顶点
    var line_dict = {};
    var verts = [];
    for (const face of faces) {
        for(var i=0; i<face.verts.length-1; i++){
            for(var j=i+1; j<face.verts.length; j++) {
                var u = face.verts[i];
                var v = face.verts[j];

                if(verts.indexOf(u) == -1)
                    verts.push(u);
                if(verts.indexOf(v) == -1)
                    verts.push(v)

                if(line_dict.hasOwnProperty(getLineKey(u, v)))
                    continue;
                
                // 计算中点坐标 & 归一化中点坐标
                var p = add(u.p, v.p);
                p = normalize(p);
                var middle_point = new Vertex(p);
                line_dict[getLineKey(u, v)] = middle_point;
            }
        }
    }

    var new_faces = []
    // 遍历旧顶点，找出连接其的边的中点，并使这些中点构成一个新面
    for (const u of verts) {
        var new_verts = [];
        for (const v of u.linked_verts)
            new_verts.push(line_dict[getLineKey(u, v)]);
        var new_face = new Face(new_verts);
        new_faces.push(new_face);
    }

    // 遍历旧面，找出构成其的边的中点，并使这些中点构成一个新面
    for (const face of faces) {
        var new_verts = [];
        for(var i=0; i<face.verts.length-1; i++) {
            for(var j=i+1; j<face.verts.length; j++) {
                var u = face.verts[i];
                var v = face.verts[j];
                new_verts.push(line_dict[getLineKey(u, v)]);
            }
        }
        var new_face = new Face(new_verts);
        new_faces.push(new_face);
    }

    return new_faces;
}

function genBall(epoch) {
    var faces = genTetrahedron();    

    for(var i=0; i<epoch; i++){
        console.log("Doing epoch " + epoch.toString());
        faces = oneIter(faces);
    }

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

function start(gl, canvas, program) {
    // This function is called after shaders are loaded

    // 1. Calculate vertex data
    var tmp = genBall(1);
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