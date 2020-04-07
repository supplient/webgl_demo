import {downloadModels} from "../../lib/utils.js"
import {loadProgram} from "../../lib/initShaders_v2.js"

class Light {
    constructor(color, pos=null) {
        this.color = color;
        this.pos = pos;
    }

    isAmbient() {
        return pos==null;
    }
}

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
            obj: "../../sources/bear.obj",
            mtl: true,
        }
    ]);

    Promise.all([load_shader, download_models]).then(function([program, meshs]){
        start(gl, canvas, program, meshs);
    });
};

function getLocations(gl, program, is_uniform, name_list) {
    var function_name = is_uniform ? "getUniformLocation" : "getAttribLocation";
    for (const name of name_list)
        gl[name] = gl[function_name](program, name);
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
    function getRotateMat(degree) {
        var X_rot_mat = rotateX(degree);
        var Y_rot_mat = rotateY(degree);
        var Z_rot_mat = rotateZ(degree);
        return mult(Z_rot_mat, mult(Y_rot_mat, X_rot_mat));
        // EDIT HERE
        // return mult(X_rot_mat, mult(Z_rot_mat, Y_rot_mat));
        // return mult(Y_rot_mat, mult(Z_rot_mat, X_rot_mat));
    }

    // Set Lights
    gl.ambientLight = new Light(vec3(1.0, 1.0, 1.0), null);
    gl.spotLight = new Light(vec3(1.0, 1.0, 1.0), vec4(-1, 1, 1, 1));

    // =============Anime(Render)================
    // Set anime params
    var start_time = new Date().getTime();
    var last_updateUI_time = 0;
    var rotating_samples = [[0, 0, 0]];
    var all_sampled = false;
    var ui_all_updated = false;

    var ANIME_TIME = 4 * 1000; // ms
    var SAMPLE_NUM = 100; // include beginning, exclude ending
    var SAMPLE_INTERVAL = ANIME_TIME / SAMPLE_NUM; // ms
    var UI_UPDATE_INTERVAL = ANIME_TIME; // ms

    // Regist Render work
    var render = function(){
        // Cal anime vars
        var now_time = new Date().getTime();
        var progress = (now_time-start_time)%ANIME_TIME/ANIME_TIME;

        // Cal model transform
        var model_mat = getRotateMat(progress * 360);

        // Sample x, y, z's rotating in its own coordinate system
        if( !all_sampled && now_time > rotating_samples.length * SAMPLE_INTERVAL + start_time ) {
            var sample = calActualRotating(model_mat);
            if(rotating_samples.length >= SAMPLE_NUM)
                all_sampled = true;
            rotating_samples.push(sample);
        }

        // Update UI
        if(!ui_all_updated && now_time - last_updateUI_time > UI_UPDATE_INTERVAL) {
            last_updateUI_time = now_time;
            updateUI(rotating_samples);
            if(all_sampled)
                ui_all_updated = true;
        }

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

function calActualRotating(model_mat) {
    var ps = {
        front : vec4(0, 0, 1, 1),
        back : vec4(0, 0, -1, 1),
        left : vec4(-1, 0, 0, 1),
        right : vec4(1, 0, 0, 1),
        up : vec4(0, 1, 0, 1),
        down : vec4(0, -1, 0, 1)
    }
    for (const name of Object.keys(ps))
        ps[name] = mult(model_mat, ps[name]);

    function calDegree(delta) {
        delta = delta/2;
        var rad = Math.asin(delta/1);
        return rad / (Math.PI/2) * 90;
    }
    
    // Measure X's rotating
    var X_delta = ps.back[1] - ps.front[1];
    var X_degree = calDegree(X_delta);

    // Y's
    var Y_delta = ps.left[2] - ps.right[2];
    var Y_degree = calDegree(Y_delta);

    // Z's
    var Z_delta = ps.down[0] - ps.up[0];
    var Z_degree = calDegree(Z_delta);

    return [X_degree, Y_degree, Z_degree];
}

function updateUI(samples) {
    var colors = {
        red: "rgb(255, 99, 132)",
        blue: "rgb(54, 162, 235)",
        green: "rgb(75, 192, 192)"
    };
    
    var xs = [], ys = [], zs = [];
    var labels = [];
    for (var i=0; i<samples.length; i++) {
        var sample = samples[i];
        xs.push(sample[0]);
        ys.push(sample[1]);
        zs.push(sample[2]);
        labels.push(i);
    }

    var ctx = document.getElementById("chart").getContext("2d");
    var lineChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "x",
                    backgroundColor: colors.green,
                    borderColor: colors.green,
                    data: xs,
                    fill: false,
                }, {
                    label: "y",
                    backgroundColor: colors.red,
                    borderColor: colors.red,
                    data: ys,
                    fill: false,
                }, {
                    label: "z",
                    backgroundColor: colors.blue,
                    borderColor: colors.blue,
                    data: zs,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: false,
            title: {
                display: true,
                text: "Actual rotating"
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: "Anime Progress"
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: "Degree"
                    }
                }]
            }
        }
    });

}