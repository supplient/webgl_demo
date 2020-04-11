precision mediump float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec4 u_lightPos;
uniform vec4 u_V;

uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;
uniform bool u_switch_norm;
uniform sampler2D s_norm;

uniform vec2 u_windowSize;
uniform mat4 u_lightMat;

uniform mat4 u_proj_mat;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;

void main()
{
    vec4 lightPos = 5.0 * u_proj_mat * u_lightMat * u_lightPos;

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
    vec3 L = normalize((lightPos - v_pos).xyz); // Light vector
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    vec4 ambient = vec4(u_ambientProd, 1.0);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);
    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    /** 
    * 首先计算一个变换矩阵T，它从屏幕平面到纹理投影平面
    * 然后将屏幕的四个角的裁剪坐标A(-1, -1, 0), B(1, -1, 0), C(-1, 1, 0), D(1, 1, 0)用上述的变换矩阵T变换到纹理投影平面，
    * 得到A'=TA, B'=TB, C'=TC, D'=TD
    * 计算得到向量α=B'A'.xy, β=C'A'.xy，也就是新的纹理坐标系中的基向量
    * 构造矩阵M0=[α, β]，设其逆矩阵为M，则M将原纹理坐标变换成新的纹理坐标
    * 再设向量γ=A'A.xy/2，它是纹理坐标原点位移向量，除以2是因为裁剪坐标中宽高都是2，而纹理坐标中宽高都是1
    * 若原纹理坐标为P，则新的纹理坐标P'=MP-γ
    */
    vec4 A = vec4(-1, -1, 0, 1);
    vec4 A_ = u_lightMat * A;
    vec4 B_ = u_lightMat * vec4(1, -1, 0, 1);
    vec4 C_ = u_lightMat * vec4(-1, 1, 0, 1);
    vec2 alpha = (B_-A_).xy;
    vec2 beta = (C_-A_).xy;
    vec2 gamma = (A_-A).xy / 2.0;
    mat2 M0 = mat2(alpha, beta);
    mat2 M = mat2(M0[1].y, -M0[0].y, -M0[1].x, M0[0].x);
    M = M / (M0[0].x * M0[1].y - M0[1].x * M0[0].y);

    // We want to do a projection effect, so here we do not use v_uv for diffuse texture
    vec2 uv = vec2(0.0);
    uv.x = gl_FragCoord.x / u_windowSize.x;
    uv.y = gl_FragCoord.y / u_windowSize.y;
    uv = M*uv - gamma;

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, uv);
    }

    gl_FragColor = ambient + diffuse + specular;
}
