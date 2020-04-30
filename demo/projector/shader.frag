precision highp float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec3 u_lightPos;
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

vec4 packDepth(const in float depth) {
    if(depth >= 1.0) {
        return vec4(1.0, 1.0, 1.0, 1.0);
    }
    const vec4 bitShift = vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0);
    const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0);
    vec4 rgbaDepth = fract(depth * bitShift);
    rgbaDepth -= rgbaDepth.gbaa * bitMask;
    return rgbaDepth;
}

float unpackDepth(const in vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    float depth = dot(rgbaDepth, bitShift);
    return depth; 
}

int toInt(const in float x) {
    float t = x * 255.0;
    float s = fract(t);
    int m;
    if(s > 0.5) {
        m = int(t) + 1;
    } else {
        m = int(t);
    }
    return m;
}

float toFloat(const in int x) {
    return float(x) / 255.0;
}

ivec4 toRGBA(const in vec4 v) {
    return ivec4(toInt(v.x), toInt(v.y), toInt(v.z), toInt(v.w));
}

vec4 toVec(const in ivec4 v) {
    return vec4(toFloat(v.x), toFloat(v.y), toFloat(v.z), toFloat(v.w));
}

void main()
{
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
    vec4 lightPos = u_mvp_mat * vec4(u_lightPos, 1.0);
    vec3 L = normalize((lightPos - v_pos).xyz); // Light vector
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    vec4 ambient = vec4(u_ambientProd, 1.0);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);
    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, v_uv);
    }

    // Check whether in shadow
    vec3 pos_in_light = (v_pos_in_light.xyz / v_pos_in_light.w) / 2.0 + 0.5;
    vec4 fdepth = packDepth(pos_in_light.z);
    ivec4 depth = toRGBA(fdepth);

    vec2 light_uv = pos_in_light.xy;
    vec4 flight_depth = texture2D(s_depth, light_uv);
    ivec4 light_depth = toRGBA(flight_depth);

    bool in_shadow = false;
    // light_depth.y += 1;
    if(
        (depth.x > light_depth.x) ||
        (depth.x == light_depth.x && depth.y > light_depth.y) ||
        (depth.x == light_depth.x && depth.y == light_depth.y && depth.z > light_depth.z) ||
        (depth.x == light_depth.x && depth.y == light_depth.y && depth.z == light_depth.z && depth.w > light_depth.w)
        ) {
        in_shadow = true;
    }

    if(in_shadow) {
        gl_FragColor = ambient;
    }
    else {
        gl_FragColor = ambient + diffuse + specular;
    }

    // if(in_shadow) {
        // gl_FragColor = vec4(0.6, 0.0, 0.0, 1.0);
    // }
    // else {
        // gl_FragColor = vec4(0.0, 0.0, 0.6, 1.0);
    // }

    // gl_FragColor = vec4(toVec(depth).xyz, 1.0);
    // gl_FragColor = vec4(toVec(light_depth).xyz, 1.0);

    // if(depth.x > light_depth.x) {
        // gl_FragColor = vec4(0.5, 0.0, 0.0, 1.0); // Red
    // } else if(depth.x == light_depth.x && depth.y > light_depth.y) {
        // gl_FragColor = vec4(0.0, 0.5, 0.0, 1.0); // Green
    // } else if(depth.x == light_depth.x && depth.y == light_depth.y && depth.z > light_depth.z) {
        // gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0); // Blue
    // } else if(depth.x == light_depth.x && depth.y == light_depth.y && depth.z == light_depth.z && depth.w > light_depth.w) {
        // gl_FragColor = vec4(0.5, 0.5, 0.0, 1.0); // Yellow
    // } else if(depth.x == light_depth.x && depth.y == light_depth.y && depth.z == light_depth.z && depth.w == light_depth.w) {
        // gl_FragColor = vec4(0.0, 0.5, 0.5, 1.0); // Clyn
    // } else if(depth.x < light_depth.x) {
        // gl_FragColor = vec4(0.5, 0.0, 0.5, 1.0); // Purple
    // } else if(depth.y < light_depth.y) {
        // gl_FragColor = vec4(0.25, 0, 0, 1.0); // Small Red
    // } else if(depth.z < light_depth.z) {
        // gl_FragColor = vec4(0.0, 0.25, 0.0, 1.0); // Small Green
    // } else if(depth.w < light_depth.w) {
        // gl_FragColor = vec4(0.0, 0.0, 0.25, 1.0); // Small Blue
    // } else {
        // gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0); // White
    // }
}
