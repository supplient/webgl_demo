import {downloadModels} from "../../lib/utils.js"
import {loadPrograms} from "../../lib/initShaders_v2.js"
import {AmbientLight, DirectionalLight, SpotLight} from "./light.js"
import {bufferOneModel} from "./buffer.js"
import {getTexSwitchVarName, getTexVarName, drawModel_deep, drawModel} from "./draw.js"

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
    function initFBO() {
        var FBO_WIDTH = canvas.width * 4;
        var FBO_HEIGHT = canvas.height * 4;
        var fbo = gl.createFramebuffer();

        var fbo_tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, fbo_tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FBO_WIDTH, FBO_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        var fbo_depth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo_depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, FBO_WIDTH, FBO_HEIGHT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo_tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fbo_depth);

        var fbo_check = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if(fbo_check != gl.FRAMEBUFFER_COMPLETE)
            throw fbo_check.toString();

        return {
            height: FBO_HEIGHT,
            width: FBO_WIDTH,
            fbo: fbo,
            fbo_tex: fbo_tex,
        }
    }
    var dirShadowFBO = initFBO();
    var spotShadowFBO = initFBO();

    // Get shader vars' location
    getLocations(gl, program, false, [
        "a_pos", "a_norm", "a_uv", "a_tan", "a_bitan",
    ]);
    getLocations(gl, program, true, [
        "u_model_mat", "u_vp_mat", "u_mvp_mat", 
        "u_norm_mat", "u_vec_mat",
        "u_dirLight_vp_mat", "u_spotLight_vp_mat",
        "u_ambientProd", 
        "u_dirLightDir", "u_dirDiffProd", "u_dirSpecProd", 
        "u_spotLightPos", "u_spotLightDir", "u_spotInCos", "u_spotOutCos", "u_spotDiffProd", "u_spotSpecProd",
        "u_Ns", "u_viewPos",
        "s_spotShadow", "s_dirShadow",
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

    // =============Scene================
    // Set Model Matrix
    var model_mats = [
        mult(translate(0, 0, -0.5), scalem(8/5, 8/5, 8/5)),
        mult(translate(0, 0, 0.6), scalem(4/5, 4/5, 4/5)),
    ];

    // Set Lights
    var lights = {
        ambient: new AmbientLight(
            vec3(1.0, 1.0, 1.0)
        ),
        direction: new DirectionalLight(
            // vec3(1.0, 1.0, 1.0),
            vec3(0, 0, 0),
            vec3(0, 0, 1),
            vec3(0, 0, -1),
            2
        ),
        spot: new SpotLight(
            vec3(1.0, 1.0, 1.0),
            vec3(1, 0, -0.5),
            vec3(0, 0, 0),
            2,
            3,
            10,
            0.05,
        ),
    }

    // =============Anime(Render)================
    // Regist Render work
    var render = function(){
        // Draw directional light's depth texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, dirShadowFBO.fbo);
        gl.viewport(0, 0, dirShadowFBO.width, dirShadowFBO.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const model_mat of model_mats) {
            var mesh_name = Object.keys(meshs)[0];
            drawModel_deep(
                gl, 
                deep_prog, 
                meshs[mesh_name], 
                buffers[mesh_name],
                model_mat,
                lights.direction.getLightViewMat(),
                lights.direction.getLightProjMat()
            );
        }

        // Draw spot light's depth texture
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.bindFramebuffer(gl.FRAMEBUFFER, spotShadowFBO.fbo);
        gl.viewport(0, 0, spotShadowFBO.width, spotShadowFBO.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const model_mat of model_mats) {
            var mesh_name = Object.keys(meshs)[0];
            drawModel_deep(
                gl, 
                deep_prog, 
                meshs[mesh_name], 
                buffers[mesh_name],
                model_mat,
                lights.spot.getLightViewMat(),
                lights.spot.getLightProjMat()
            );
        }

        // Draw Models
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
                lights,
                tex_attr_map,
                {
                    direction: dirShadowFBO.fbo_tex,
                    spot: spotShadowFBO.fbo_tex,
                }
            );
        }

        requestAnimationFrame(render)
    };
    requestAnimationFrame(render);
}