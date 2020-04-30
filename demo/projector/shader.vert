attribute vec4 a_pos;
attribute vec4 a_norm;
attribute vec3 a_uv;
attribute vec3 a_tan;
attribute vec3 a_bitan;

uniform mat4 u_model_mat;
uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

uniform mat4 u_dirLight_vp_mat;
uniform mat4 u_spotLight_vp_mat;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;

varying vec4 v_pos_in_dirLight;
varying vec4 v_pos_in_spotLight;

void main()
{
    gl_Position = u_mvp_mat * a_pos;

    v_pos = u_mvp_mat * a_pos;
    v_norm = u_norm_mat * a_norm.xyz;
    v_uv = a_uv.xy;
    v_tan = u_norm_mat * a_tan;
    v_bitan = u_norm_mat * a_bitan;

    v_pos_in_dirLight = u_dirLight_vp_mat * u_model_mat * a_pos;
    v_pos_in_spotLight = u_spotLight_vp_mat * u_model_mat * a_pos;
}
