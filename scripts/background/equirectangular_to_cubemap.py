#!/usr/bin/python

"""Convert equirectanglar image to cubemap images."""

import optparse

# from PIL import Image

from hdr import HDR

optParser = optparse.OptionParser(usage="usage: %prog --input=image.hdr [options]")
optParser.add_option("--input", dest="input", default="image.hdr", help="specifies the input equirectangle image path")
options, args = optParser.parse_args()

hdr = HDR(options.input)
hdr.parse()
im = hdr.to_pil()
im.show()
