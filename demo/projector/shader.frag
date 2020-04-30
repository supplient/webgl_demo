precision highp float;

// ambient light
uniform vec3 u_ambientProd;

// directional light
uniform vec3 u_dirLightDir;
uniform vec3 u_dirDiffProd;
uniform vec3 u_dirSpecProd;

// spot light
uniform vec3 u_spotLightPos;
uniform vec3 u_spotLightDir;
uniform float u_spotInCos;
uniform float u_spotOutCos;
uniform vec3 u_spotDiffProd;
uniform vec3 u_spotSpecProd;

// other light model parameters
uniform float u_Ns;
uniform vec4 u_viewPos;

// transform matrixs
uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

// model textures
uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;
uniform bool u_switch_norm;
uniform sampler2D s_norm;

// depth textures
uniform sampler2D s_dirShadow;
uniform sampler2D s_spotShadow;

// varying
varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;

varying vec4 v_pos_in_dirLight;
varying vec4 v_pos_in_spotLight;

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

bool inShadow(vec4 pos_in_clip, sampler2D shadow) {
    vec3 pos_in_light = (pos_in_clip.xyz / pos_in_clip.w) / 2.0 + 0.5;
    vec4 fdepth = packDepth(pos_in_light.z);
    ivec4 depth = toRGBA(fdepth);

    vec2 light_uv = pos_in_light.xy;
    vec4 flight_depth = texture2D(shadow, light_uv);
    ivec4 light_depth = toRGBA(flight_depth);

    return (
        (depth.x > light_depth.x) ||
        (depth.x == light_depth.x && depth.y > light_depth.y) ||
        (depth.x == light_depth.x && depth.y == light_depth.y && depth.z > light_depth.z) ||
        (depth.x == light_depth.x && depth.y == light_depth.y && depth.z == light_depth.z && depth.w > light_depth.w)
    );
    
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
    /// Shared vars
    vec3 viewForw = normalize((u_viewPos - v_pos).xyz);
    vec3 diffColor = vec3(0.0);
    vec3 specColor = vec3(0.0);

    /// Ambient
    vec4 ambient = vec4(u_ambientProd, 1.0);

    /// DirectionalLight
    // TODO Move dirLightDir, dirLightHalf's calculating to js
    vec3 dirLightDir = normalize(u_norm_mat * (-u_dirLightDir)); // Light vector
    vec3 dirLightHalf = normalize(dirLightDir + viewForw); // Half angle vector
    vec3 dirDiff = max(dot(dirLightDir, N), 0.0) * u_dirDiffProd;
    vec3 dirSpec = pow(max(dot(N, dirLightHalf), 0.0), u_Ns) * u_dirSpecProd;
    
    //// Check DirectionalLight's shadow
    if(!inShadow(v_pos_in_dirLight, s_dirShadow)) {
        diffColor += dirDiff;
        specColor += dirSpec;
    }

    /// SpotLight
    vec4 spotLightPos = u_mvp_mat * vec4(u_spotLightPos, 1.0);
    vec3 spotForw = normalize((spotLightPos - v_pos).xyz);
    vec3 spotLightDir = normalize(u_norm_mat * (-u_spotLightDir));
    float spotFragCos = dot(spotForw, spotLightDir);
    float spotIntensity = clamp((spotFragCos - u_spotOutCos)/(u_spotInCos - u_spotOutCos), 0.0, 1.0);
    vec3 spotLightHalf = normalize(spotLightDir + viewForw);
    vec3 spotDiff = max(dot(spotLightDir, N), 0.0) * u_spotDiffProd * spotIntensity;
    vec3 spotSpec = pow(max(dot(N, spotLightHalf), 0.0), u_Ns) * u_spotSpecProd * spotIntensity;

    //// Check whether in SpotLight's shadow
    vec3 pos_in_light = (v_pos_in_spotLight.xyz / v_pos_in_spotLight.w) / 2.0 + 0.5;
    vec4 fdepth = packDepth(pos_in_light.z);
    ivec4 depth = toRGBA(fdepth);

    vec2 light_uv = pos_in_light.xy;
    vec4 flight_depth = texture2D(s_spotShadow, light_uv);
    ivec4 light_depth = toRGBA(flight_depth);

    if(!inShadow(v_pos_in_spotLight, s_spotShadow)) {
        diffColor += spotDiff;
        specColor += spotSpec;
    }

    vec4 diffuse = vec4(diffColor, 1.0);
    vec4 specular = vec4(specColor, 1.0);

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, v_uv);
    }

    gl_FragColor = ambient + diffuse + specular;
    // gl_FragColor = vec4(-v_pos_in_spotLight.xyz, 1.0);
    // gl_FragColor = vec4(flight_depth.xyz, 1.0);

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