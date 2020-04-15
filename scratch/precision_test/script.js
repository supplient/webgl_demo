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
            ["depth.vert", "depth.frag"],
            ["simple.vert", "simple.frag"]
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

function getLocations(gl, program, is_uniform, name_list) {
    var function_name = is_uniform ? "getUniformLocation" : "getAttribLocation";
    for (const name of name_list)
        program[name] = gl[function_name](program, name);
}

function start(gl, canvas, programs, meshs) {
    // This function is called after shaders are loaded
    var depth_prog = programs[0];
    var simple_prog = programs[1];

    // =============WebGL config================
    // Configure WebGL
    if(!gl.getExtension("OES_element_index_uint")){
        console.warn("UNSIGNED_INT unsupported.");
        return;
    }

    // =============Cache================
    // Buffer vertex data
    var verts = [
        vec3(0, 0, 0)
    ];
    var indices = [
        0
    ];

    function bufferVertexArray(gl, data) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buf;
    }
    var vert_buf = bufferVertexArray(gl, flatten(verts));
    var index_buf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
    
    // Init FBO
    gl.FBO_WIDTH = 512;
    gl.FBO_HEIGHT = 512;
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
    getLocations(gl, depth_prog, false, [
        "a_pos",
    ]);
    getLocations(gl, simple_prog, false, [
        "a_pos",
    ]);
    getLocations(gl, simple_prog, true, [
        "s_fbo"
    ]);

    // =============Anime(Render)================
    function drawPoints(program) {
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        gl.enable(gl.DEPTH_TEST);
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        function assignAttrib(buf, size, type, pos) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(pos, size, type, false, 0, 0);
            gl.enableVertexAttribArray(pos);
        }
        assignAttrib(vert_buf, 3, gl.FLOAT, program.a_pos);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buf);
        gl.drawElements(gl.POINTS, indices.length, gl.UNSIGNED_BYTE, 0);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
    gl.useProgram(depth_prog);
    gl.viewport(0, 0, gl.FBO_WIDTH, gl.FBO_HEIGHT);
    drawPoints(depth_prog);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(simple_prog);
    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gl.fbo_tex);
    gl.uniform1i(simple_prog.s_fbo, 0);

    drawPoints(simple_prog);
}