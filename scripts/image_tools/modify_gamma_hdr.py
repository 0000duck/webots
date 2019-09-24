# Copyright 1996-2019 Cyberbotics Ltd.
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

"""Modify the gamma of an HDR image."""
# Look out: this scripts overrides the input image.

import optparse
import os

from images.hdr import HDR

optParser = optparse.OptionParser(usage='usage: %prog --input=image.hdr')
optParser.add_option(
    '--input', '-i', dest='input', default='image.hdr', type='string',
    help='specifies the input HDR image path'
)
optParser.add_option(
    '--gamma', '-g', dest='gamma', default=2.0, type='string',
    help='specifies the input HDR image path'
)
options, args = optParser.parse_args()

hdr_path = options.input

assert hdr_path.endswith('.hdr'), 'Invalid input extension.'
assert os.path.isfile(hdr_path), 'Input file doest not exits.'

print('Load the HDR image...')
hdr = HDR.load_from_file(hdr_path)
assert hdr.is_valid(), 'Invalid input HDR file.'

print('Create the result image...')
result = HDR.create_black_image(hdr.width, hdr.height)
for y in range(hdr.height):
    for x in range(hdr.width):
        pixel = hdr.get_pixel(x, y)
        pixel = (
            pow(pixel[0], options.gamma),
            pow(pixel[1], options.gamma),
            pow(pixel[2], options.gamma)
        )
        result.set_pixel(x, y, pixel)
    result.save(hdr_path)
