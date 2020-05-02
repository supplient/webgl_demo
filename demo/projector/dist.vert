attribute vec4 a_pos;

uniform mat4 u_model_mat;
uniform mat4 u_mvp_mat;

varying vec4 v_worldPos;

void main()
{
    gl_Position = u_mvp_mat * a_pos;
    v_worldPos = u_model_mat * a_pos;
}