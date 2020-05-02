import {downloadModels} from "../../lib/utils.js"
import {loadPrograms} from "../../lib/initShaders_v2.js"
import {AmbientLight, DirectionalLight, SpotLight, PointLight} from "./light.js"
import {bufferOneModel} from "./buffer.js"
import {getTexSwitchVarName, getTexVarName, drawModel_deep, drawModel_dist, drawModel, drawTextureCube} from "./draw.js"
import {init2DShadowFBO, initPointShadowFBO} from "./fbo.js"

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
            ["deep.vert", "deep.frag"],
            ["dist.vert", "dist.frag"],
            ["cube_test.vert", "cube_test.frag"],
        ]
    );
    var download_models = downloadModels([
        {
            obj: "../../sources/cube_rough.obj",
            mtl: true,
            downloadMtlTextures: true,
            mtlTextureRoot: "../../sources/texture",
        }
    ]);

    Promise.all([load_shaders, download_models]).then(function([programs, meshs]){
        start(gl, canvas, programs, meshs);
    });
};



function getLocations(gl, program, is_uniform, name_list) {
    var function_name = is_uniform ? "getUniformLocation" : "getAttribLocation";
    for (const name of name_list)
        program[name] = gl[function_name](program, name);
}

function start(gl, canvas, programs, meshs) {
    // This function is called after shaders are loaded
    var program = programs[0];
    var deep_prog = programs[1];
    var dist_prog = programs[2];
    var cube_test_prog = programs[3];

    // =============My Config================
    var tex_attr_map = {
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


    // =============Program property=======================
    // Get shader vars' location
    getLocations(gl, program, false, [
        "a_pos", "a_norm", "a_uv", "a_tan", "a_bitan",
    ]);
    getLocations(gl, program, true, [
        "u_model_mat", "u_vp_mat", "u_mvp_mat", 
        "u_norm_mat", "u_vec_mat",
        "u_dirLight_vp_mat", "u_spotLight_vp_mat",
        "u_ambientProd", 
        "u_switch_direction", "u_dirLightDir", "u_dirDiffProd", "u_dirSpecProd", 
        "u_switch_spot", "u_spotLightPos", "u_spotLightDir", "u_spotInCos", "u_spotOutCos", "u_spotDiffProd", "u_spotSpecProd",
        "u_switch_point", "u_pointLightWorldPos", "u_pointLightPos", "u_pointFarPlane", "u_pointDiffProd", "u_pointSpecProd", 
        "u_Ns", "u_viewPos",
        "s_spotShadow", "s_dirShadow", "s_pointShadow",
    ]);
    var tex_var_names = [];
    for (const name of Object.values(tex_attr_map)) {
        tex_var_names.push(getTexSwitchVarName(name));
        tex_var_names.push(getTexVarName(name));
    }
    getLocations(gl, program, true, tex_var_names);

    getLocations(gl, deep_prog, false, [
        "a_pos",
    ]);
    getLocations(gl, deep_prog, true, [
        "u_mvp_mat",
    ]);

    getLocations(gl, dist_prog, false, [
        "a_pos",
    ]);
    getLocations(gl, dist_prog, true, [
        "u_model_mat", "u_mvp_mat",
        "u_lightPos", "u_farPlane",
    ]);

    getLocations(gl, cube_test_prog, false, [
        "a_pos", "a_norm", 
    ]);
    getLocations(gl, cube_test_prog, true, [
        "u_norm_mat", "u_mvp_mat",
        "s_cube", 
    ]);


    // =============View================
    // Init view & projection matrix
    var view_mat = mat4([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    var proj_mat = ortho(-1, 1, -1, 1, 1, -1); // Note we set z=1 is near to use right hand coordinate system

    // Regist view
    var onViewMatChange = function(new_view_mat) {
        view_mat = new_view_mat;
    };
    registView(canvas, onViewMatChange, true);

    // =============Cache================
    // Buffer vertex data
    var buffers = {}
    for (const mesh_name of Object.keys(meshs))
        buffers[mesh_name] = bufferOneModel(gl, meshs[mesh_name], tex_attr_map);
    
    // Init FBO
    var dirShadowFBO = init2DShadowFBO(gl, canvas.width*4, canvas.height*4);
    var spotShadowFBO = init2DShadowFBO(gl, canvas.width*4, canvas.height*4);
    var pointShadowFBO = initPointShadowFBO(gl, canvas.width, canvas.height);

    // =============Scene================
    // Set Model Matrix
    var model_mats = [
        mult(translate(0.2, 0.2, -0.5), scalem(2/5, 2/5, 2/5)),
        mult(translate(0, 0, -0.9), scalem(18/5, 18/5, 1/5)),
        mult(translate(0, 0, -0.7), scalem(9/5, 9/5, 1/10)),

        mult(translate(-0.5, 0.2, 0.2), scalem(2/5, 2/5, 2/5)),
        mult(translate(-0.9, 0, 0), scalem(1/5, 18/5, 18/5)),

        mult(translate(0.2, -0.5, 0.2), scalem(2/5, 2/5, 2/5)),
        mult(translate(0, -0.9, 0), scalem(18/5, 1/5, 18/5)),

        mult(translate(-0.4, -0.3, -0.3), scalem(2/5, 2/5, 2/5)),
    ];

    // Set Lights
    var lights = {
        ambient: new AmbientLight(
            vec3(1.0, 1.0, 1.0)
        ),
        direction: new DirectionalLight(
            vec3(1.0, 1.0, 1.0),
            vec3(0, 0, 1),
            vec3(0, 0, -1),
            2
        ),
        spot: new SpotLight(
            vec3(0.6, 0.3, 0.4),
            vec3(0, 0, 0.2),
            vec3(0, 0, -1),
            5,
            7,
            10,
            0.05,
        ),
        point: new PointLight(
            vec3(0.5, 0.475, 0.7),
            vec3(0, 0, 0),
            5,
            0.05,
        ),
    }
    lights.direction = null;
    lights.spot = null;

    // =============Anime(Render)================
    function drawShadow_deep(
            vp_width, vp_height,
            view_mat, proj_mat,
            ) {
        gl.viewport(0, 0, vp_width, vp_height);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const model_mat of model_mats) {
            var mesh_name = Object.keys(meshs)[0];
            drawModel_deep(
                gl, 
                deep_prog, 
                meshs[mesh_name], 
                buffers[mesh_name],
                model_mat,
                view_mat,
                proj_mat,
            );
        }
    }
    function drawShadow_dist(
            vp_width, vp_height,
            view_mat, proj_mat,
            lightPos, farPlane,
            ) {
        gl.viewport(0, 0, vp_width, vp_height);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const model_mat of model_mats) {
            var mesh_name = Object.keys(meshs)[0];
            drawModel_dist(
                gl, dist_prog, 
                meshs[mesh_name], buffers[mesh_name],
                model_mat, view_mat, proj_mat,
                lightPos, farPlane,
            );
        }
    }


    // Regist Render work
    var render = function(){
        // Draw directional light's depth texture
        if(lights.direction) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, dirShadowFBO.fbo);
            drawShadow_deep(
                dirShadowFBO.width,
                dirShadowFBO.height,
                lights.direction.getLightViewMat(),
                lights.direction.getLightProjMat(),
            );
        }

        // Draw spot light's depth texture
        if(lights.spot) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, spotShadowFBO.fbo);
            drawShadow_deep(
                spotShadowFBO.width,
                spotShadowFBO.height,
                lights.spot.getLightViewMat(),
                lights.spot.getLightProjMat(),
            );
        }

        // Draw point light's depth texture
        if(lights.point) {
            var view_mats = lights.point.getLightViewMats();
            var point_proj_mat = lights.point.getLightProjMat();

            gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadowFBO.fbo);
            for(var i=0; i<6; i++) {
                var target = PointLight.getTargets(gl)[i];
                gl.framebufferTexture2D(
                    gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                    target, pointShadowFBO.fbo_tex, 0
                    );

                drawShadow_dist(
                    pointShadowFBO.per_width,
                    pointShadowFBO.per_height,
                    view_mats[i],
                    point_proj_mat,
                    lights.point.getPosVec4(),
                    lights.point.far,
                );
            }
        }

        // Test: Draw the point light's shadow texture
        function drawPointLightShadow() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport( 0, 0, canvas.width, canvas.height );
            gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
            gl.enable(gl.DEPTH_TEST);
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            var model_mat = identity(4);
            var mesh_name = Object.keys(meshs)[0];
            drawTextureCube(gl, cube_test_prog,
                meshs[mesh_name], buffers[mesh_name],
                model_mat, view_mat, proj_mat,
                pointShadowFBO.fbo_tex
                );
        }
        // drawPointLightShadow();

        // Draw Models
        function drawModels() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport( 0, 0, canvas.width, canvas.height );
            gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
            gl.enable(gl.DEPTH_TEST);
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            for (const model_mat of model_mats) {
                var mesh_name = Object.keys(meshs)[0];
                drawModel(
                    gl, 
                    program, 
                    meshs[mesh_name], 
                    buffers[mesh_name],
                    model_mat,
                    view_mat,
                    proj_mat,
                    tex_attr_map,
                    lights,
                    {
                        direction: dirShadowFBO.fbo_tex,
                        spot: spotShadowFBO.fbo_tex,
                        point: pointShadowFBO.fbo_tex,
                    }
                );
            }
        }
        drawModels();

        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}
