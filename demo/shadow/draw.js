export function getTexSwitchVarName(origin_name) {
    return "u_switch_" + origin_name;
}

export function getTexVarName(origin_name) {
    return "s_" + origin_name;
}

function assignAttrib(gl, buf, size, type, pos) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(pos, size, type, false, 0, 0);
    gl.enableVertexAttribArray(pos);
}

export function drawModel_deep(gl, program, mesh, buffer, model_mat, view_mat, proj_mat) {
    // 1. Select shaders
    gl.useProgram( program );

    // 2. Assign attribute vars
    assignAttrib(gl, buffer.vert, 3, gl.FLOAT, program.a_pos);

    // 3. Calculate mvp_mat & norm_nat
    var vp_mat = mult(proj_mat, view_mat);
    var mvp_mat = mult(vp_mat, model_mat);

    // 4. Assign mvp_mat & norm_mat
    gl.uniformMatrix4fv(program.u_mvp_mat, false, flatten(mvp_mat));

    // Draw material by material
    var index_buffers = buffer.indices;
    for(var mtl_i=0; mtl_i<index_buffers.length; mtl_i++) {
        var mtl = mesh.materialsByIndex[mtl_i];

        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}

export function drawModel_dist(
        gl, program, 
        mesh, buffer, 
        model_mat, view_mat, proj_mat, 
        lightPos, farPlane
    ) {
    // 1. Select shaders
    gl.useProgram( program );

    // 2. Assign attribute vars
    assignAttrib(gl, buffer.vert, 3, gl.FLOAT, program.a_pos);

    // 3. Assign mats
    var vp_mat = mult(proj_mat, view_mat);
    var mvp_mat = mult(vp_mat, model_mat);
    gl.uniformMatrix4fv(program.u_model_mat, false, flatten(model_mat));
    gl.uniformMatrix4fv(program.u_mvp_mat, false, flatten(mvp_mat));

    // 4. Assign uniform vars
    gl.uniform4fv(program.u_lightPos, lightPos);
    gl.uniform1f(program.u_farPlane, farPlane);

    // Draw material by material
    var index_buffers = buffer.indices;
    for(var mtl_i=0; mtl_i<index_buffers.length; mtl_i++) {
        var mtl = mesh.materialsByIndex[mtl_i];

        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}

export function drawModels(gl, program,
        meshs, buffers, 
        mesh_names, model_mats,
        view_mat, proj_mat,
        tex_attr_map,
        lights, shadow_texs,
        ) {
    if(mesh_names.length != model_mats.length)
        throw "mesh_names, model_mats must have the same length";

    // 1. Select shaders
    gl.useProgram( program );

    // 3. Calculate mvp_mat & norm_nat
    var vp_mat = mult(proj_mat, view_mat);
    var vec_mat = mat3(0);
    for(var i=0; i<3; i++) {
        for(var j=0; j<3; j++)
            vec_mat[i][j] = vp_mat[i][j];
    }
    vec_mat = inverse3(transpose(vec_mat));

    // 4. Assign transform matrixs
    gl.uniformMatrix4fv(program.u_vp_mat, false, flatten(vp_mat));
    gl.uniformMatrix3fv(program.u_vec_mat, false, flatten(vec_mat));

    // 4.5 Assign lights' transform matrixs, shadow textures
    gl.uniform1i(program.s_dirShadow, 7);
    if(lights.direction) {
        gl.uniform1i(program.u_switch_direction, true);

        var dirLightDir = lights.direction.direction;
        dirLightDir = normalize(mult(vec_mat, scale(-1, dirLightDir)));
        gl.uniform3fv(program.u_dirLightDir, dirLightDir);

        var dirLight_vp_mat = mult(
            lights.direction.getLightProjMat(),
            lights.direction.getLightViewMat(), 
        );
        gl.uniformMatrix4fv(program.u_dirLight_vp_mat, false, flatten(dirLight_vp_mat));

        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, shadow_texs.direction);
    }
    else {
        gl.uniform1i(program.u_switch_direction, false);
    }

    gl.uniform1i(program.s_spotShadow, 6);
    if(lights.spot) {
        gl.uniform1i(program.u_switch_spot, true);

        var spotLightPos = lights.spot.getPosVec4();
        spotLightPos = mult(vp_mat, spotLightPos);
        var spotLightDir = subtract(lights.spot.at, lights.spot.pos);
        spotLightDir = normalize(mult(vec_mat, scale(-1, spotLightDir)));
        var spotInCos = Math.cos(lights.spot.inAngle/180*Math.PI);
        var spotOutCos = Math.cos(lights.spot.outAngle/180*Math.PI);
        gl.uniform4fv(program.u_spotLightPos, spotLightPos);
        gl.uniform3fv(program.u_spotLightDir, spotLightDir);
        gl.uniform1f(program.u_spotInCos, spotInCos);
        gl.uniform1f(program.u_spotOutCos, spotOutCos);

        var spotLight_vp_mat = mult(
            lights.spot.getLightProjMat(),
            lights.spot.getLightViewMat(),
        )
        gl.uniformMatrix4fv(program.u_spotLight_vp_mat, false, flatten(spotLight_vp_mat));

        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, shadow_texs.spot);
    }
    else {
        gl.uniform1i(program.u_switch_spot, false);
    }

    gl.uniform1i(program.s_pointShadow, 5);
    if(lights.point) {
        gl.uniform1i(program.u_switch_point, true);

        var pointLightPos = lights.point.getPosVec4();
        gl.uniform4fv(program.u_pointLightWorldPos, pointLightPos);
        pointLightPos = mult(vp_mat, pointLightPos);
        gl.uniform4fv(program.u_pointLightPos, pointLightPos);
        gl.uniform1f(program.u_pointFarPlane, lights.point.far);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, shadow_texs.point);
    }
    else {
        gl.uniform1i(program.u_switch_point, false);
    }

    var viewPos = mult(proj_mat, vec4(0, 0, 1, 1));
    gl.uniform4fv(program.u_viewPos, viewPos);

    // Draw Model by Model
    var tex_units = [
        gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, 
        gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7
    ];
    for(var i=0; i<mesh_names.length; i++) {
        var mesh_name = mesh_names[i];
        drawModel(
            gl, program,
            meshs[mesh_name], buffers[mesh_name],
            model_mats[i], vp_mat,
            tex_attr_map, tex_units,
            lights,
        );
    }
}

export function drawModel(gl, program,
                    mesh, buffer, 
                    model_mat, vp_mat,
                    tex_attr_map, tex_units,
                    lights,
                    ) {
    // 2. Assign attribute vars
    assignAttrib(gl, buffer.vert, 3, gl.FLOAT, program.a_pos);
    assignAttrib(gl, buffer.norm, 3, gl.FLOAT, program.a_norm);
    if(buffer.uv) {
        assignAttrib(gl, buffer.uv, buffer.uv_stride, gl.FLOAT, program.a_uv);
    }
    if(buffer.tan) {
        assignAttrib(gl, buffer.tan, 3, gl.FLOAT, program.a_tan);
        assignAttrib(gl, buffer.bitan, 3, gl.FLOAT, program.a_bitan);
    }

    // 3. Calculate mvp_mat & norm_nat
    var mvp_mat = mult(vp_mat, model_mat);
    var norm_mat = mat3(0);
    for(var i=0; i<3; i++) {
        for(var j=0; j<3; j++)
            norm_mat[i][j] = mvp_mat[i][j];
    }
    norm_mat = inverse3(transpose(norm_mat));

    // 4. Assign transform matrixs
    gl.uniformMatrix4fv(program.u_model_mat, false, flatten(model_mat));
    gl.uniformMatrix4fv(program.u_mvp_mat, false, flatten(mvp_mat));
    gl.uniformMatrix3fv(program.u_norm_mat, false, flatten(norm_mat));

    // Draw material by material
    var index_buffers = buffer.indices;
    for(var mtl_i=0; mtl_i<index_buffers.length; mtl_i++) {
        var mtl = mesh.materialsByIndex[mtl_i];

        // 5. Calculate & Assign light model
        var ambientProd = mult(mtl.ambient, lights.ambient.color);
        gl.uniform3fv(program.u_ambientProd, ambientProd);

        if(lights.direction) {
            var dirDiffProd = mult(mtl.diffuse, lights.direction.color);
            var dirSpecProd = mult(mtl.specular, lights.direction.color);

            gl.uniform3fv(program.u_dirDiffProd, dirDiffProd);
            gl.uniform3fv(program.u_dirSpecProd, dirSpecProd);
        }

        if(lights.spot) {
            var spotDiffProd = mult(mtl.diffuse, lights.spot.color);
            var spotSpecProd = mult(mtl.specular, lights.spot.color);

            gl.uniform3fv(program.u_spotDiffProd, spotDiffProd);
            gl.uniform3fv(program.u_spotSpecProd, spotSpecProd);
        }

        if(lights.point) {
            var pointDiffProd = mult(mtl.diffuse, lights.point.color);
            var pointSpecProd = mult(mtl.specular, lights.point.color);

            gl.uniform3fv(program.u_pointDiffProd, pointDiffProd);
            gl.uniform3fv(program.u_pointSpecProd, pointSpecProd);
        }

        var Ns = mtl.specularExponent;
        gl.uniform1f(program.u_Ns, Ns);

        // 7. Assign textures
        var attrs = Object.keys(tex_attr_map);
        var names = Object.values(tex_attr_map);
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
        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}

export function drawTextureCube(gl, program,
                    mesh, buffer, 
                    model_mat, view_mat, proj_mat,
                    texture,
                    ) {
    // 1. Select shaders
    gl.useProgram( program );

    // 2. Assign attribute vars
    assignAttrib(gl, buffer.vert, 3, gl.FLOAT, program.a_pos);
    assignAttrib(gl, buffer.norm, 3, gl.FLOAT, program.a_norm);

    // 3. Calculate mvp_mat & norm_nat
    var vp_mat = mult(proj_mat, view_mat);
    var mvp_mat = mult(vp_mat, model_mat);

    var norm_mat = mat3(0);
    for(var i=0; i<3; i++) {
        for(var j=0; j<3; j++)
            norm_mat[i][j] = mvp_mat[i][j];
    }
    norm_mat = inverse3(transpose(norm_mat));

    // 4. Assign transform matrixs
    gl.uniformMatrix4fv(program.u_mvp_mat, false, flatten(mvp_mat));
    gl.uniformMatrix3fv(program.u_norm_mat, false, flatten(norm_mat));

    // 4.5 Assign lights' transform matrixs, shadow textures

    // Draw material by material
    var index_buffers = buffer.indices;
    for(var mtl_i=0; mtl_i<index_buffers.length; mtl_i++) {
        // 7. Assign textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.uniform1i(program.s_cube, 0);

        // 8. Draw
        var buf = index_buffers[mtl_i].buffer;
        var type = index_buffers[mtl_i].type;
        var num = index_buffers[mtl_i].num;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.drawElements(gl.TRIANGLES, num, type, 0);
    }
}