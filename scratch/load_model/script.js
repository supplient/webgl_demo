import {downloadModels} from "../../lib/utils.js"
import {loadProgram} from "../../lib/initShaders_v2.js"

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
    var load_shader = loadProgram(
        gl, "shader.vert", "shader.frag"
    );
    var download_models = downloadModels([
        {
            obj: "../../sources/two_mtl.obj",
            mtl: true,
        }
    ]);

    Promise.all([load_shader, download_models]).then(function([program, meshs]){
        start(gl, canvas, program, meshs);
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
        // OLD_TODO use one buffer and offset
        // WHY_OLD we need to use different size of array to save different indice buffer, such as Uint8Array, Uint16Array.
        //          so it is inconvenient to use one buffer.
        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}

function bufferOneModel(gl, mesh) {
    // 0. Support functions
    function bufferVertexArray(gl, data) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buf;
    }

    // 1. Buffer vertices & normals
    var vert_buffer = bufferVertexArray(gl, flatten(mesh.vertices));
    var norm_buffer = bufferVertexArray(gl, flatten(mesh.vertexNormals));

    // 2. Buffer indices per material
    var index_buffers = []
    for (var mtl_i=0; mtl_i<mesh.indicesPerMaterial.length; mtl_i++) {
        var indices = mesh.indicesPerMaterial[mtl_i];

        var max_ind = Math.max(...indices);
        var ind_type = null;
        var ind_data = null;
        if(max_ind < 2**8) {
            ind_type = gl.UNSIGNED_BYTE;
            ind_data = new Uint8Array(indices);
        } 
        else if(max_ind < 2**16) {
            ind_type = gl.UNSIGNED_SHORT;
            ind_data = new Uint16Array(indices);
        }
        else if(max_ind < 2**32) {
            ind_type = gl.UNSIGNED_INT;
            ind_data = new Uint32Array(indices);
        }
        else {
            var mesh_name = mesh.name;
            var mtl_name = mesh.materialNamesByIndex[mtl_i];
            throw "Mesh \"" + mesh_name + "\" 's material \"" + mtl_name + "\" is using too many indices, which equals " + max_ind.toString() + ". The max of indices is 2^32.";
        }

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind_data, gl.STATIC_DRAW);
        index_buffers[mtl_i] = {
            buffer: buf,
            type: ind_type,
            num: indices.length
        };
    }

    return {
        vert: vert_buffer,
        norm: norm_buffer,
        indices: index_buffers
    };
}

function getLocations(gl, program, is_uniform, name_list) {
    var function_name = is_uniform ? "getUniformLocation" : "getAttribLocation";
    for (const name of name_list)
        gl[name] = gl[function_name](program, name);
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
    getLocations(gl, program, false, [
        "a_pos", "a_norm",
    ]);
    getLocations(gl, program, true, [
        "u_mvp_mat", "u_norm_mat",
        "u_ambientProd", "u_diffuseProd", "u_specularProd", "u_Ns",
        "u_lightPos", "u_V",
    ]);

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