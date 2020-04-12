import {downloadModels} from "../../lib/utils.js"
import {loadPrograms} from "../../lib/initShaders_v2.js"

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
    var load_shaders = loadPrograms(
        gl, [
            ["shader.vert", "shader.frag"],
            ["simple_shader.vert", "simple_shader.frag"]
        ]
    );
    var download_models = downloadModels([
        {
            obj: "../../sources/dice.obj",
            mtl: true,
            downloadMtlTextures: true,
            mtlTextureRoot: "../../sources/texture",
        }
    ]);

    Promise.all([load_shaders, download_models]).then(function([programs, meshs]){
        start(gl, canvas, programs, meshs);
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
    function assignAttrib(buf, size, type, pos) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(pos, size, type, false, 0, 0);
        gl.enableVertexAttribArray(pos);
    }
    assignAttrib(buffer.vert, 3, gl.FLOAT, program.a_pos);
    assignAttrib(buffer.norm, 3, gl.FLOAT, program.a_norm);
    if(buffer.uv) {
        assignAttrib(buffer.uv, buffer.uv_stride, gl.FLOAT, program.a_uv);
    }
    if(buffer.tan) {
        assignAttrib(buffer.tan, 3, gl.FLOAT, program.a_tan);
        assignAttrib(buffer.bitan, 3, gl.FLOAT, program.a_bitan);
    }

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
    gl.uniformMatrix4fv(program.u_mvp_mat, false, flatten(mvp_mat));
    gl.uniformMatrix3fv(program.u_norm_mat, false, flatten(norm_mat));

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
        gl.uniform3fv(program.u_ambientProd, ambientProd);
        gl.uniform3fv(program.u_diffuseProd, diffuseProd);
        gl.uniform3fv(program.u_specularProd, specularProd);
        gl.uniform1f(program.u_Ns, Ns);
        gl.uniform4fv(program.u_lightPos, lightPos);
        gl.uniform4fv(program.u_V, V);

        // 7. Assign textures
        var tex_units = [
            gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, 
            gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7
        ];
        var attrs = Object.keys(gl.tex_attr_map);
        var names = Object.values(gl.tex_attr_map);
        for(var i=0; i<attrs.length; i++) {
            var mtl_tex = mtl[attrs[i]];
            var switch_name = getTexSwitchVarName(names[i]);
            if(!mtl_tex || !mtl_tex.filename) {
                gl.uniform1i(program[switch_name], false);
            }
            else {
                gl.uniform1i(program[switch_name], true);
                gl.activeTexture(tex_units[i]);
                gl.bindTexture(gl.TEXTURE_2D, mtl_tex.tex_obj);
                gl.uniform1i(program[getTexVarName(names[i])], i);
            }
        }

        // 8. Draw
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

function Image2RGBA(image) {
    var tmp_ctx = document.createElement("canvas").getContext("2d");
    tmp_ctx.drawImage(image, 0, 0);
    var image_data = tmp_ctx.getImageData(0, 0, image.width, image.height);
    return [image_data.data, image_data.height, image_data.width];
}

function bump2normal(bump_array, bump_height, bump_width) {
    var norm_array = new Uint8Array(bump_width * bump_height * 3);
    for(var y=0; y<bump_height-1; y++) {
        for(var x=0; x<bump_width-1; x++) {
            var now_i = 4*x + 4*y*bump_width;
            var dx_i = 4*(x+1) + 4*y*bump_width;
            var dy_i = 4*x + 4*(y+1)*bump_width;

            var now_color = vec3(bump_array[now_i], bump_array[now_i+1], bump_array[now_i+2]);
            var dx_color = vec3(bump_array[dx_i], bump_array[dx_i+1], bump_array[dx_i+2]);
            var dy_color = vec3(bump_array[dy_i], bump_array[dy_i+1], bump_array[dy_i+2]);

            var dx_vec = subtract(now_color, dx_color);
            var dy_vec = subtract(now_color, dy_color);
            var dz_vec = vec3(255, 255, 255); // The max value.

            var dx = length(dx_vec);
            var dy = length(dy_vec);
            var dz = length(dz_vec);

            // Transform the data range
            var norm = vec3(dx, dy, dz); // [-√3*255, √3*255]
            norm = normalize(norm, false); // [-1, 1]
            norm = add(norm, vec3(1, 1, 1)); // [0, 2]
            norm = scale(0.5, norm); // [0, 1]
            norm = scale(255, norm); // [0, 255]

            norm_array[3*x + 3*y*bump_width] = norm[0];
            norm_array[3*x + 3*y*bump_width + 1] = norm[1];
            norm_array[3*x + 3*y*bump_width + 2] = norm[2];
        }
        // Padding the right border
        norm[3*(bump_width-1) + 3*y*bump_width] = 0;
        norm[3*(bump_width-1) + 3*y*bump_width + 1] = 0;
        norm[3*(bump_width-1) + 3*y*bump_width + 2] = 255;
    }
    // Padding the bottom border
    for(var x=0; x<bump_width; x++) {
        norm[3*x + 3*(bump_height-1)*bump_width] = 0;
        norm[3*x + 3*(bump_height-1)*bump_width + 1] = 0;
        norm[3*x + 3*(bump_height-1)*bump_width + 2] = 255;
    }
    // NOTE Padding the right and bottom border to avoid changing the size of texture
    //      This is for not converting POT(power of two) texture to NPOT texture

    return [norm_array, bump_height, bump_width];
}


function bufferOneModel(gl, mesh) {
    // 0. Support functions
    function bufferVertexArray(gl, data) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buf;
    }

    // 1. Buffer vertices, normals, uvs
    var vert_buffer = bufferVertexArray(gl, flatten(mesh.vertices));
    var norm_buffer = bufferVertexArray(gl, flatten(mesh.vertexNormals));
    var uv_buffer = null;
    if(mesh.textures.length > 0)
        uv_buffer = bufferVertexArray(gl, flatten(mesh.textures));

    // 2. Buffer indices per material
    var index_buffers = []
    for (var mtl_i=0; mtl_i<mesh.indicesPerMaterial.length; mtl_i++) {
        var indices = mesh.indicesPerMaterial[mtl_i];

        // Identify the max index to judge which data type to use
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

    // 3. Buffer textures
    var has_bump = false;
    if(uv_buffer) {
        var mtls = Object.values(mesh.materialsByIndex);
        for (var mtl_i=0; mtl_i<mtls.length; mtl_i++) {
            var mtl = mesh.materialsByIndex[mtl_i];
            for (const attr of Object.keys(gl.tex_attr_map)) {
                const mtl_tex = mtl[attr];
                if (!mtl_tex || !mtl_tex.filename) {
                    continue;
                }

                // Create new texture object
                var tex_obj = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex_obj);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

                // Set parameters
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                // Buffer the image data
                if(attr == "mapBump") {
                    has_bump = true; // Mark whether there is a bump texture, cal tans and bitans later

                    // Load bump texture
                    var bump_image = mtl_tex.texture;
                    var [bump_array, bump_height, bump_width] = Image2RGBA(bump_image);

                    // Cal normal texture
                    var [norm_array, norm_height, norm_width] = bump2normal(bump_array, bump_height, bump_width);
                    
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, norm_width, norm_height, 0, gl.RGB, gl.UNSIGNED_BYTE, norm_array);
                }
                else {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, mtl_tex.texture);
                }

                // Save the object ref
                mtl_tex.tex_obj = tex_obj;
            }

        }
    }

    // 4. Buffer tangents, bitangents and normal texture
    if(has_bump) {
        // Buffer tangents and bitangents
        mesh.calculateTangentsAndBitangents();
        var tan_buffer = bufferVertexArray(gl, flatten(mesh.tangents));
        var bitan_buffer = bufferVertexArray(gl, flatten(mesh.bitangents));
    }

    var res = {
        vert: vert_buffer,
        norm: norm_buffer,
        indices: index_buffers
    };
    if(uv_buffer) {
        res.uv = uv_buffer;
        res.uv_stride = mesh.textureStride;
    }
    if(has_bump) {
        res.tan = tan_buffer;
        res.bitan = bitan_buffer;
    }

    return res;
}

function getLocations(gl, program, is_uniform, name_list) {
    var function_name = is_uniform ? "getUniformLocation" : "getAttribLocation";
    for (const name of name_list)
        program[name] = gl[function_name](program, name);
}

function getTexSwitchVarName(origin_name) {
    return "u_switch_" + origin_name;
}

function getTexVarName(origin_name) {
    return "s_" + origin_name;
}

function start(gl, canvas, programs, meshs) {
    // This function is called after shaders are loaded
    var program = programs[0];
    var simple_program = programs[1];

    // =============My Frame Config================
    gl.tex_attr_map = {
        "mapDiffuse": "diffuse",
        // "mapAmbient": "ambient",
        // "mapSpecular": "specular",
        // "mapDissolve": "dissolve",
        "mapBump": "norm",
        // "mapDisplacement": "disp",
        // "mapDecal": "decal",
        // "mapEmissive": "emis",
    };

    // =============WebGL config================
    // Configure WebGL
    if(!gl.getExtension("OES_element_index_uint")){
        console.warn("UNSIGNED_INT unsupported.");
        return;
    }

    // =============Cache================
    // Buffer vertex data
    var buffers = {}
    for (const mesh_name of Object.keys(meshs))
        buffers[mesh_name] = bufferOneModel(gl, meshs[mesh_name]);
    
    var panel_verts = [
        vec3(-0.7, -0.7, 0),
        vec3(0.7, -0.7, 0),
        vec3(0.7, 0.7, 0),
        vec3(-0.7, 0.7, 0)
    ];
    var panel_uvs = [
        vec2(0, 0),
        vec2(1, 0),
        vec2(1, 1),
        vec2(0, 1)
    ];
    var panel_indices = [
        0, 1, 3,
        2, 3, 1
    ];

    function bufferVertexArray(gl, data) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buf;
    }
    var panel_vert_buf = bufferVertexArray(gl, flatten(panel_verts));
    var panel_uv_buf = bufferVertexArray(gl, flatten(panel_uvs));
    var panel_index_buf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel_index_buf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(panel_indices), gl.STATIC_DRAW);
    
    // Init FBO
    gl.FBO_WIDTH = 256;
    gl.FBO_HEIGHT = 256;
    gl.fbo = gl.createFramebuffer();

    gl.fbo_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl.fbo_tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.FBO_WIDTH, gl.FBO_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    var fbo_depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, fbo_depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.FBO_WIDTH, gl.FBO_HEIGHT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gl.fbo_tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo_depth);

    var fbo_check = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(fbo_check != gl.FRAMEBUFFER_COMPLETE)
        throw fbo_check.toString();

    // Get shader vars' location
    getLocations(gl, program, false, [
        "a_pos", "a_norm", "a_uv", "a_tan", "a_bitan",
    ]);
    getLocations(gl, program, true, [
        "u_mvp_mat", "u_norm_mat",
        "u_ambientProd", "u_diffuseProd", "u_specularProd", "u_Ns",
        "u_lightPos", "u_V",
    ]);
    var tex_var_names = [];
    for (const name of Object.values(gl.tex_attr_map)) {
        tex_var_names.push(getTexSwitchVarName(name));
        tex_var_names.push(getTexVarName(name));
    }
    getLocations(gl, program, true, tex_var_names);

    getLocations(gl, simple_program, false, [
        "a_pos", "a_uv",
    ]);
    getLocations(gl, simple_program, true, [
        "s_fbo"
    ]);

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

    // =============Scene================
    // Set Model Matrix
    var model_mats = [
        translate(-0.4, 0, 0),
        translate(0.4, 0, 0),
    ];

    // Set Lights
    gl.ambientLight = new Light(vec3(1.0, 1.0, 1.0), null);
    gl.spotLight = new Light(vec3(1.0, 1.0, 1.0), vec4(-1, 1, 1, 1));

    // =============Anime(Render)================
    function drawModels() {
        gl.enable(gl.DEPTH_TEST);
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const model_mat of model_mats) {
            var mesh_name = Object.keys(meshs)[0];
            drawModel(
                gl, 
                program, 
                meshs[mesh_name], 
                buffers[mesh_name],
                model_mat
            );
        }
    }

    // Regist Render work
    var render = function(){
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        gl.viewport(0, 0, gl.FBO_WIDTH, gl.FBO_HEIGHT);
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        drawModels();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(simple_program);
        gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        function assignAttrib(buf, size, type, pos) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(pos, size, type, false, 0, 0);
            gl.enableVertexAttribArray(pos);
        }
        assignAttrib(panel_vert_buf, 3, gl.FLOAT, simple_program.a_pos);
        assignAttrib(panel_uv_buf, 2, gl.FLOAT, simple_program.a_uv);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gl.fbo_tex);
        gl.uniform1i(simple_program.s_fbo, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel_index_buf);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);

        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}