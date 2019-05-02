## Sphere

```
Sphere {
  SFFloat radius      1     # [0, inf)
  SFInt32 subdivision 24    # [3, 32] if 'ico' is FALSE, otherwise [1, 5]
  SFBool  ico         FALSE # {TRUE, FALSE}
}
```

The [Sphere](#sphere) node specifies a sphere centered at (0,0,0) in the local coordinate system.
The `radius` field specifies the radius of the sphere (see [this figure](#sphere-node)).

%figure "Sphere node"

![sphere.png](images/sphere.png)

%end

The `subdivision` field controls the number of faces of the rendered sphere.
If the `ico` field is TRUE, thus the sphere is rendered as an icosahedron, and the `subdivision` field is 1 (default value), then each face is subdivided into 4 faces, making 80 faces.
With a subdivision field set to 2, 320 faces will be rendered, making the sphere very smooth.
A maximum value of 5 (corresponding to 20480 faces) is allowed for this subdivision field to avoid a very long rendering process.
If the `ico` field is FALSE, then the sphere is rendered as a UV sphere and the `subdivision` value has to be in the range [3, 32].
In this case the `subdivision` field specifies the number of rings and segments in which the sphere is subdivided.
If the `subdivision` field is set to 3, then the sphere will have 3 rings and 3 segments, making 9 faces.
With a `subdivision` field set to 32, the faces are 1024.

The `ico` field specified if the sphere is rendered as an icosahedron or a UV sphere.
By default [Sphere](#sphere) nodes created in Webots are icosahedrons, whether sphere geometries imported from VRML are UV spheres with a `subdivision` value of 24.

%figure "Sphere implementations"

![sphere_implementations.png](images/sphere_implementations.png)

%end

When a texture is applied to a sphere, the texture covers the entire surface, wrapping counterclockwise from the back of the sphere.
The texture has a seam at the back where the *yz*-plane intersects the sphere.
[TextureTransform](texturetransform.md) affects the texture coordinates of the Sphere.
