// Copyright 1996-2018 Cyberbotics Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "WbImage.hpp"

#include <cstdlib>
#include <cstring>

#define CLAMP(v, low, high) ((v) < (low) ? (low) : ((v) > (high) ? (high) : (v)))

static const float gaussBlur[3][3] = {
  // 3x3 convolution matrix to blur.
  {1.0f / 16.0f, 2.0f / 16.0f, 1.0f / 16.0f},
  {2.0f / 16.0f, 4.0f / 16.0f, 2.0f / 16.0f},
  {1.0f / 16.0f, 2.0f / 16.0f, 1.0f / 16.0f},
};

WbImage::~WbImage() {
  if (mFreeDataOnDeletion)
    free(mData);
}

WbImage *WbImage::downscale(int width, int height, int xBlurRadius, int yBlurRadius) {
  const int dstSize = width * height * mChannels;
  const int srcSize = mWidth * mHeight * mChannels;
  unsigned char *pixels = (unsigned char *)malloc(dstSize);
  memset(pixels, 0, dstSize);

  const float widthRatio = (float)mWidth / width;
  const float heightRatio = (float)mHeight / height;

  // downscale and apply the convolution matrix.
  for (int j = 0; j < height; ++j) {
    for (int i = 0; i < width; ++i) {
      for (int c = 0; c < mChannels; ++c) {
        int destIndex = (i + (j * width)) * mChannels + c;
        for (int u = -1; u < 2; ++u) {
          float x = CLAMP(widthRatio * i + u * xBlurRadius, 0, mWidth - 1);
          for (int v = -1; v < 2; ++v) {
            float y = CLAMP(heightRatio * j + v * yBlurRadius, 0, mHeight - 1);
            int srcIndex = CLAMP((int)(x + y * mWidth) * mChannels + c, 0, srcSize);
            pixels[destIndex] += (unsigned char)(gaussBlur[u + 1][v + 1] * mData[srcIndex]);
          }
        }
      }
    }
  }

  return new WbImage(pixels, width, height, mChannels, true);
}
