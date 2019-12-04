# Webots R2020 Change Log

## [Webots R2020a](../blog/Webots-2020-a-release.md)
Released on December YYth, 2019.

  - New Robots
    - Added several TIAGo robots from PAL Robotics: [TIAGo Base](../guide/tiago-base.md), [TIAGo Iron](../guide/tiago-iron.md), [TIAGo Steel](../guide/tiago-steel.md), [TIAGo Titanium](../guide/tiago-titanium.md) and [TIAGo++](../guide/tiagopp.md).
  - New Samples
    - Added a `complete_apartment` world.
  - New Features
    - Improved the [Background](background.md) node:
      - Added the `Background.luminosity` field which specifies the light contribution of the [Background](background.md) node. Open this field in the `TexturedBackground` and the `TexturedBackgroundLight` PROTO nodes.
      - Dropped the support of the equirectangular projection in textures to improve loading time.
      - Dropped the `Cubemap` node to improve consistency.
      - Deprecated non-HDR backgrounds.
      - Restored the `Background.*Url` fields, and support only `JPEG` and `PNG` format there.
      - Introduced the `Background.*IrradianceUrl` fields to define an `HDR` irradiance map.
      - Added image tools to help with `HDR` format and equirectangular projections.
      - Added new HDR background: `entrance_hall`
    - Added several new appearances: `CorrugatedPlates`, `CorrugatedPvc`, `FormedConcrete`, and `DryMud`.
    - Replaced the [Viewpoint](viewpoint.md) `followOrientation` field by a `followType` field for more flexibility.
    - Improved the Webots online 3D viewer: `webots.min.js`
      - Improved support of the Webots rendering pipeline: supported the Bloom post-processing effect.
      - Added support for the `ImageTexture.filtering` field.
      - Improved the console log history. Added a button to clear the console.
    - Improved [robotbenchmark](https://robotbenchmark.net) worlds.
      - Improved overall graphics quality (using the PBR materials and the HDR backgrounds).
      - Improved `humanoid_sprint` benchmark metrics.
    - Added a [script to cleanup the Webots preferences](https://github.com/cyberbotics/webots/blob/master/scripts/preferences_cleaner/README.md).
    - Linux: Added support for Python 3.8.
  - Enhancements
    - Improved the [Sick LD MRS](../guide/lidar-sensors.md#sick-ld-mrs) PROTO to support the following types: `400001`, `400102`, `400001S01`, `400102S01` and `800001S01`.
    - Set the [ABB IRB 4600/40](../guide/irb4600-40.md) root node to [Robot](robot.md) instead of [Solid](solid.md) to be able to insert it everywhere.
    - Webots now waits for extern controllers if the `Robot.synchronization` field is set to `TRUE`.
    - Device names are displayed in the scene tree next to the node name.
    - Split the Webots and controller libraries to avoid possible conflicts with external libraries.
    - Windows/Linux: Move the `Check for updates...` menu from `Tools` to `Help` for consistency with other applications.
  - Bug fixes
    - Fixed [Lidar](lidar.md) point cloud access in controllers (thanks to Alexander).
    - Fixed bugs in Python Display.imageNew() when passing an image array: rearranged image data from column-major order and memory leak (thanks to Inbae Jeong).
    - Fixed [Nao.selfCollision](../guide/nao.md) due to overlapping bounding objects in feet (thanks to Sheila).
    - Fixed [infra-red DistanceSensors](distancesensor.md) or [Pen](pen.md) versus [Plane](plane.md) collision detection.
    - Fixed determinism in camera rendering order.
    - Fixed `simulation_server.py` script to work with Python3.
    - Fixed `simulation_server.py` script overwriting the DISPLAY environment variable.
    - Fixed exporting first translation and rotation fields change during animation recording and simulation streaming.
    - Fixed displaying streaming server initialization errors in the Webots console.
    - Fixed errors sending messages containing single quote (') and backslash (\) to the robot windows.
  - Dependency Updates
    - Upgraded to Qt 5.13.1 on Windows and macOS.
