# Copyright 1996-2018 Cyberbotics Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Test textures."""
import unittest
import os
import filecmp
import fnmatch
from PIL import Image

duplicatedTextures = [
    'mybot.png',
    'soccer_quarter.jpg',
    'pingpong_logo.jpg',
    'l1.png',  # filecmp.cmp fail
    'l2.png',
    'l3.png',
    'l4.png',
    'landmark1.png',
    'landmark2.png',
    'landmark3.png',
    'landmark4.png',
    'conveyor_belt.png',
    'street_light_base_color.png',
    'light_support_roughness.jpg',
    'small_residential_tower_ground_floor_occlusion.jpg',
    'matte_car_paint_base_color.png',
    'dawn_cloudy_empty_bottom.jpg',
    'noon_stormy_empty_bottom.jpg',
    'dawn_cloudy_empty_bottom.jpg',
    'car_leather_occlusion.jpg',  # TODO: remove
    'car_leather_roughness.jpg',
    'car_leather_normal.jpg',
    'car_light_leather_base_color.jpg',
    'car_dark_leather_base_color.jpg',
    'bmw_leather_occlusion.jpg',
    'pavement.jpg',
    'picket_fence_occlusion.jpg',
    'picket_fence_metalness.jpg',
    'picket_fence_roughness.jpg',
    'small_residential_tower_balcony_base_color.jpg',
    'gas_station_store_cover_metalness.jpg',
    'small_residential_tower_ground_floor_windows_base_color.jpg',
    'residential_building_with_round_front_windows_dark_braun_base_color.jpg',
    'residential_building_with_round_front_frames_dark_braun_base_color.jpg',
    'residential_building_with_round_front_stair_dark_braun_metalness.jpg',
    'residential_building_with_round_front_stair_dark_braun_occlusion.jpg',
    'old_residential_building_roof_braun_black_base_color.jpg',
    'residential_building_with_round_front_stair_dark_braun_roughness.jpg',
    'residential_building_with_round_front_stair_green_base_color.jpg',
    'small_residential_building_windows_medium_grey_base_color.jpg',
    'small_residential_building_wall_light_grey_base_color.jpg',
    'small_residential_building_wall_light_grey_occlusion.jpg',
    'glossy_car_paint_normal.png',
    'light_sensor_metalness.png',
    'floor.png',
    'line.png'
]

duplicatedTexurePaths = [
    'projects/samples/robotbenchmark',
    'projects/objects/buildings/protos/textures/colored_textures',
    'projects/vehicles/protos/tesla/textures'  # filecmp.cmp fail
]


class TestTextures(unittest.TestCase):
    """Unit test of the textures."""

    def setUp(self):
        """Get all the textures to be tested."""
        # 1. Get all the images from projects and resources
        images = []
        for directory in ['projects', 'resources']:
            for rootPath, dirNames, fileNames in os.walk(os.environ['WEBOTS_HOME'] + os.sep + directory):
                for fileName in fnmatch.filter(fileNames, '*.png'):
                    image = os.path.join(rootPath, fileName)
                    images.append(image)
                for fileName in fnmatch.filter(fileNames, '*.jpg'):
                    image = os.path.join(rootPath, fileName)
                    images.append(image)
        # 2. filter-out the images which are not textures
        self.textures = []
        for image in images:
            if not (
                'controllers' in image or
                'icons' in image or
                'libraries' in image or
                'plugins' in image or
                'simulator-sdk' in image or
                'resources' + os.sep + 'images' in image or
                'resources' + os.sep + 'web' in image or
                'resources' + os.sep + 'wren' in image
            ):
                self.textures.append(image)

    def test_textures_dimensions_are_power_of_two(self):
        """Test that the released textures dimensions are power of two."""
        def is_perfect_power_of_two(a):
            assert isinstance(a, int)
            while a % 2 == 0:
                a = a / 2
            if a == 1:
                return True
            return False

        for texture in self.textures:
            im = Image.open(texture)
            self.assertTrue(
                is_perfect_power_of_two(im.size[0]) and is_perfect_power_of_two(im.size[1]),
                msg='texture "%s": dimension is not a power of two: (%d, %d)' % (texture, im.size[0], im.size[1])
            )

    def test_textures_profile(self):
        """Test that the released textures don't contain an ICC profile."""
        for texture in self.textures:
            im = Image.open(texture)
            self.assertTrue(
                im.info.get("icc_profile") is None,
                msg='texture "%s" contains an ICC profile' % (texture)
            )

    def test_textures_uniqueness(self):
        """Test that the released textures are unique."""
        i = 0
        toCompare = list(self.textures)  # copy
        for texture in self.textures:
            toCompare.remove(texture)
            i += 1
            print((i, len(self.textures)))
            if any(path in texture for path in duplicatedTexurePaths):
                continue
            if os.path.basename(texture) in duplicatedTextures:
                continue
            for comparedTexture in toCompare:
                if any(path in comparedTexture for path in duplicatedTexurePaths):
                    continue
                if os.path.basename(comparedTexture) in duplicatedTextures:
                    continue
                self.assertTrue(
                    filecmp.cmp(texture, comparedTexture) is False,
                    msg='texture "%s" and "%s" are equal' % (texture, comparedTexture)
                )


if __name__ == '__main__':
    unittest.main()
