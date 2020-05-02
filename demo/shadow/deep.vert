attribute vec4 a_pos;

uniform mat4 u_mvp_mat;

void main()
{
    gl_Position = u_mvp_mat * a_pos;
}
