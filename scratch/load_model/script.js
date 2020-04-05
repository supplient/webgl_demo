import {downloadModels} from "../../lib/utils.js"

window.onload = function main() {
    // This function is called when html page is loaded
    // 1. Get WebGL context
    var canvas = document.getElementById( "webgl" );

    var gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) {
        console.log("Failed to get the rendering context.");
        return;
    }

    // 2. Asynchronously load shaders & models
    var program_ready = false;
    var mesh_ready = false;
    var program = null;
    var meshs = {};
    function checkAllReady() {
        // TODO This maybe should use Promise
        if(program_ready && mesh_ready)
            start(gl, canvas, program, meshs);
    }

    loadShaderSource(
        "shader.vert", "shader.frag", 
        function(vshadersrc, fshadersrc) {
            program = createProgram(gl, vshadersrc, fshadersrc);
            program_ready = true;
            checkAllReady()
        }
    );
    downloadModels([
        {
            obj: "../../sources/cube.obj",
            mtl: true,
        }
    ]).then(models => {
        meshs = models;
        mesh_ready = true;
        checkAllReady();
    });
};

class Light {
    constructor(color, pos=null) {
        this.color = color;
        this.pos = pos;
    }

    isAmbient() {
        return pos==null;
    }
}

function drawModel(gl, program, mesh, buffer, model_mat) {
    // 1. Select shaders
    gl.useProgram( program );

    // 2. Assign attribute vars
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vert);
    gl.vertexAttribPointer(gl.a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.a_pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.norm);
    gl.vertexAttribPointer(gl.a_norm, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.a_norm);

    // 3. Calculate mvp_mat & norm_nat
    var vp_mat = mult(gl.proj_mat, gl.view_mat);
    var mvp_mat = mult(vp_mat, model_mat);

    var norm_mat = mat3(0);
    for(var i=0; i<3; i++) {
        for(var j=0; j<3; j++)
            norm_mat[i][j] = mvp_mat[i][j];
    }
    norm_mat = inverse3(transpose(norm_mat));

    // 4. Assign mvp_mat & norm_mat
    gl.uniformMatrix4fv(gl.u_mvp_mat, false, flatten(mvp_mat));
    gl.uniformMatrix3fv(gl.u_norm_mat, false, flatten(norm_mat));

    // Draw material by material
    var index_buffers = buffer.indices;
    for(var mtl_i=0; mtl_i<index_buffers.length; mtl_i++) {
        var mtl = mesh.materialsByIndex[mtl_i];

        // 5. Calculate light model
        var ambientProd = mult(mtl.ambient, gl.ambientLight.color);
        var diffuseProd = mult(mtl.diffuse, gl.spotLight.color);
        var specularProd = mult(mtl.specular, gl.spotLight.color);
        var Ns = mtl.specularExponent;
        var lightPos = mult(gl.proj_mat, gl.spotLight.pos);
        var V = mult(gl.proj_mat, vec4(0, 0, 1, 1));

        // 6. Assign uniform variables
        gl.uniform3fv(gl.u_ambientProd, ambientProd);
        gl.uniform3fv(gl.u_diffuseProd, diffuseProd);
        gl.uniform3fv(gl.u_specularProd, specularProd);
        gl.uniform1f(gl.u_Ns, Ns);
        gl.uniform4fv(gl.u_lightPos, lightPos);
        gl.uniform4fv(gl.u_V, V);

        // 7. Draw
        // TODO use one buffer and offset
        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}

function bufferOneModel(gl, mesh) {
    // 1. Buffer vertex & normals
    var vert_buffer = gl.createBuffer();
    var norm_buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vert_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(mesh.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, norm_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(mesh.vertexNormals), gl.STATIC_DRAW);

    // 2. Buffer indices per material
    var index_buffers = []
    for (var mtl_i=0; mtl_i<mesh.indicesPerMaterial.length; mtl_i++) {
        // TODO To judge whether to use Uint32, We need recognize the max in indices
        var indices = mesh.indicesPerMaterial[mtl_i];
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
        index_buffers[mtl_i] = {
            buffer: buf,
            type: gl.UNSIGNED_BYTE,
            num: indices.length
        };
    }

    return {
        vert: vert_buffer,
        norm: norm_buffer,
        indices: index_buffers
    };
}


function start(gl, canvas, program, meshs) {
    // This function is called after shaders are loaded

    // =============WebGL config================
    // Configure WebGL
    if(!gl.getExtension("OES_element_index_uint")){
        console.warn("UNSIGNED_INT unsupported.");
        return;
    }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    // =============View================
    // Init view & projection matrix
    gl.view_mat = mat4([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    gl.proj_mat = ortho(-1, 1, -1, 1, 1, -1); // Note we set z=1 is near to use right hand coordinate system

    // Regist view
    var onViewMatChange = function(view_mat) {
        gl.view_mat = view_mat;
    };
    registView(canvas, onViewMatChange, true);

    // =============Cache================
    // Buffer vertex data
    var buffers = {}
    for (const mesh_name of Object.keys(meshs))
        buffers[mesh_name] = bufferOneModel(gl, meshs[mesh_name]);

    // Get shader vars' location
    gl.a_pos = gl.getAttribLocation(program, "a_pos");
    gl.a_norm = gl.getAttribLocation(program, "a_norm");

    gl.u_mvp_mat = gl.getUniformLocation(program, "u_mvp_mat");
    gl.u_norm_mat = gl.getUniformLocation(program, "u_norm_mat");

    gl.u_ambientProd = gl.getUniformLocation(program, "u_ambientProd");
    gl.u_diffuseProd = gl.getUniformLocation(program, "u_diffuseProd");
    gl.u_specularProd = gl.getUniformLocation(program, "u_specularProd");
    gl.u_Ns = gl.getUniformLocation(program, "u_Ns");
    gl.u_lightPos = gl.getUniformLocation(program, "u_lightPos");
    gl.u_V = gl.getUniformLocation(program, "u_V");

    // =============Scene================
    // Set Model Matrix
    var model_mat = mat4([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    // Set Lights
    gl.ambientLight = new Light(vec3(1.0, 1.0, 1.0), null);
    gl.spotLight = new Light(vec3(1.0, 1.0, 1.0), vec4(-1, 1, 1, 1));

    // =============Anime(Render)================
    // Regist Render work
    var render = function(){
        // Draw
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const mesh_name of Object.keys(meshs)) {
            drawModel(
                gl, 
                program, 
                meshs[mesh_name], 
                buffers[mesh_name],
                model_mat
            );
        }

        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}