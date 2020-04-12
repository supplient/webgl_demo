precision highp float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec4 u_lightPos;
uniform vec4 u_V;

uniform mat4 u_mvp_mat;

uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;
uniform bool u_switch_norm;
uniform sampler2D s_norm;

uniform sampler2D s_depth;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;
varying vec4 v_pos_in_light;

float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift);
    return depth; 
}

void main()
{
    vec3 pos_in_light = (v_pos_in_light.xyz / v_pos_in_light.w) / 2.0 + 0.5;
    vec2 light_uv = pos_in_light.xy;
    float light_depth = unpackDepth(texture2D(s_depth, light_uv));

    // Cal norm
    vec3 N = normalize(v_norm); // Surface normal
    if(u_switch_norm) { // If using norm texture
        // Transform data range
        vec3 tex_norm = texture2D(s_norm, v_uv).xyz; // [0, 1]
        tex_norm = 2.0 * tex_norm - 1.0; // [-1, 1]

        // Transform to clip space
        mat3 TBN = mat3(normalize(v_tan), normalize(v_bitan), N);
        N = TBN * tex_norm;
    }
    
    // Cal light model
    vec3 L = normalize((u_mvp_mat * u_lightPos - v_pos).xyz); // Light vector
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    vec4 ambient = vec4(u_ambientProd, 1.0);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);
    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, v_uv);
    }

    if(pos_in_light.z > light_depth + 0.05) {
        gl_FragColor = ambient + 0.7*diffuse + 0.5*specular;
    }
    else {
        gl_FragColor = ambient + diffuse + specular;
    }
    // gl_FragColor = vec4(vec3(light_depth), 1.0);
}
