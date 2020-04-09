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
    var program_prepare = false;
    var image_prepare = false;
    var program = null;
    var image = new Image();
    function check() {
        if(program_prepare && image_prepare)
            start(gl, canvas, program, image);
    }

    // 2. Asynchronously load shaders & models
    loadProgram(
        gl, "shader.vert", "shader.frag"
    ).then(value => {
        program = value;
        program_prepare = true;
        check();
    });

    image.onload = function() {
        image_prepare = true;
        check();
    }
    image.src = "../../sources/texture/dice_256.png";
};

function start(gl, canvas, program, image) {
    // This function is called after shaders are loaded
    gl.useProgram(program);

    // =============WebGL config================
    // Configure WebGL
    if(!gl.getExtension("OES_element_index_uint")){
        console.warn("UNSIGNED_INT unsupported.");
        return;
    }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    // =============Cache================
    // Buffer vertex data
    var verts = [
        vec3(0.5, 0.5, 0),
        vec3(0.5, -0.5, 0),
        vec3(-0.5, -0.5, 0)
    ];
    var uvs = [
        vec2(1.0, 1.0),
        vec2(1.0, 0),
        vec2(0, 0)
    ];
    // var texSize = 256;
    // var tex_data = new Uint8Array(4 * texSize * texSize);
    // for(var i=0; i<texSize; i++) {
        // for(var j=0; j<texSize; j++) {
            // tex_data[4*i*texSize + 4*j] = 255;
            // tex_data[4*i*texSize + 4*j+1] = 255;
            // tex_data[4*i*texSize + 4*j+2] = 255;
            // tex_data[4*i*texSize + 4*j+3] = 255;
        // }
    // }

    var vert_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.a_pos = gl.getAttribLocation(program, "a_pos");
    gl.vertexAttribPointer(gl.a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.a_pos);

    var uv_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(uvs), gl.STATIC_DRAW);
    gl.a_uv = gl.getAttribLocation(program, "a_uv");
    gl.vertexAttribPointer(gl.a_uv, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.a_uv);

    // var texture = gl.createTexture();
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, texture);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex_data);
    // gl.generateMipmap( gl.TEXTURE_2D );
    // var s_diffuse = gl.getUniformLocation(program, "s_diffuse");
    // gl.uniform1i(s_diffuse, 0);

    var texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    var s_diffuse = gl.getUniformLocation(program, "s_diffuse");
    gl.uniform1i(s_diffuse, 0);

    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}