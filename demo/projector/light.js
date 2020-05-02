export class AmbientLight {
    constructor(color) {
        this.color = color;
    }
}

export class DirectionalLight {
    constructor(color, pos, direction, max_dist=1) {
        this.color = color;
        this.pos = pos;
        this.direction = direction;
        this.max_dist = max_dist;
    }

    getLightViewMat() {
        return lookAt(
            this.pos, 
            add(this.pos, this.direction), 
            vec3(0, 1, 0)
        );
    }

    getLightProjMat() {
        return ortho(
            -this.max_dist, this.max_dist, 
            -this.max_dist, this.max_dist, 
            0, -this.max_dist*2);
    }
}

export class SpotLight {
    constructor(color, pos, at,
            inAngle, outAngle, 
            far, near=0.01) {
        this.color = color;
        this.pos = pos;
        this.at = at;
        this.inAngle = inAngle;
        this.outAngle = outAngle;
        this.far = far;
        this.near = near;
    }

    getPosVec4() {
        return vec4(
            this.pos[0],
            this.pos[1],
            this.pos[2],
            1.0
        );
    }

    getLightViewMat() {
        return lookAt(
            this.pos,
            this.at,
            vec3(0, 1, 0)
        );
    }

    getLightProjMat() {
        return perspective(
            this.outAngle * 2,
            1,
            this.near,
            this.far
        );
    }
}

export class PointLight {
    constructor(color, pos,
            far, near=0.01) {
        this.color = color;
        this.pos = pos;
        this.far = far;
        this.near = near;
    }

    getPosVec4() {
        return vec4(
            this.pos[0],
            this.pos[1],
            this.pos[2],
            1.0
        );
    }

    getLightViewMats() {
        var view_mats = [];
        for(var i=0; i<6; i++) {
            var dir = PointLight.getDirs()[i];
            var up = PointLight.getUps()[i];
            view_mats.push(lookAt(
                this.pos,
                add(this.pos, dir),
                up
            ));
        }
        return view_mats;
    }

    getLightProjMat() {
        return perspective(
            90,
            1,
            this.near,
            this.far
        );
    }

    static getDirs() {
        return [
            vec3(0, 0, 1),
            vec3(0, 0, -1),
            vec3(0, 1, 0),
            vec3(0, -1, 0),
            vec3(1, 0, 0),
            vec3(-1, 0, 0),
        ];
    }

    static getUps() {
        return [
            vec3(0, -1, 0),
            vec3(0, -1, 0),
            vec3(0, 0, 1),
            vec3(0, 0, -1),
            vec3(0, -1, 0),
            vec3(0, -1, 0),
        ]
    }

    static getTargets(gl) {
        return [
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        ];
    }
}