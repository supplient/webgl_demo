function bufferVertexArray(gl, data) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
}

export function bufferOneModel(gl, mesh, tex_attr_map) {
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
            for (const attr of Object.keys(tex_attr_map)) {
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
            var norm = vec3(dx, dy, dz); // [-âˆš3*255, âˆš3*255]
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