attribute vec4 a_pos;
attribute vec4 a_norm;
attribute vec3 a_uv;
attribute vec3 a_tan;
attribute vec3 a_bitan;

uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;

void main()
{
    gl_Position = u_mvp_mat * a_pos;

    v_pos = u_mvp_mat * a_pos;
    v_norm = u_norm_mat * a_norm.xyz;
    v_uv = a_uv.xy;
    v_tan = u_norm_mat * a_tan;
    v_bitan = u_norm_mat * a_bitan;
}
