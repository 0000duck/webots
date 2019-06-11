#!/usr/bin/env python

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

"""Generate a list of modified files with respect to the parent branch.
This script is used only by Travis."""
import os
import subprocess
import sys

branch = os.getenv('TRAVIS_BRANCH')  # branch targeted by the pull request
if branch is None or os.getenv('TRAVIS_EVENT_TYPE') != 'pull_request':
    branch = os.getenv('APPVEYOR_REPO_BRANCH')
    if os.getenv('APPVEYOR_PULL_REQUEST_NUMBER') is None:
        branch = None

if branch is not None:
    cwd = os.getcwd()
    os.chdir(os.getenv('WEBOTS_HOME'))
    output = subprocess.check_output(['git', 'diff', '--name-only', branch]).decode('utf-8')
    f = open(os.path.join(os.getenv('WEBOTS_HOME'), 'tests', 'sources', 'modified_files.txt'), 'w')
    f.write(output)
    f.close()
    os.chdir(cwd)
else:
    sys.exit('TRAVIS_BRANCH environment variable is not set.')
