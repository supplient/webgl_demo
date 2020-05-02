precision highp float;

// ambient light
uniform vec3 u_ambientProd;

// directional light
uniform bool u_switch_direction;
uniform vec3 u_dirLightDir;
uniform vec3 u_dirDiffProd;
uniform vec3 u_dirSpecProd;
uniform sampler2D s_dirShadow;

// spot light
uniform bool u_switch_spot;
uniform vec4 u_spotLightPos;
uniform vec3 u_spotLightDir;
uniform float u_spotInCos;
uniform float u_spotOutCos;
uniform vec3 u_spotDiffProd;
uniform vec3 u_spotSpecProd;
uniform sampler2D s_spotShadow;

// point light
uniform bool u_switch_point;
uniform vec4 u_pointLightWorldPos;
uniform vec4 u_pointLightPos;
uniform float u_pointFarPlane;
uniform vec3 u_pointDiffProd;
uniform vec3 u_pointSpecProd;
uniform samplerCube s_pointShadow;

// other light model parameters
uniform float u_Ns;
uniform vec4 u_viewPos;

// transform matrixs
uniform mat4 u_vp_mat;
uniform mat3 u_vec_mat;

// model textures
uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;
uniform bool u_switch_norm;
uniform sampler2D s_norm;

// varying
varying vec4 v_worldPos;
varying vec4 v_pos;
varying vec3 v_norm;
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

bool inShadow(vec4 pos_in_clip, sampler2D shadow, 
        vec3 frag2light, vec3 N, float bias, float min_bias
        ) {
    vec3 pos_in_light = (pos_in_clip.xyz / pos_in_clip.w) / 2.0 + 0.5;
    pos_in_light.z -= max((1.0 - dot(frag2light, N)) * bias, min_bias);
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

bool cubeInShadow(vec4 lightPos, vec4 worldPos, float farPlane, 
        samplerCube shadow, 
        vec3 frag2light, vec3 N, float bias, float min_bias
        ) {
    float dist = length(lightPos.xyz - worldPos.xyz);
    dist = dist / farPlane;
    dist -= max((1.0 - dot(frag2light, N)) * bias, 0.005);
    vec4 fdepth = packDepth(dist);
    ivec4 depth = toRGBA(fdepth);

    vec3 light2frag_world = normalize((worldPos - lightPos).xyz);
    vec4 flight_depth = textureCube(shadow, light2frag_world);
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
    if(u_switch_direction) {
        vec3 dirLightHalf = normalize(u_dirLightDir + viewForw); // Half angle vector
        vec3 dirDiff = max(dot(N, u_dirLightDir), 0.0) * u_dirDiffProd;
        vec3 dirSpec = pow(max(dot(N, dirLightHalf), 0.0), u_Ns) * u_dirSpecProd;
        
        //// Check DirectionalLight's shadow
        if(!inShadow(
                v_pos_in_dirLight, s_dirShadow,
                u_dirLightDir, N, 0.5, 0.0005
                )
            ) {
            diffColor += dirDiff;
            specColor += dirSpec;
        }
    }

    /// SpotLight
    vec4 fdepth;
    vec4 flight_depth;
    if(u_switch_spot) {
        vec3 spotForw = normalize((u_spotLightPos - v_pos).xyz);
        float spotFragCos = dot(spotForw, u_spotLightDir);
        float spotIntensity = clamp((spotFragCos - u_spotOutCos)/(u_spotInCos - u_spotOutCos), 0.0, 1.0);
        vec3 spotLightHalf = normalize(spotForw + viewForw);
        vec3 spotDiff = max(dot(N, spotForw), 0.0) * u_spotDiffProd * spotIntensity;
        vec3 spotSpec = pow(max(dot(N, spotLightHalf), 0.0), u_Ns) * u_spotSpecProd * spotIntensity;

        //// Check whether in SpotLight's shadow
        vec3 pos_in_light = (v_pos_in_spotLight.xyz / v_pos_in_spotLight.w) / 2.0 + 0.5;
        pos_in_light.z -= max((1.0 - dot(spotForw, N)) * 0.5, 0.0005);
        fdepth = packDepth(pos_in_light.z);
        ivec4 depth = toRGBA(fdepth);

        vec2 light_uv = pos_in_light.xy;
        flight_depth = texture2D(s_spotShadow, light_uv);
        ivec4 light_depth = toRGBA(flight_depth);
        if(!inShadow(
                v_pos_in_spotLight, s_spotShadow,
                spotForw, N, 0.0005, 0.0
                )
            ) {
            diffColor += spotDiff;
            specColor += spotSpec;
        }
    }

    /// PointLight
    if(u_switch_point) {
        vec3 pointForw = normalize((u_pointLightPos - v_pos).xyz);
        vec3 pointLightHalf = normalize(pointForw + viewForw);
        vec3 pointDiff = max(dot(N, pointForw), 0.0) * u_pointDiffProd;
        vec3 pointSpec = pow(max(dot(N, pointLightHalf), 0.0), u_Ns) * u_pointSpecProd;

        //// Check whether in SpotLight's shadow
        if(!cubeInShadow(
                u_pointLightWorldPos, v_worldPos, u_pointFarPlane,
                s_pointShadow,
                pointForw, N, 0.05, 0.005
                )
            ) {
            diffColor += pointDiff;
            specColor += pointSpec;
        }
    }

    vec4 diffuse = vec4(diffColor, 1.0);
    vec4 specular = vec4(specColor, 1.0);

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, v_uv);
    }

    gl_FragColor = ambient + diffuse + specular;
}